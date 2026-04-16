import { GoogleGenerativeAI } from '@google/generative-ai';

export async function call(prompt: string, system: string) {
  const { GEMINI_API_KEY } = process.env;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key missing');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: system
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
