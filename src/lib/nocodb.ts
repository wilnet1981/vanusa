const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_HOST = process.env.NOCODB_HOST || 'https://app.nocodb.com';
const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;

const headers = {
  'xc-token': NOCODB_API_TOKEN || '',
  'Content-Type': 'application/json',
};

async function nocoRequest(path: string, options: RequestInit = {}) {
  const url = `${NOCODB_HOST}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`NocoDB Error [${response.status}] (${path}): ${errorText}`);
    return null;
  }

  return response.json();
}

export async function findClient(phone: string) {
  const data = await nocoRequest(`Clients?where=(phone,eq,${phone})&limit=1`);
  return data?.list?.[0] || null;
}

export async function getLead(phone: string) {
  const data = await nocoRequest(`Leads?where=(phone,eq,${phone})&limit=1`);
  const lead = data?.list?.[0] || null;
  if (lead && lead.raw_data) {
    lead.responses = JSON.parse(lead.raw_data);
  } else if (lead) {
    lead.responses = {};
  }
  return lead;
}

export async function createLead(phone: string, initialData: any) {
  const body = {
    phone,
    status: 'Novo',
    current_step: 'START',
    last_message_at: new Date().toISOString(),
    raw_data: JSON.stringify({}),
    ...initialData
  };
  return nocoRequest('Leads', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateLead(id: string | number, data: any) {
  const updatePayload: any = { ...data };
  
  // Se houver responses, mapeamos para colunas específicas e salvamos o JSON bruto
  if (data.responses) {
    updatePayload.raw_data = JSON.stringify(data.responses);
    
    // Mapeamento automático para colunas no NocoDB (conforme setup-db.mjs)
    if (data.responses.START) updatePayload.name = data.responses.START;
    if (data.responses.RECOLOCACAO_CARGO) updatePayload.cargo = data.responses.RECOLOCACAO_CARGO;
    if (data.responses.RECOLOCACAO_REMUNERACAO) updatePayload.remuneracao = data.responses.RECOLOCACAO_REMUNERACAO;
    if (data.responses.RECOLOCACAO_INVESTIMENT) updatePayload.investimento = data.responses.RECOLOCACAO_INVESTIMENT;
    if (data.responses.TRIAGE_WISH) updatePayload.objetivo = data.responses.TRIAGE_WISH;
    // Adicionar outros mapeamentos conforme necessário baseado no script
  }

  updatePayload.last_message_at = new Date().toISOString();

  return nocoRequest(`Leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updatePayload),
  });
}

// AI Status / Cooldown Management
export async function getAICooldowns() {
  const data = await nocoRequest('AIStatus');
  const cooldowns: Record<string, number> = {};
  data?.list?.forEach((item: any) => {
    cooldowns[item.provider_id] = new Date(item.cooldown_until).getTime();
  });
  return cooldowns;
}

export async function setAICooldown(providerId: string, until: Date) {
  // Tenta encontrar o registro
  const existing = await nocoRequest(`AIStatus?where=(provider_id,eq,${providerId})&limit=1`);
  const record = existing?.list?.[0];

  if (record) {
    return nocoRequest(`AIStatus/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ cooldown_until: until.toISOString() }),
    });
  } else {
    return nocoRequest('AIStatus', {
      method: 'POST',
      body: JSON.stringify({ provider_id: providerId, cooldown_until: until.toISOString() }),
    });
  }
}

export async function getAllLeads() {
  const data = await nocoRequest('Leads?sort=-id');
  return data?.list || [];
}

export async function deleteLead(id: string | number) {
  return nocoRequest(`Leads/${id}`, { method: 'DELETE' });
}
