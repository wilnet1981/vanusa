export async function call(prompt: string, system: string) {
  const { CLOUDFLARE_API_KEY, CLOUDFLARE_ACCOUNT_ID } = process.env;

  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('Cloudflare credentials missing');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cloudflare API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.result.response;
}
