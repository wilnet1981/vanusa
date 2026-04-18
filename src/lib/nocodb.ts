const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_HOST = process.env.NOCODB_HOST || 'https://app.nocodb.com';
const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;

const headers = {
  'xc-token': NOCODB_API_TOKEN || '',
  'Content-Type': 'application/json',
};

async function nocoRequest(path: string, options: RequestInit = {}, retries = 3) {
  if (!NOCODB_API_TOKEN || !NOCODB_PROJECT_ID) {
    console.error(`[NOCODB] ERRO: variáveis de ambiente faltando. TOKEN=${!!NOCODB_API_TOKEN}, PROJECT_ID=${!!NOCODB_PROJECT_ID}`);
    return null;
  }

  const url = `${NOCODB_HOST}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const wait = attempt * 1500;
        console.warn(`[NOCODB] 429 rate limit (${path}), tentativa ${attempt}/${retries}, aguardando ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[NOCODB] Erro HTTP ${response.status} (${path}): ${errorText}`);
        return null;
      }

      return response.json();
    } catch (error: any) {
      const reason = error.name === 'AbortError' ? 'timeout (7s)' : error.message;
      console.error(`[NOCODB] Erro de conexão (${path}): ${reason}`);
      return null;
    }
  }

  console.error(`[NOCODB] Todas as tentativas falharam para ${path}`);
  return null;
}

const TABLE_CLIENTS = 'mzdbkpo6pf1267l';
const TABLE_LEADS = 'mt1lcy15t45k7oj';
const TABLE_AISTATUS = 'msq9m956e0wx3cx';

// Mapeamento: nomes internos do código → colunas reais do NocoDB
const COL = {
  phone: 'Telefone',
  status: 'Status',
  current_step: 'Passo Atual',
  categoria: 'Categoria',
  name: 'Nome Completo',
  cargo: 'Cargo Atual/Pretendido',
  remuneracao: 'Remuneração',
  investimento: 'Investimento Disponível',
  objetivo: 'Objetivo Principal',
  email: 'email',
  urgencia: 'Nível de Urgência',
  comprometimento: 'Comprometimento (1-10)',
  last_message_at: 'Última Mensagem',
  raw_data: 'Dados Brutos (JSON)',
};

export async function findClient(phone: string) {
  const data = await nocoRequest(`${TABLE_CLIENTS}?where=(${COL.phone},eq,${phone})&limit=1`);
  return data?.list?.[0] || null;
}

export async function getLead(phone: string) {
  const data = await nocoRequest(`${TABLE_LEADS}?where=(${COL.phone},eq,${phone})&limit=1`);
  const lead = data?.list?.[0] || null;
  if (lead && lead[COL.raw_data]) {
    try { lead.responses = JSON.parse(lead[COL.raw_data]); } catch { lead.responses = {}; }
  } else if (lead) {
    lead.responses = {};
  }
  if (lead) {
    lead.current_step = lead[COL.current_step];
  }
  return lead;
}

export async function createLead(phone: string, initialData: any) {
  const body: any = {
    [COL.phone]: phone,
    [COL.status]: 'Novo',
    [COL.current_step]: initialData.current_step || 'START',
    [COL.last_message_at]: new Date().toISOString(),
    [COL.raw_data]: JSON.stringify({}),
  };
  return nocoRequest(TABLE_LEADS, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLead(id: string | number, data: any) {
  const updatePayload: any = {};

  if (data.current_step) updatePayload[COL.current_step] = data.current_step;
  if (data.status) updatePayload[COL.status] = data.status;
  if (data.responses) {
    updatePayload[COL.raw_data] = JSON.stringify(data.responses);
    if (data.responses.START) updatePayload[COL.name] = data.responses.START;
    if (data.responses.START_EMAIL) updatePayload[COL.email] = data.responses.START_EMAIL;
    if (data.responses.CAREER_RECOLOC_1) updatePayload[COL.cargo] = data.responses.CAREER_RECOLOC_1;
    if (data.responses.CAREER_MUDAR_1) updatePayload[COL.cargo] = data.responses.CAREER_MUDAR_1;
    if (data.responses.CAREER_RECOLOC_2) updatePayload[COL.remuneracao] = data.responses.CAREER_RECOLOC_2;
    if (data.responses.CAREER_MUDAR_2) updatePayload[COL.remuneracao] = data.responses.CAREER_MUDAR_2;
    if (data.responses.CAREER_RECOLOC_3) updatePayload[COL.investimento] = data.responses.CAREER_RECOLOC_3;
    if (data.responses.TRIAGE_WISH) updatePayload[COL.objetivo] = data.responses.TRIAGE_WISH;
    if (data.responses.CAREER_COMMON_6) updatePayload[COL.urgencia] = data.responses.CAREER_COMMON_6;
  }
  updatePayload[COL.last_message_at] = new Date().toISOString();

  return nocoRequest(`${TABLE_LEADS}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updatePayload),
  });
}

export async function getAICooldowns() {
  const data = await nocoRequest(TABLE_AISTATUS);
  const cooldowns: Record<string, number> = {};
  data?.list?.forEach((item: any) => {
    cooldowns[item.provider_id] = new Date(item.cooldown_until).getTime();
  });
  return cooldowns;
}

export async function setAICooldown(providerId: string, until: Date) {
  const existing = await nocoRequest(`${TABLE_AISTATUS}?where=(provider_id,eq,${providerId})&limit=1`);
  const record = existing?.list?.[0];

  if (record) {
    return nocoRequest(`${TABLE_AISTATUS}/${record.Id || record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ cooldown_until: until.toISOString() }),
    });
  } else {
    return nocoRequest(TABLE_AISTATUS, {
      method: 'POST',
      body: JSON.stringify({ provider_id: providerId, cooldown_until: until.toISOString() }),
    });
  }
}

export async function getAllLeads() {
  const data = await nocoRequest(`${TABLE_LEADS}?sort=-Id`);
  return data?.list || [];
}

export async function deleteLead(id: string | number) {
  return nocoRequest(`${TABLE_LEADS}/${id}`, { method: 'DELETE' });
}
