import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/conversation-store';

export async function GET() {
  try {
    const data = getConversations();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
