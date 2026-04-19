import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/conversation-store';
import { getAllLeads } from '@/lib/nocodb';
import { readFileSync } from 'fs';
import { join } from 'path';

const FLOW_ORDER = [
  'START', 'START_EMAIL', 'TRIAGE_WORKING', 'TRIAGE_WISH',
  'CAREER_RECOLOC_1', 'CAREER_RECOLOC_2', 'CAREER_RECOLOC_3', 'CAREER_RECOLOC_4',
  'CAREER_MUDAR_1', 'CAREER_MUDAR_2', 'CAREER_MUDAR_3',
  'CONSELHEIRO_ATIVO',
  'CAREER_COMMON_1', 'CAREER_COMMON_2', 'CAREER_COMMON_3', 'CAREER_COMMON_4',
  'CAREER_COMMON_5', 'CAREER_COMMON_6', 'CAREER_COMMON_7', 'CAREER_COMMON_8',
  'END', 'END_DESQUALIFICADO', 'END_EMPRESARIO', 'END_CONSELHEIRO',
];

function getMessageTexts(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), 'src/lib/messages.config.json'), 'utf-8');
    const list: { key: string; message: string }[] = JSON.parse(raw);
    return Object.fromEntries(list.map(m => [m.key, m.message]));
  } catch { return {}; }
}

export async function GET() {
  try {
    const [localConvs, leads, msgs] = await Promise.all([
      Promise.resolve(getConversations()),
      getAllLeads().catch(() => []),
      Promise.resolve(getMessageTexts()),
    ]);

    const result: Record<string, any[]> = { ...localConvs };

    for (const lead of (leads || [])) {
      const phone = (lead['Telefone'] || '').replace(/\D/g, '');
      if (!phone || result[phone]) continue;

      let responses: Record<string, string> = {};
      try { responses = JSON.parse(lead['Dados Brutos (JSON)'] || '{}'); } catch {}

      const answeredSteps = FLOW_ORDER.filter(k => responses[k]);
      if (answeredSteps.length === 0) continue;

      const messages: any[] = [];
      const baseTime = new Date(lead['CreatedAt'] || Date.now()).getTime();
      let offset = 0;

      for (const key of answeredSteps) {
        if (msgs[key]) {
          messages.push({ from: 'bot', text: msgs[key], timestamp: new Date(baseTime + offset).toISOString() });
          offset += 30000;
        }
        messages.push({ from: 'user', text: responses[key], timestamp: new Date(baseTime + offset).toISOString() });
        offset += 60000;
      }

      // Add final bot message based on current step
      const currentStep = lead['Passo Atual'];
      if (currentStep && msgs[currentStep] && !answeredSteps.includes(currentStep)) {
        messages.push({ from: 'bot', text: msgs[currentStep], timestamp: new Date(baseTime + offset).toISOString() });
      }

      if (messages.length > 0) result[phone] = messages;
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({});
  }
}
