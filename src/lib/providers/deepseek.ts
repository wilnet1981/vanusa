export async function call(prompt: string, system: string) {
  const { DEEPSEEK_API_KEY } = process.env;

  if (!DEEPSEEK_API_KEY) {
    throw new Error('Deepseek API Key missing');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Deepseek API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}
