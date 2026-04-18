import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/flow-engine';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  console.log(`[WEBHOOK] Recebendo POST em: ${url.pathname}`);
  
  try {
    let payload: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }

    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(payload));

    const BOT_PHONE = (process.env.BOT_PHONE || '').replace(/\D/g, '');

    // Detectar se é mensagem enviada pelo bot (múltiplos campos possíveis do Zapster)
    const isFromMe =
      payload.data?.fromMe === true ||
      payload.fromMe === true ||
      payload.data?.from_me === true ||
      payload.from_me === true ||
      payload.type === 'outgoing' ||
      payload.data?.type === 'outgoing' ||
      payload.direction === 'outbound' ||
      payload.data?.direction === 'outbound' ||
      (payload.event_type && !String(payload.event_type).includes('receiv') && !String(payload.event_type).includes('incoming'));

    if (isFromMe) {
      console.log('[WEBHOOK] Ignorando mensagem enviada pelo próprio bot (fromMe detectado).');
      return NextResponse.json({ success: true, ignored: 'fromMe' });
    }

    const phone = (
      payload.data?.sender?.phone_number ||
      payload.sender ||
      payload.data?.sender?.id ||
      payload.from ||
      ''
    ).replace(/\D/g, '');

    const text = (
      payload.data?.content?.text ||
      payload.text ||
      payload.body ||
      payload.message ||
      ''
    );

    console.log(`[WEBHOOK] Extraído -> Fone: ${phone}, Texto: "${text}"`);

    // Ignorar se o número for o próprio bot
    if (BOT_PHONE && phone === BOT_PHONE) {
      console.log(`[WEBHOOK] Ignorando — número ${phone} é o próprio bot.`);
      return NextResponse.json({ success: true, ignored: 'bot_phone' });
    }

    if (phone && text) {
      console.log(`[WEBHOOK] Chamando handleIncomingMessage para ${phone}...`);
      await handleIncomingMessage(phone, text);
      console.log(`[WEBHOOK] handleIncomingMessage concluído para ${phone}.`);

    } else {
      console.log(`[WEBHOOK] Sem fone/texto — ignorando. (fone="${phone}", texto="${text}")`);
    }

    return NextResponse.json({ success: true, received: { phone, text } });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro Crítico:', error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge') || searchParams.get('challenge');
  
  console.log('[WEBHOOK] Recebendo GET. Challenge:', challenge);

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ 
    message: 'Webhook is running!',
    timestamp: new Date().toISOString()
  });
}
