'use client';

import { useEffect, useState } from 'react';

const STEP_LABELS: Record<string, string> = {
  START: 'Boas-vindas', START_EMAIL: 'Email', TRIAGE_WORKING: 'Situação Atual',
  TRIAGE_WISH: 'Maior Desejo', CONSELHEIRO_ATIVO: 'Conselheiro', END_CONSELHEIRO: 'Encerrado (Conselheiro)',
  END_EMPRESARIO: 'Encerrado (Empresário)', CAREER_RECOLOC_1: 'Cargo Anterior',
  CAREER_RECOLOC_2: 'Remuneração', CAREER_RECOLOC_3: 'Reserva Financeira',
  CAREER_RECOLOC_4: 'Motivo', CAREER_MUDAR_1: 'Cargo Atual', CAREER_MUDAR_2: 'Remuneração',
  CAREER_MUDAR_3: 'Motivo', CAREER_COMMON_1: 'História Pessoal', CAREER_COMMON_2: 'Comprometimento (1)',
  CAREER_COMMON_3: 'Comprometimento (2)', CAREER_COMMON_4: 'Valor do Objetivo',
  CAREER_COMMON_5: 'Comprometimento Sessão', CAREER_COMMON_6: 'Urgência',
  CAREER_COMMON_7: 'Impedimentos', CAREER_COMMON_8: 'Compromisso Final',
  END: 'Concluído', END_DESQUALIFICADO: 'Desqualificado', POST_END_WAITING: 'Aguardando',
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leads' | 'messages' | 'conversations'>('leads');
  const [messages, setMessages] = useState<any[]>([]);
  const [convs, setConvs] = useState<Record<string, any[]>>({});
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [d, m, c] = await Promise.all([
      fetch('/api/dashboard').then(r => r.json()).catch(() => ({ leads: [], stats: {} })),
      fetch('/api/messages').then(r => r.json()).catch(() => []),
      fetch('/api/conversations').then(r => r.json()).catch(() => ({})),
    ]);
    setData(d); setMessages(m); setConvs(c);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 5000); return () => clearInterval(i); }, []);

  const saveMessage = async (key: string) => {
    setSaving(true);
    const updated = messages.map(m => m.key === key ? { ...m, message: editValue } : m);
    const res = await fetch('/api/messages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { setMessages(updated); setEditingKey(null); }
    setSaving(false);
  };

  const statusColor: Record<string, string> = { Qualificado: '#22c55e', Desqualificado: '#ef4444', 'Não Qualificado': '#f59e0b', Novo: '#888' };
  const tabStyle = (t: string) => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1.25rem',
    color: tab === t ? '#a78bfa' : '#888',
    borderBottom: tab === t ? '2px solid #a78bfa' : '2px solid transparent',
    fontSize: '0.95rem', fontWeight: tab === t ? 600 : 400,
  } as React.CSSProperties);

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const getName = (phone: string) => {
    const lead = data?.leads?.find((l: any) => (l['Telefone'] || '').replace(/\D/g, '') === phone);
    return lead?.['Nome Completo'] || phone;
  };

  const phones = Object.keys(convs).sort((a, b) => {
    const lastA = convs[a].at(-1)?.timestamp || '';
    const lastB = convs[b].at(-1)?.timestamp || '';
    return lastB.localeCompare(lastA);
  });

  if (loading) return <main><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><p suppressHydrationWarning>Carregando...</p></div></main>;

  return (
    <main>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Assistente Vanusa Grando</h1>
        <p style={{ color: '#888', margin: 0 }}>Dashboard de Controle</p>
      </header>

      <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', borderBottom: '1px solid #333' }}>
        <button style={tabStyle('leads')} onClick={() => setTab('leads')}>Leads & Status</button>
        <button style={tabStyle('messages')} onClick={() => setTab('messages')}>Mensagens do Bot</button>
        <button style={tabStyle('conversations')} onClick={() => setTab('conversations')}>💬 Conversas</button>
      </div>

      {/* ── LEADS ── */}
      {tab === 'leads' && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat-item">
              <span className="stat-value">{data?.stats?.totalLeads ?? 0}</span>
              <span className="stat-label">Total de Leads</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#22c55e' }}>{data?.stats?.qualified ?? 0}</span>
              <span className="stat-label">Qualificados</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#a78bfa' }}>{data?.stats?.leadsThisWeek ?? 0}</span>
              <span className="stat-label">Novos Leads / Semana</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#22c55e' }}>{data?.stats?.qualifiedThisWeek ?? 0}</span>
              <span className="stat-label">Novos Clientes / Semana</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#f59e0b' }}>{data?.stats?.conversionRate ?? 0}%</span>
              <span className="stat-label">% Conversão Semana</span>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="card-title">Leads Recentes</h2>
            <div className="lead-list">
              {(data?.leads || []).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Nenhum lead ainda.</p>
              ) : (
                (data?.leads || []).map((lead: any) => (
                  <div key={lead.Id || lead.id} className="lead-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{lead['Nome Completo'] || '—'}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                        📱 {lead['Telefone']} &nbsp;·&nbsp; {STEP_LABELS[lead['Passo Atual']] || lead['Passo Atual'] || '—'}
                      </div>
                    </div>
                    <span className={`badge ${lead['Status'] === 'Qualificado' ? 'badge-qualified' : lead['Status'] === 'Não Qualificado' || lead['Status'] === 'Desqualificado' ? 'badge-unqualified' : 'badge-new'}`}>
                      {lead['Status'] || 'Novo'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── MENSAGENS ── */}
      {tab === 'messages' && (
        <div>
          <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Edite as mensagens enviadas pelo bot. Alterações entram em vigor imediatamente.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(msg => (
              <div key={msg.key} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <strong>{msg.name}</strong>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#666', fontFamily: 'monospace', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>{msg.key}</span>
                    <p style={{ fontSize: '0.8rem', color: '#777', margin: '0.25rem 0 0' }}>{msg.description}</p>
                  </div>
                  {editingKey !== msg.key && (
                    <button onClick={() => { setEditingKey(msg.key); setEditValue(msg.message); }}
                      style={{ background: '#a78bfa', border: 'none', color: '#fff', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Editar
                    </button>
                  )}
                </div>
                {editingKey === msg.key ? (
                  <div>
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                      style={{ width: '100%', minHeight: '120px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '6px', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button onClick={() => saveMessage(msg.key)} disabled={saving}
                        style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '6px', cursor: 'pointer' }}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingKey(null)}
                        style={{ background: '#333', border: 'none', color: '#aaa', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre style={{ background: '#111', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: '120px', overflow: 'auto' }}>
                    {msg.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONVERSAS ── */}
      {tab === 'conversations' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 220px)', border: '1px solid #222', borderRadius: '10px', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: '280px', borderRight: '1px solid #222', overflowY: 'auto', flexShrink: 0 }}>
            {phones.length === 0 && <p style={{ color: '#555', textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>Nenhuma conversa</p>}
            {phones.map(phone => {
              const last = convs[phone].at(-1);
              const lead = data?.leads?.find((l: any) => (l['Telefone'] || '').replace(/\D/g, '') === phone);
              const name = lead?.['Nome Completo'] || phone;
              const status = lead?.['Status'];
              return (
                <div key={phone} onClick={() => setSelectedConv(phone)}
                  style={{ padding: '0.85rem 1rem', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', background: selectedConv === phone ? '#1e1e2e' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{name}</strong>
                    {status && <span style={{ fontSize: '0.65rem', color: statusColor[status] || '#888' }}>● {status}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last ? (last.from === 'bot' ? '🤖 ' : '👤 ') + last.text.slice(0, 40) : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>
            {!selectedConv ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem' }}>💬</div><p>Selecione uma conversa</p></div>
              </div>
            ) : (
              <>
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #222' }}>
                  <strong>{getName(selectedConv)}</strong>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#555' }}>{selectedConv}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(convs[selectedConv] || []).map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'bot' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '65%', padding: '0.5rem 0.85rem', borderRadius: msg.from === 'bot' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: msg.from === 'bot' ? '#075e54' : '#1e1e1e', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {msg.text}
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginTop: '3px' }}>{formatTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
