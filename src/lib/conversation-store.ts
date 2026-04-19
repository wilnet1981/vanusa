import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'data/conversations.json');

export type Message = {
  from: 'user' | 'bot';
  text: string;
  timestamp: string;
};

function load(): Record<string, Message[]> {
  try {
    if (!existsSync(FILE)) return {};
    return JSON.parse(readFileSync(FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function save(data: Record<string, Message[]>) {
  try {
    writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e: any) {
    console.error('[CONV] Erro ao salvar conversa:', e.message);
  }
}

export function logMessage(phone: string, from: 'user' | 'bot', text: string) {
  const data = load();
  if (!data[phone]) data[phone] = [];
  data[phone].push({ from, text, timestamp: new Date().toISOString() });
  save(data);
}

export function getConversations(): Record<string, Message[]> {
  return load();
}

export function getConversation(phone: string): Message[] {
  return load()[phone] || [];
}
