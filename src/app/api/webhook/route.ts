import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/flow-engine';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  console.log(`[WEBHOOK] Recebendo POST em: ${url.pathname}`);
  
  try {
    // Tenta ler como JSON primeiro
    let payload: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      // Se não for JSON, tenta ler como Form Data
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }

    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(payload, null, 2));

    // Mapeamento Híbrido:
    // 1. Formato informado pelo usuário: recipient, text, instance_id
    // 2. Formato oficial da doc: data.sender.id, data.content.text
    // 3. Formato alternativo comum: from, body
    
    // Caminhos exatos confirmados pelo teste do Webhook.site
    const phone = (
      payload.data?.sender?.phone_number || 
      payload.sender || 
      payload.data?.sender?.id || 
      payload.from || 
      payload.recipient || 
      ''
    ).replace(/\D/g, '');

    const text = (
      payload.data?.content?.text || 
      payload.text || 
      payload.body || 
      payload.message || 
      ''
    );

    const instanceId = payload.instance_id || payload.data?.instance_id || payload.instanceId;

    console.log(`[WEBHOOK] Extraído -> Fone: ${phone}, Texto: ${text}, Instância: ${instanceId}`);

    if (phone && text) {
      // Evita responder mensagens do próprio bot (se a API mandar message.sent)
      const isFromMe = payload.data?.fromMe || payload.fromMe || false;
      if (!isFromMe) {
        await handleIncomingMessage(phone, text);
      } else {
        console.log('[WEBHOOK] Ignorando mensagem enviada pelo próprio bot.');
      }
    }

    return NextResponse.json({ success: true, received: { phone, text } });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro Crítico:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge') || searchParams.get('challenge');
  
  console.log('[WEBHOOK] Recebendo GET. Challenge:', challenge);

  // Se houver um desafio de validação, responde com o próprio token
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ 
    message: 'Webhook is running!',
    timestamp: new Date().toISOString()
  });
}
