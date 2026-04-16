'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <main>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <p>Carregando Dashboard da Vanusa Grando...</p>
        </div>
      </main>
    );
  }

  const providers = [
    { id: 'cloudflare', name: 'Cloudflare' },
    { id: 'groq', name: 'Groq' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'deepseek', name: 'Deepseek' },
    { id: 'gemini', name: 'Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
  ];

  return (
    <main>
      <header style={{ marginBottom: '3rem' }}>
        <h1>Assistente Vanusa Grando</h1>
        <p style={{ color: '#888' }}>Dashboard de Controle e Leads</p>
      </header>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{data.stats.totalLeads}</span>
          <span className="stat-label">Total de Leads</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{data.stats.qualified}</span>
          <span className="stat-label">Qualificados</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--accent)' }}>{data.stats.clients}</span>
          <span className="stat-label">Clientes Ativos</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section>
          <div className="card">
            <h2 className="card-title">Leads Recentes</h2>
            <div className="lead-list">
              {data.leads.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Nenhum lead capturado ainda.</p>
              ) : (
                data.leads.map((lead: any) => (
                  <div key={lead.id} className="lead-item">
                    <div className="lead-header">
                      <strong style={{ fontSize: '1.1rem' }}>{lead.responses?.START || 'Lead Sem Nome'}</strong>
                      <span className={`badge ${
                        lead.status === 'Qualificado' ? 'badge-qualified' : 
                        lead.status === 'Não Qualificado' ? 'badge-unqualified' : 'badge-new'
                      }`}>
                        {lead.status || 'Novo'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', gap: '1rem' }}>
                      <span>📱 {lead.phone}</span>
                      <span>🔄 Passo: {lead.current_step}</span>
                    </div>
                    {lead.responses?.TRIAGE_WISH && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontStyle: 'italic', color: '#888' }}>
                        Desejo: {lead.responses.TRIAGE_WISH}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside>
          <div className="card">
            <h2 className="card-title">Status das IAs (Failover)</h2>
            <div className="ai-list">
              {providers.map((p) => {
                const cooldown = data.aiStatus[p.id];
                const isDown = cooldown && (Date.now() - cooldown < 24 * 60 * 60 * 1000);
                return (
                  <div key={p.id} className="ai-item">
                    <span>{p.name}</span>
                    <span className={isDown ? 'ai-status-cooldown' : 'ai-status-active'}>
                      {isDown ? 'Cooldown (24h)' : 'Ativa'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '1rem' }}>
              * A prioridade segue a ordem acima. Se uma falhar, a próxima assume.
            </p>
          </div>

          <div className="card">
            <h2 className="card-title">Webhooks</h2>
            <p style={{ fontSize: '0.85rem', color: '#888' }}>
              Status: <span style={{ color: 'var(--success)' }}>Ativo</span>
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Envie mensagens para o WhatsApp conectado para ver as atualizações aqui.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
