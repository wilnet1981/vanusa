import { updateLead, createLead, findClient, getLead, deleteLead } from './nocodb';
import { sendTextMessage } from './zapster';
import { askAI } from './llm-service';
import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_PHONE = process.env.ADMIN_PHONE || '551151921129';

// Estrutura do fluxo: define navegação e flags — mensagens vêm do JSON editável
const FLOW: Record<string, { next: string; terminal?: boolean }> = {
  START:              { next: 'START_EMAIL' },
  START_EMAIL:        { next: 'TRIAGE_WORKING' },
  TRIAGE_WORKING:     { next: 'TRIAGE_WISH' },
  TRIAGE_WISH:        { next: 'BRANCHING' },
  END_EMPRESARIO:     { next: 'END', terminal: true },
  CONSELHEIRO_ATIVO:  { next: 'END_CONSELHEIRO' },
  END_CONSELHEIRO:    { next: 'END', terminal: true },
  CAREER_RECOLOC_1:   { next: 'CAREER_RECOLOC_2' },
  CAREER_RECOLOC_2:   { next: 'CAREER_RECOLOC_3' },
  CAREER_RECOLOC_3:   { next: 'CAREER_RECOLOC_4' },
  CAREER_RECOLOC_4:   { next: 'CAREER_COMMON_1' },
  CAREER_MUDAR_1:     { next: 'CAREER_MUDAR_2' },
  CAREER_MUDAR_2:     { next: 'CAREER_MUDAR_3' },
  CAREER_MUDAR_3:     { next: 'CAREER_COMMON_1' },
  CAREER_COMMON_1:    { next: 'CAREER_COMMON_2' },
  CAREER_COMMON_2:    { next: 'CAREER_COMMON_3' },
  CAREER_COMMON_3:    { next: 'CAREER_COMMON_4' },
  CAREER_COMMON_4:    { next: 'CAREER_COMMON_5' },
  CAREER_COMMON_5:    { next: 'CAREER_COMMON_6' },
  CAREER_COMMON_6:    { next: 'CAREER_COMMON_7' },
  CAREER_COMMON_7:    { next: 'CAREER_COMMON_8' },
  CAREER_COMMON_8:    { next: 'END' },
  END:                { next: 'END', terminal: true },
  END_DESQUALIFICADO: { next: 'END_DESQUALIFICADO', terminal: true },
  POST_END_WAITING:   { next: 'POST_END_WAITING' },
};

function getMessages(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), 'src/lib/messages.config.json'), 'utf-8');
    const list: { key: string; message: string }[] = JSON.parse(raw);
    return Object.fromEntries(list.map(m => [m.key, m.message]));
  } catch {
    return {};
  }
}

function getMessage(key: string): string {
  const msgs = getMessages();
  return msgs[key] || `[Mensagem não configurada: ${key}]`;
}

function getNext(key: string): string {
  return FLOW[key]?.next || 'END';
}

function isTerminal(key: string): boolean {
  return FLOW[key]?.terminal === true;
}

async function trySendMessage(phone: string, message: string, retries = 2): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    const result = await sendTextMessage(phone, message);
    if (result !== null) return true;
    console.warn(`[FLOW] Tentativa ${i + 1} de envio falhou. ${i + 1 < retries ? 'Tentando novamente...' : 'Desistindo.'}`);
  }
  return false;
}

function detectCategoryFallback(text: string): string | null {
  const t = text.toLowerCase().trim();
  if (t.includes('empresari') || t === '4') return 'empresario';
  if (t.includes('conselhei') || t === '3') return 'conselheiro';
  if (t.includes('recoloc') || t === '1') return 'recolocacao';
  if (t.includes('mudar') || t === '2') return 'mudar';
  return null;
}

function parseAIResult(text: string) {
  try {
    const jsonMatch = text.match(/\{.*\}/s);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return { isValid: true, extractedValue: text, detectedCategory: null };
  }
}

function isNewDemand(text: string): boolean {
  const t = text.toLowerCase().trim();
  return t === '1' || t.includes('nova') || t.includes('novo') || t.includes('recomeç') || t.includes('reinici');
}

