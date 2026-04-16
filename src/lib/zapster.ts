const ZAPSTER_API_KEY = process.env.ZAPSTER_API_KEY;
const ZAPSTER_INSTANCE_ID = process.env.ZAPSTER_INSTANCE_ID;
const ZAPSTER_HOST = 'https://api.zapsterapi.com/v1'; // Base URL sugerida

export async function sendTextMessage(to: string, text: string) {
  if (!ZAPSTER_API_KEY || !ZAPSTER_INSTANCE_ID) {
    console.error('[ZAPSTER] ERRO: ZAPSTER_API_KEY ou ZAPSTER_INSTANCE_ID faltando no ambiente.');
    return null;
  }

  const url = `${ZAPSTER_HOST}/instance/${ZAPSTER_INSTANCE_ID}/message/sendText`;
  console.log(`[ZAPSTER] Enviando mensagem para ${to}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAPSTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: to,      // Padrão 1
        recipient: to,   // Padrão 2 (visto no seu JSON de entrada)
        phone: to,       // Padrão 3
        text: text,      // Padrão 1
        message: text,   // Padrão 2
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
