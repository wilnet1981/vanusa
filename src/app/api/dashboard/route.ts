import { NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/nocodb';

export async function GET() {
  try {
    const leads = await getAllLeads().catch(() => []);
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const formattedLeads = (leads || []).map((l: any) => {
      let responses = {};
      try { responses = l['Dados Brutos (JSON)'] ? JSON.parse(l['Dados Brutos (JSON)']) : {}; } catch {}
      return { ...l, responses };
    });

    const leadsThisWeek = formattedLeads.filter((l: any) => {
      const created = l['CreatedAt'] ? new Date(l['CreatedAt']).getTime() : 0;
      return created >= weekAgo;
    }).length;

    const qualifiedThisWeek = formattedLeads.filter((l: any) => {
      const created = l['CreatedAt'] ? new Date(l['CreatedAt']).getTime() : 0;
      return created >= weekAgo && l['Status'] === 'Qualificado';
    }).length;

    const conversionRate = leadsThisWeek > 0
      ? Math.round((qualifiedThisWeek / leadsThisWeek) * 100)
      : 0;

    return NextResponse.json({
      leads: formattedLeads,
      stats: {
        totalLeads: formattedLeads.length,
        qualified: formattedLeads.filter((l: any) => l['Status'] === 'Qualificado').length,
        leadsThisWeek,
        qualifiedThisWeek,
        conversionRate,
      }
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error.message);
    return NextResponse.json({ leads: [], stats: { totalLeads: 0, qualified: 0, leadsThisWeek: 0, qualifiedThisWeek: 0, conversionRate: 0 } });
  }
}
