import { updateLead, createLead, findClient, getLead, deleteLead } from './nocodb';
import { sendTextMessage } from './zapster';
import { askAI } from './llm-service';

const ADMIN_PHONE = process.env.ADMIN_PHONE || '551151921129';

const STEPS: Record<string, any> = {
  START: {
    message: "Olá, tudo bem? 😊\n\nEu sou *Vanusa Grando*, fundadora do Método M.C.E., e ajudo Gestores, Executivos e Conselheiros que buscam Recolocação/Transição de carreira ou MAIS ATUAÇÃO em Conselhos.\nJá ajudei mais de *9.000 profissionais* a se realizarem profissionalmente nos últimos anos com a minha metodologia. 🚀\n\nTudo bem então?! Vamos lá! Para que possamos dar o próximo passo, deixo abaixo algumas perguntas imprescindíveis para que eu possa te conhecer melhor e analisar com minha equipe se realmente faz sentido nossa parceria de sucesso e se poderei te ajudar também!\n\nContamos com a sua *sinceridade* nas respostas, pois elas podem te qualificar ou não para seguirmos para as próximas etapas em nossa possível parceria. 🤝\n\nDesta forma, mantemos as parcerias com resultados e indicadores significativos junto com os profissionais mais comprometidos!\n\n✨ Para te inspirar antes de enviar as respostas, veja algumas recomendações no meu perfil:\nhttps://www.linkedin.com/in/vanusa-grando/details/recommendations/?detailScreenTabIndex=2\n(tanto da área de carreira como de Conselheiros)\n\n👉 *Qual o seu nome?*",
    next: 'START_EMAIL'
  },
  START_EMAIL: { message: "Qual o seu email?", next: 'TRIAGE_WORKING' },
  TRIAGE_WORKING: { message: "Você está trabalhando no momento?", next: 'TRIAGE_WISH' },
  TRIAGE_WISH: {
    message: "Qual o seu maior desejo?\n\n1. Me Recolocar no Mercado\n2. Mudar de empresa\n3. Sou conselheiro e quero atuar em mais Conselhos\n4. Sou empresário e quero marcar uma reunião com conselheiros.",
    next: 'BRANCHING'
  },
  END_EMPRESARIO: { message: "Muito obrigado pelo seu interesse em nossos conselheiros, em breve entraremos em contato.", next: 'END', terminal: true },
  CONSELHEIRO_ATIVO: { message: "Você já atua em algum conselho atualmente?", next: 'END_CONSELHEIRO' },
  END_CONSELHEIRO: { message: "Ficamos felizes em poder te ajudar. Em breve entraremos em contato através de outro número.", next: 'END', terminal: true },
  CAREER_RECOLOC_1: { message: "Qual cargo você tinha na sua última posição?", next: 'CAREER_RECOLOC_2' },
  CAREER_RECOLOC_2: { message: "Você possui alguma remuneração hoje?", next: 'CAREER_RECOLOC_3' },
  CAREER_RECOLOC_3: { message: "Você possui uma reserva financeira?", next: 'CAREER_RECOLOC_4' },
  CAREER_RECOLOC_4: { message: "Me conte o que te trouxe para esta conversa. Conte os detalhes.", next: 'CAREER_COMMON_1' },
  CAREER_MUDAR_1: { message: "Qual cargo você está atuando no momento?", next: 'CAREER_MUDAR_2' },
  CAREER_MUDAR_2: { message: "Qual é a sua remuneração em média hoje?", next: 'CAREER_MUDAR_3' },
  CAREER_MUDAR_3: { message: "Me conte o que te trouxe para esta conversa. Conte os detalhes.", next: 'CAREER_COMMON_1' },
  CAREER_COMMON_1: { message: "Me conte um resumo de sua história pessoal e seu propósito profissional.", next: 'CAREER_COMMON_2' },
  CAREER_COMMON_2: { message: "De 1 a 10 o quão comprometido(a) você está em buscar uma ajuda especializada para Movimentar sua carreira Hoje?", next: 'CAREER_COMMON_3' },
  CAREER_COMMON_3: { message: "De 1 a 10 o quão comprometido(a) você está para investir tempo, dinheiro e empenho em uma parceria para a sua carreira?", next: 'CAREER_COMMON_4' },
  CAREER_COMMON_4: { message: "QUANTO VALE CHEGAR NO SEU OBJETIVO PROFISSIONAL HOJE?\n\n1. Não tem valor, é inestimável\n2. De R$ 5.700 - R$ 8.300\n3. De R$ 8.300 - R$ 12.500\n4. De R$ 12.500 - R$ 17.800\n5. De R$ 17.800 - R$ 25.100+", next: 'CAREER_COMMON_5' },
  CAREER_COMMON_5: { message: "O quão você está Comprometido(a) COM VOCÊ MESMO(a) para seguir em uma Sessão Estratégica comigo e ou minha equipe para o seu Plano de Carreira e Objetivo Profissional hoje?", next: 'CAREER_COMMON_6' },
  CAREER_COMMON_6: { message: "Qual seu nível de urgência para falar com o nosso time e fazer sua Mentoria Individual de Carreira?\n\n1. Urgente, se possível em 24 h\n2. Urgente, no máximo em 2 dias uteis\n3. Normal, pode ser em até 1 semana\n4. Pouco Urgente, só estou querendo conhecer", next: 'CAREER_COMMON_7' },
  CAREER_COMMON_7: { message: "O que pode te impedir neste momento de iniciar esta parceria de SUCESSO para transformar sua carreira profissional?", next: 'CAREER_COMMON_8' },
  CAREER_COMMON_8: { message: "PARABÉNS pelo empenho até aqui, vamos avaliar as suas respostas!\n\nVocê se compromete a estar preparado(a) e presente para a sua Sessão Estratégica no dia e horário agendado?", next: 'END' },
  END: { message: "Obrigado! Já recebemos suas informações. Analisaremos seu perfil e entraremos em contato em breve. Enquanto isso, veja nossos cases: https://vanusagrando.com/conversa/", next: 'END', terminal: true },
  POST_END_WAITING: { message: "Você gostaria de tratar de uma nova demanda ou tem uma dúvida pontual?\n\n1. Nova demanda\n2. Dúvida pontual", next: 'POST_END_WAITING', terminal: false },
};

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
    const sent = await trySendMessage(phone, STEPS.START.message);
    if (!sent) console.error(`[FLOW] Falha ao enviar START para ${phone}`);
    return;
  }

  const currentStep = lead.current_step;

  // Passo terminal (END concluído) — pergunta se é nova demanda ou dúvida
  if (STEPS[currentStep]?.terminal || currentStep === 'END') {
    await updateLead(lead.Id || lead.id, { current_step: 'POST_END_WAITING' });
    await trySendMessage(phone, STEPS.POST_END_WAITING.message);
    return;
  }

  // Aguardando resposta pós-END
  if (currentStep === 'POST_END_WAITING') {
    if (isNewDemand(text)) {
      await deleteLead(lead.Id || lead.id);
      const newLead = await createLead(phone, { current_step: 'START' });
      if (!newLead) console.error(`[FLOW] Falha ao recriar lead para ${phone}`);
      await trySendMessage(phone, STEPS.START.message);
    } else {
      await trySendMessage(phone, 'Entendido! Alguém do time da Vanusa Grando entrará em contato com você o mais breve possível. 😊');
    }
    return;
  }

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

