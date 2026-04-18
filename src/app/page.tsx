'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leads' | 'messages'>('leads');
  const [messages, setMessages] = useState<any[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setData({ leads: [], aiStatus: {}, stats: { totalLeads: 0, qualified: 0, clients: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const json = await res.json();
      setMessages(json);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMessages();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const startEdit = (msg: any) => {
    setEditingKey(msg.key);
    setEditValue(msg.message);
    setSaveStatus('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
    setSaveStatus('');
  };

  const saveMessage = async (key: string) => {
    setSaving(true);
    const updated = messages.map(m => m.key === key ? { ...m, message: editValue } : m);
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setMessages(updated);
        setEditingKey(null);
        setSaveStatus('');
      } else {
        setSaveStatus('Erro ao salvar.');
      }
    } catch {
      setSaveStatus('Erro ao salvar.');
    }
    setSaving(false);
  };

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
      <header style={{ marginBottom: '2rem' }}>
        <h1>Assistente Vanusa Grando</h1>
        <p style={{ color: '#888' }}>Dashboard de Controle e Leads</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333' }}>
        <button
          onClick={() => setTab('leads')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1.5rem',
            color: tab === 'leads' ? 'var(--accent, #a78bfa)' : '#888',
            borderBottom: tab === 'leads' ? '2px solid var(--accent, #a78bfa)' : '2px solid transparent',
            fontSize: '1rem', fontWeight: tab === 'leads' ? 600 : 400,
          }}
        >
          Leads & Status
        </button>
        <button
          onClick={() => setTab('messages')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1.5rem',
            color: tab === 'messages' ? 'var(--accent, #a78bfa)' : '#888',
            borderBottom: tab === 'messages' ? '2px solid var(--accent, #a78bfa)' : '2px solid transparent',
            fontSize: '1rem', fontWeight: tab === 'messages' ? 600 : 400,
          }}
        >
          Mensagens do Bot
        </button>
      </div>

      {tab === 'leads' && (
        <>
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
                      <div key={lead.Id || lead.id} className="lead-item">
                        <div className="lead-header">
                          <strong style={{ fontSize: '1.1rem' }}>{lead['Nome Completo'] || lead.responses?.START || 'Lead Sem Nome'}</strong>
                          <span className={`badge ${
                            lead['Status'] === 'Qualificado' ? 'badge-qualified' :
                            lead['Status'] === 'Não Qualificado' ? 'badge-unqualified' :
                            lead['Status'] === 'Desqualificado' ? 'badge-unqualified' : 'badge-new'
                          }`}>
                            {lead['Status'] || 'Novo'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#aaa', display: 'flex', gap: '1rem' }}>
                          <span>📱 {lead['Telefone'] || lead.phone}</span>
                          <span>🔄 Passo: {lead['Passo Atual'] || lead.current_step}</span>
                        </div>
                        {lead['Objetivo Principal'] && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontStyle: 'italic', color: '#888' }}>
                            Desejo: {lead['Objetivo Principal']}
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
              </div>

              <div className="card">
                <h2 className="card-title">Webhooks</h2>
                <p style={{ fontSize: '0.85rem', color: '#888' }}>
                  Status: <span style={{ color: 'var(--success)' }}>Ativo</span>
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      {tab === 'messages' && (
        <div>
          <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Edite as mensagens enviadas pelo bot. As alterações entram em vigor imediatamente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg) => (
              <div key={msg.key} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1rem' }}>{msg.name}</strong>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#666', fontFamily: 'monospace', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>{msg.key}</span>
                    <p style={{ fontSize: '0.8rem', color: '#777', margin: '0.25rem 0 0' }}>{msg.description}</p>
                  </div>
                  {editingKey !== msg.key && (
                    <button
                      onClick={() => startEdit(msg)}
                      style={{ background: 'var(--accent, #a78bfa)', border: 'none', color: '#fff', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      Editar
                    </button>
                  )}
                </div>

                {editingKey === msg.key ? (
                  <div>
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{
                        width: '100%', minHeight: '120px', background: '#111', color: '#fff',
                        border: '1px solid #444', borderRadius: '6px', padding: '0.75rem',
                        fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => saveMessage(msg.key)}
                        disabled={saving}
                        style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ background: '#333', border: 'none', color: '#aaa', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Cancelar
                      </button>
                      {saveStatus && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{saveStatus}</span>}
                    </div>
                  </div>
                ) : (
                  <pre style={{
                    background: '#111', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem',
                    color: '#ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: '120px', overflow: 'auto',
                  }}>
                    {msg.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
