import { updateLead, createLead, findClient, getLead } from './nocodb';
import { sendTextMessage } from './zapster';
import { askAI } from './llm-service';

const ADMIN_PHONE = process.env.ADMIN_PHONE || '551151921129';

// Definição dos passos e mensagens do script original
const STEPS: Record<string, any> = {
  START: {
    message: `Olá, tudo bem? Eu sou Vanusa Grando, fundadora do Método M.C.E., e ajudo executivos e conselheiros que buscam recolocação, transição de carreira ou MAIS ATUAÇÃO. Já ajudei mais de 9.000 profissionais a se realizarem profissionalmente nos últimos anos com a minha metodologia.\n\nTudo bem então?! Vamos lá. Para que possamos dar o próximo passo, deixo abaixo algumas perguntas imprescindíveis para que eu possa te conhecer melhor e analisar com minha equipe se realmente faz sentido nossa parceria de sucesso!\n\nContamos com a sua sinceridade nas respostas, pois elas podem te qualificar ou não para seguirmos para as próximas etapas em nossa possível parceria.\n\nDesta forma, mantemos as parcerias com resultados e indicadores significativos junto com os profissionais mais comprometidos!\n\nPara te inspirar antes de enviar as respostas e realizarmos nossa sessão estratégica, vou deixar aqui alguns cases de super sucesso para você assistir, combinado?! Veja um dos nossos cases de sucesso abaixo da agenda! AQUI: https://vanusagrando.com/conversa/\n\nQual o seu nome e email?`,
    next: 'TRIAGE_WORKING'
  },
  TRIAGE_WORKING: {
    message: `Você está trabalhando no momento?`,
    next: 'TRIAGE_WISH'
  },
  TRIAGE_WISH: {
    message: `Qual o seu maior desejo?\n\n1. Me Recolocar no Mercado\n2. Mudar de empresa\n3. Sou conselheiro e quero atuar em mais Conselhos\n4. Sou empresário e quero marcar uma reunião com conselheiros.`,
    next: 'BRANCHING'
  },
  // Empresário
  END_EMPRESARIO: {
    message: `Muito obrigado pelo seu interesse em nossos conselheiros, em breve entraremos em contato.`,
    next: 'END'
  },
  // Conselheiro
  CONSELHEIRO_ATIVO: {
    message: `Você já atua em algum conselho atualmente?`,
    next: 'END_CONSELHEIRO'
  },
  END_CONSELHEIRO: {
    message: `Ficamos felizes em poder te ajudar. Em breve entraremos em contato através de outro número.`,
    next: 'END'
  },
  // Carreira - Recolocação
  CAREER_RECOLOC_1: { message: `Qual cargo você tinha na sua última posição?`, next: 'CAREER_RECOLOC_2' },
  CAREER_RECOLOC_2: { message: `Você possui alguma remuneração hoje?`, next: 'CAREER_RECOLOC_3' },
  CAREER_RECOLOC_3: { message: `Você possui uma reserva financeira?`, next: 'CAREER_RECOLOC_4' },
  CAREER_RECOLOC_4: { message: `Me conte o que te trouxe para esta conversa. Conte os detalhes.`, next: 'CAREER_COMMON_1' },
  // Carreira - Mudar
  CAREER_MUDAR_1: { message: `Qual cargo você está atuando no momento?`, next: 'CAREER_MUDAR_2' },
  CAREER_MUDAR_2: { message: `Qual é a sua remuneração em média hoje?`, next: 'CAREER_MUDAR_3' },
  CAREER_MUDAR_3: { message: `Me conte o que te trouxe para esta conversa. Conte os detalhes.`, next: 'CAREER_COMMON_1' },
  // Comum Carreira
  CAREER_COMMON_1: { message: `Me conte um resumo de sua história pessoal e seu propósito profissional.`, next: 'CAREER_COMMON_2' },
  CAREER_COMMON_2: { message: `De 1 a 10 o quão comprometido(a) você está em buscar uma ajuda especializada para Movimentar sua carreira Hoje?`, next: 'CAREER_COMMON_3' },
  CAREER_COMMON_3: { message: `De 1 a 10 o quão comprometido(a) você está para investir tempo, dinheiro e empenho em uma parceria para a sua carreira?`, next: 'CAREER_COMMON_4' },
  CAREER_COMMON_4: { message: `QUANTO VALE CHEGAR NO SEU OBJETIVO PROFISSIONAL HOJE?\n\n1. Não tem valor, é inestimável\n2. De R $ 5.700 - R $ 8.300\n3. De R $ 8.300 - R $ 12.500\n4. De R $ 12.500 - R $ 17.800\n5. De R $ 17.800 - R $ 25.100+`, next: 'CAREER_COMMON_5' },
  CAREER_COMMON_5: { message: `O quão você está Comprometido (a) COM VOCÊ MESMO (a) para seguir em uma Sessão Estratégica comigo e ou minha equipe para o seu Plano de Carreira e Objetivo Profissional hoje?`, next: 'CAREER_COMMON_6' },
  CAREER_COMMON_6: { message: `Qual seu nível de urgência para falar com o nosso time e fazer sua Mentoria Individual de Carreira?\n\n1. Urgente, se possível em 24 h\n2. Urgente, no máximo em 2 dias uteis\n3. Normal, pode ser em até 1 semana\n4. Pouco Urgente, só estou querendo conhecer`, next: 'CAREER_COMMON_7' },
  CAREER_COMMON_7: { message: `O que pode te impedir neste momento de iniciar esta parceria de SUCESSO para transformar sua carreira profissional?`, next: 'CAREER_COMMON_8' },
  CAREER_COMMON_8: { message: `PARABÉNS pelo empenho até aqui, vamos avaliar as suas respostas!\n\nVocê se compromete a estar preparado (a) e presente para a sua Sessão Estratégica no dia e horário agendado?`, next: 'END' },
  END: {
    message: `Obrigado! Já recebemos suas informações. Analisaremos seu perfil e entraremos em contato em breve. Enquanto isso, veja nossos cases: https://vanusagrando.com/conversa/`,
    next: 'END'
  }
};