Pergunta feita: "${STEPS[currentStep].message}"
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
    const warning = `Desculpe, fui treinada apenas para coletar os dados necessários para sua mentoria. Por favor, responda à pergunta anterior:\n\n${STEPS[currentStep].message}`;
    await trySendMessage(phone, warning);
    return;
  }

  let nextStep = STEPS[currentStep].next;
  const updates: any = { responses: { ...lead.responses, [currentStep]: result.extractedValue } };

  if (currentStep === 'TRIAGE_WISH') {
    const cat = result.detectedCategory;
    if (cat === 'empresario') nextStep = 'END_EMPRESARIO';
    else if (cat === 'conselheiro') nextStep = 'CONSELHEIRO_ATIVO';
    else if (cat === 'recolocacao') nextStep = 'CAREER_RECOLOC_1';
    else if (cat === 'mudar') nextStep = 'CAREER_MUDAR_1';
  }

  if (currentStep === 'CAREER_COMMON_4') {
    const isQualified = result.extractedValue.includes('5') || result.extractedValue.includes('25.100');
    updates.status = isQualified ? 'Qualificado' : 'Não Qualificado';
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

  const sent = await trySendMessage(phone, STEPS[nextStep].message);
  if (!sent) console.error(`[FLOW] Falha ao enviar mensagem do passo '${nextStep}' para ${phone}`);
}
