const ZAPSTER_API_KEY = process.env.ZAPSTER_API_KEY;
const ZAPSTER_INSTANCE_ID = process.env.ZAPSTER_INSTANCE_ID;

export async function sendTextMessage(to: string, text: string) {
  if (!ZAPSTER_API_KEY || !ZAPSTER_INSTANCE_ID) {
    console.error('[ZAPSTER] ERRO: ZAPSTER_API_KEY ou ZAPSTER_INSTANCE_ID faltando no ambiente.');
    return null;
  }

  const url = 'https://api.zapsterapi.com/v1/wa/messages';
  console.log(`[ZAPSTER] Enviando mensagem para ${to}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAPSTER_API_KEY}`,
      },
      body: JSON.stringify({
        recipient: to,
        text: text,
        instance_id: ZAPSTER_INSTANCE_ID,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[ZAPSTER] Erro HTTP ${response.status} ao enviar para ${to}:`, JSON.stringify(result));
      return null;
    }

    console.log(`[ZAPSTER] Mensagem enviada com sucesso para ${to}.`);
    return result;
  } catch (error: any) {
    const reason = error.name === 'AbortError' ? 'timeout (8s)' : error.message;
    console.error(`[ZAPSTER] Erro de conexão ao enviar para ${to}: ${reason}`);
    return null;
  }
}