export async function handleIncomingMessage(phone: string, text: string) {
  if (text.trim().toLowerCase() === '#sair') {
    const existing = await getLead(phone);
    if (existing) await deleteLead(existing.Id || existing.id);
    await trySendMessage(phone, 'Conversa encerrada e dados removidos. Digite qualquer mensagem para recomeçar do início.');
    console.log(`[FLOW] #sair executado para ${phone}`);
    return;
  }

  const client = await findClient(phone);
  if (client) {
    await trySendMessage(phone, `Olá ${client['Nome Completo'] || client.name || ''}! Sou a assistente da Vanusa. Como você já é nosso aluno, por favor entre em contato pelo número de suporte: ${ADMIN_PHONE}`);
    return;
  }

  let lead = await getLead(phone);
  if (!lead) {
    lead = await createLead(phone, { current_step: 'START' });
    if (!lead) {
      console.error(`[FLOW] createLead falhou para ${phone} — NocoDB não salvou.`);
    } else {
      console.log(`[FLOW] Lead criado para ${phone}, id=${lead.Id || lead.id}`);
    }
    const sent = await trySendMessage(phone, getMessage('START'));
    if (!sent) console.error(`[FLOW] Falha ao enviar START para ${phone}`);
    return;
  }

  const currentStep = lead.current_step;

  // Passo terminal — pergunta se é nova demanda ou dúvida
  if (isTerminal(currentStep) || currentStep === 'END') {
    await updateLead(lead.Id || lead.id, { current_step: 'POST_END_WAITING' });
    await trySendMessage(phone, getMessage('POST_END_WAITING'));
    return;
  }

  // Aguardando resposta pós-END
  if (currentStep === 'POST_END_WAITING') {
    if (isNewDemand(text)) {
      await deleteLead(lead.Id || lead.id);
      const newLead = await createLead(phone, { current_step: 'START' });
      if (!newLead) console.error(`[FLOW] Falha ao recriar lead para ${phone}`);
      await trySendMessage(phone, getMessage('START'));
    } else {
      await trySendMessage(phone, 'Entendido! Alguém do time da Vanusa Grando entrará em contato com você o mais breve possível. 😊');
    }
    return;
  }

  const currentMessage = getMessage(currentStep);

  const systemPrompt = `Você é a assistente da Vanusa Grando Mentoria. Sua função ÚNICA é coletar dados conforme o script.
REGRAS CRÍTICAS:
1. Se o usuário responder algo que NÃO tem relação com a pergunta feita, responda EXATAMENTE: "Desculpe, fui treinada apenas para coletar os dados necessários para sua mentoria. Por favor, responda à pergunta anterior:" e repita a pergunta.
2. Se o usuário responder corretamente, extraia a informação em JSON.
3. Se for uma múltipla escolha, identifique a opção escolhida.

Resposta esperada em JSON:
{
  "isValid": boolean,
  "extractedValue": string,
  "detectedCategory": "recolocacao" | "mudar" | "conselheiro" | "empresario" | null,
  "customWarning": string | null
}

Pergunta feita: "${currentMessage}"
Resposta do usuário: "${text}"`;

  let result: any;

  try {
    const aiResponse = await askAI(text, systemPrompt);
    result = parseAIResult(aiResponse);
    console.log(`[FLOW] IA processou passo '${currentStep}': isValid=${result.isValid}`);
  } catch (error: any) {
    console.error(`[FLOW] Todos os provedores de IA falharam: ${error.message}. Usando fallback.`);
    result = { isValid: true, extractedValue: text, detectedCategory: detectCategoryFallback(text), customWarning: null };
  }

  if (!result.isValid) {
    await trySendMessage(phone, `Desculpe, fui treinada apenas para coletar os dados necessários para sua mentoria. Por favor, responda à pergunta anterior:\n\n${currentMessage}`);
    return;
  }

  let nextStep = getNext(currentStep);
  const updates: any = { responses: { ...lead.responses, [currentStep]: result.extractedValue } };

  if (currentStep === 'TRIAGE_WISH') {
    const cat = result.detectedCategory;
    if (cat === 'empresario') nextStep = 'END_EMPRESARIO';
    else if (cat === 'conselheiro') nextStep = 'CONSELHEIRO_ATIVO';
    else if (cat === 'recolocacao') nextStep = 'CAREER_RECOLOC_1';
    else if (cat === 'mudar') nextStep = 'CAREER_MUDAR_1';
  }

  if (currentStep === 'CAREER_COMMON_4') {
    const isDisqualified = result.extractedValue.trim() === '1' || result.extractedValue.includes('0 a R$ 5.700') || result.extractedValue.includes('0 a 5.700');
    if (isDisqualified) {
      updates.status = 'Desqualificado';
      updates.current_step = 'END_DESQUALIFICADO';
      await updateLead(lead.Id || lead.id, updates).catch((e: any) => console.error('[FLOW] Erro ao salvar desqualificação:', e.message));
      await trySendMessage(phone, getMessage('END_DESQUALIFICADO'));
      return;
    }
    updates.status = 'Qualificado';
  }

  updates.current_step = nextStep;

  const updateResult = await updateLead(lead.Id || lead.id, updates).catch((e: any) => {
    console.error('[FLOW] Erro ao salvar lead no NocoDB:', e.message);
    return null;
  });

  if (!updateResult) {
    console.warn('[FLOW] NocoDB falhou ao salvar — abortando envio para não dessincronizar estado.');
    await trySendMessage(phone, 'Desculpe, tive um problema interno. Por favor, repita sua resposta.');
    return;
  }

  const sent = await trySendMessage(phone, getMessage(nextStep));
  if (!sent) console.error(`[FLOW] Falha ao enviar mensagem do passo '${nextStep}' para ${phone}`);
}
