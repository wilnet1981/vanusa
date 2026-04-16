export async function call(prompt: string, system: string) {
  const { ANTHROPIC_API_KEY } = process.env;

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API Key missing');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: system,
      messages: [
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.content[0].text;
}
