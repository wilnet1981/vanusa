const ZAPSTER_API_KEY = process.env.ZAPSTER_API_KEY;
const ZAPSTER_INSTANCE_ID = process.env.ZAPSTER_INSTANCE_ID;

export async function sendTextMessage(to: string, text: string) {
  if (!ZAPSTER_API_KEY || !ZAPSTER_INSTANCE_ID) {
    console.error('[ZAPSTER] ERRO: ZAPSTER_API_KEY ou ZAPSTER_INSTANCE_ID faltando no ambiente.');
    return null;
  }

  const url = 'https://api.zapster.com.br/api/v1/messages';
  console.log(`[ZAPSTER] Enviando mensagem para ${to}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ZAPSTER_API_KEY,
      },
      body: JSON.stringify({
        recipient: to,
        text: text,
        instance_id: ZAPSTER_INSTANCE_ID,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[ZAPSTER] Erro no envio para ${to}:`, JSON.stringify(result, null, 2));
      return null;
    }

    console.log(`[ZAPSTER] Mensagem enviada com sucesso para ${to}.`);
    return result;
  } catch (error: any) {
    console.error(`[ZAPSTER] Erro de conexão ao enviar para ${to}:`, error.message);
    return null;
  }
}
