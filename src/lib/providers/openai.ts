import OpenAI from 'openai';

export async function call(prompt: string, system: string) {
  const { OPENAI_API_KEY } = process.env;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key missing');
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
  });

  return response.choices[0].message.content;
}