export async function handleIncomingMessage(phone: string, text: string) {
  // 1. Verificar Cliente
  const client = await findClient(phone);
  if (client) {
    await sendTextMessage(phone, `Olá ${client.name}! Sou a assistente da Vanusa. Como você já é nosso aluno, por favor entre em contato pelo número de suporte: ${ADMIN_PHONE}`);
    return;
  }

  // 2. Buscar Lead
  let lead = await getLead(phone);
  if (!lead) {
    lead = await createLead(phone, { current_step: 'START' });
    await sendTextMessage(phone, STEPS.START.message);
    return;
  }

  const currentStep = lead.current_step;
  if (currentStep === 'END') {
    await sendTextMessage(phone, STEPS.END.message);
    return;
  }

  // 3. IA para processar a resposta e validar desvios
  const systemPrompt = `Você é a assistente da Vanusa Grando Mentoria. Sua função ÚNICA é coletar dados conforme o script.
REGRAS CRÍTICAS:
1. Se o usuário responder algo que NÃO tem relação com a pergunta feita (${STEPS[currentStep].message}), responda EXATAMENTE: "Desculpe, fui treinada apenas para coletar os dados necessários para sua mentoria. Por favor, responda à pergunta anterior:" e repita a pergunta.
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

  try {
    const aiResponse = await askAI(text, systemPrompt);
    const result = parseAIResult(aiResponse);

    if (!result.isValid) {
      const warning = `Desculpe, fui treinada apenas para coletar os dados necessários para sua mentoria. Por favor, responda à pergunta anterior:\n\n${STEPS[currentStep].message}`;
      await sendTextMessage(phone, warning);
      return;
    }

    // 4. Lógica de Transição
    let nextStep = STEPS[currentStep].next;
    const updates: any = { responses: { ...lead.responses, [currentStep]: result.extractedValue } };

    // Ramificação Especial (Triagem de Desejo)
    if (currentStep === 'TRIAGE_WISH') {
      if (result.detectedCategory === 'empresario') nextStep = 'END_EMPRESARIO';
      else if (result.detectedCategory === 'conselheiro') nextStep = 'CONSELHEIRO_ATIVO';
      else if (result.detectedCategory === 'recolocacao') nextStep = 'CAREER_RECOLOC_1';
      else if (result.detectedCategory === 'mudar') nextStep = 'CAREER_MUDAR_1';
    }

    // Qualificação Automática (Valor do Investimento)
    if (currentStep === 'CAREER_COMMON_4') {
      const isQualified = result.extractedValue.includes('5') || result.extractedValue.includes('25.100');
      updates.status = isQualified ? 'Qualificado' : 'Não Qualificado';
    }

    updates.current_step = nextStep;
    await updateLead(lead.id, updates);
    
    // Enviar próxima mensagem do script
    await sendTextMessage(phone, STEPS[nextStep].message);

  } catch (error) {
    console.error('Erro no processamento da IA:', error);
    await sendTextMessage(phone, "Desculpe, tivemos um problema técnico temporário. Por favor, tente novamente em alguns instantes.");
  }
}

function parseAIResult(text: string) {
  try {
    const jsonMatch = text.match(/\{.*\}/s);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return { isValid: true, extractedValue: text, detectedCategory: null };
  }
}
