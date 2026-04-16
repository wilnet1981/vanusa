export async function call(prompt: string, system: string) {
  const { MISTRAL_API_KEY } = process.env;

  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API Key missing');
  }

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}
