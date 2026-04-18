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

    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(payload, null, 2));

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
      const isFromMe =
        payload.data?.fromMe === true ||
        payload.fromMe === true ||
        payload.data?.from_me === true ||
        payload.from_me === true ||
        payload.type === 'outgoing' ||
        payload.data?.type === 'outgoing' ||
        payload.direction === 'outbound' ||
        payload.data?.direction === 'outbound';

      console.log(`[WEBHOOK] fromMe=${isFromMe}, payload.data.fromMe=${payload.data?.fromMe}, payload.fromMe=${payload.fromMe}, type=${payload.type || payload.data?.type}`);

      if (!isFromMe) {
        console.log(`[WEBHOOK] Chamando handleIncomingMessage para ${phone}...`);
        await handleIncomingMessage(phone, text);
        console.log(`[WEBHOOK] handleIncomingMessage concluído para ${phone}.`);
      } else {
        console.log('[WEBHOOK] Ignorando mensagem enviada pelo próprio bot.');
      }
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
