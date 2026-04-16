import { getAICooldowns, setAICooldown } from './nocodb';

const PROVIDERS = [
  { id: 'cloudflare', name: 'Cloudflare' },
  { id: 'groq', name: 'Groq' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'deepseek', name: 'Deepseek' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
];

async function isProviderAvailable(providerId: string) {
  const cooldowns = await getAICooldowns();
  const until = cooldowns[providerId];
  if (!until) return true;
  return Date.now() > until;
}

function setProviderDown(providerId: string) {
  const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
  setAICooldown(providerId, until);
}

export async function askAI(prompt: string, system: string) {
  for (const provider of PROVIDERS) {
    if (!isProviderAvailable(provider.id)) {
      console.log(`[LLM] Pulando ${provider.name} (em cooldown)`);
      continue;
    }

    try {
      console.log(`[LLM] Tentando ${provider.name}...`);
      const response = await callProvider(provider.id, prompt, system);
      if (response) return response;
    } catch (error: any) {
      console.error(`[LLM] Erro no ${provider.name}:`, error.message);
      // Se for erro de cota/crédito (podemos filtrar por status 402 ou mensagens específicas)
      if (error.message.includes('quota') || error.message.includes('credit') || error.status === 402 || error.status === 429) {
        setProviderDown(provider.id);
        console.warn(`[LLM] ${provider.name} marcado como DOWN por 24h.`);
      }
    }
  }
  throw new Error('Todos os provedores de IA falharam.');
}

async function callProvider(id: string, prompt: string, system: string) {
  // Importação dinâmica para evitar carregar tudo de uma vez
  const { call } = await import(`./providers/${id}`);
  return await call(prompt, system);
}
