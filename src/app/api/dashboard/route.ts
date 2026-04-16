import { NextResponse } from 'next/server';
import { getAllLeads, getAICooldowns } from '@/lib/nocodb';

export async function GET() {
  try {
    const leads = await getAllLeads();
    const aiStatus = await getAICooldowns();

    // Formatar leads para o dashboard
    const formattedLeads = leads.map((l: any) => {
      let responses = {};
      try {
        responses = l.raw_data ? JSON.parse(l.raw_data) : {};
      } catch (e) {
        console.error('Erro ao parsear raw_data do lead:', l.id);
      }
      return {
        ...l,
        responses
      };
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
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
