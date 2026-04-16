export async function call(prompt: string, system: string) {
  const { GROQ_API_KEY } = process.env;

  if (!GROQ_API_KEY) {
    throw new Error('Groq API Key missing');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}
