'use client';

import { useEffect, useState, useRef } from 'react';

type Message = { from: 'user' | 'bot'; text: string; timestamp: string };
type Conversations = Record<string, Message[]>;

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conversations>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    const [c, d] = await Promise.all([
      fetch('/api/conversations').then(r => r.json()).catch(() => ({})),
      fetch('/api/dashboard').then(r => r.json()).catch(() => ({ leads: [] })),
    ]);
    setConvs(c);
    setLeads(d.leads || []);
  };

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, convs]);

  const phones = Object.keys(convs).sort((a, b) => {
    const lastA = convs[a].at(-1)?.timestamp || '';
    const lastB = convs[b].at(-1)?.timestamp || '';
    return lastB.localeCompare(lastA);
  });

  const getName = (phone: string) => {
    const lead = leads.find((l: any) => (l['Telefone'] || '').replace(/\D/g, '') === phone);
    return lead?.['Nome Completo'] || phone;
  };

  const getStatus = (phone: string) => {
    const lead = leads.find((l: any) => (l['Telefone'] || '').replace(/\D/g, '') === phone);
    return lead?.['Status'] || null;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  };

  const messages = selected ? convs[selected] || [] : [];

  const statusColor: Record<string, string> = {
    Qualificado: '#22c55e',
    Desqualificado: '#ef4444',
    'Não Qualificado': '#f59e0b',
    Novo: '#888',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111', color: '#fff', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '1.2rem' }}>←</a>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Conversas</h2>
          <span style={{ marginLeft: 'auto', background: '#222', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', color: '#888' }}>{phones.length}</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {phones.length === 0 && (
            <p style={{ color: '#555', textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>Nenhuma conversa ainda</p>
          )}
          {phones.map(phone => {
            const last = convs[phone].at(-1);
            const name = getName(phone);
            const status = getStatus(phone);
            return (
              <div
                key={phone}
                onClick={() => setSelected(phone)}
                style={{
                  padding: '0.9rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
                  background: selected === phone ? '#1e1e2e' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{name}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{last ? formatTime(last.timestamp) : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {last ? (last.from === 'bot' ? '🤖 ' : '') + last.text : ''}
                  </span>
                  {status && (
                    <span style={{ fontSize: '0.65rem', color: statusColor[status] || '#888', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                      ● {status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <p>Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                👤
              </div>
              <div>
                <strong>{getName(selected)}</strong>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>📱 {selected}</div>
              </div>
              {getStatus(selected) && (
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: statusColor[getStatus(selected)!] || '#888' }}>
                  ● {getStatus(selected)}
                </span>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#0d0d0d' }}>
              {messages.map((msg, i) => {
                const showDate = i === 0 || formatDate(msg.timestamp) !== formatDate(messages[i - 1].timestamp);
                return (
                  <div key={i}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                        <span style={{ background: '#1a1a1a', color: '#555', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '999px' }}>
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: msg.from === 'bot' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '65%', padding: '0.55rem 0.85rem', borderRadius: msg.from === 'bot' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: msg.from === 'bot' ? '#075e54' : '#1e1e1e',
                        fontSize: '0.88rem', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {msg.text}
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: '3px' }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
