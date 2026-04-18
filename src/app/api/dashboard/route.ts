import { NextResponse } from 'next/server';
import { getAllLeads, getAICooldowns } from '@/lib/nocodb';

export async function GET() {
  try {
    const [leads, aiStatus] = await Promise.all([
      getAllLeads().catch(() => []),
      getAICooldowns().catch(() => ({})),
    ]);

    // Formatar leads para o dashboard
    const formattedLeads = (leads || []).map((l: any) => {
      let responses = {};
      try { responses = l['Dados Brutos (JSON)'] ? JSON.parse(l['Dados Brutos (JSON)']) : {}; } catch {}
      return { ...l, responses };
    });

    return NextResponse.json({
      leads: formattedLeads,
      aiStatus,
      stats: {
        totalLeads: formattedLeads.length,
        qualified: formattedLeads.filter((l: any) => l.status === 'Qualificado').length,
        clients: 0 // Placeholder para Clientes (podemos expandir buscando na tabela Clients)
      }
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error.message);
    return NextResponse.json({ leads: [], aiStatus: {}, stats: { totalLeads: 0, qualified: 0, clients: 0 } });
  }
}
