import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
  const NOCODB_HOST = process.env.NOCODB_HOST || 'https://app.nocodb.com';
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const ZAPSTER_API_KEY = process.env.ZAPSTER_API_KEY;
  const ZAPSTER_INSTANCE_ID = process.env.ZAPSTER_INSTANCE_ID;

  const results: any = {
    env: {
      NOCODB_API_TOKEN: NOCODB_API_TOKEN ? `${NOCODB_API_TOKEN.slice(0, 8)}...` : 'MISSING',
      NOCODB_HOST,
      NOCODB_PROJECT_ID: NOCODB_PROJECT_ID || 'MISSING',
      ZAPSTER_API_KEY: ZAPSTER_API_KEY ? `${ZAPSTER_API_KEY.slice(0, 8)}...` : 'MISSING',
      ZAPSTER_INSTANCE_ID: ZAPSTER_INSTANCE_ID || 'MISSING',
    },
    nocodb: null,
    zapster: null,
  };

  // Test NocoDB — testar v1 e v2 endpoints
  const nocoHeaders = { 'xc-token': NOCODB_API_TOKEN || '', 'Content-Type': 'application/json' };
  try {
    // Tenta API v2 (nova)
    const v2Res = await fetch(`${NOCODB_HOST}/api/v2/meta/bases/${NOCODB_PROJECT_ID}/tables`, { headers: nocoHeaders });
    const v2Body = await v2Res.text();
    // Tenta criar lead via v2
    const createV2Res = await fetch(`${NOCODB_HOST}/api/v2/tables/mt1lcy15t45k7oj/records`, {
      method: 'POST',
      headers: nocoHeaders,
      body: JSON.stringify({ phone: 'TEST', status: 'Novo', current_step: 'START', last_message_at: new Date().toISOString(), raw_data: '{}' }),
    });
    const createV2Body = await createV2Res.text();
    results.nocodb = {
      v2_tables_status: v2Res.status, v2_tables_body: v2Body.slice(0, 200),
      v2_create_status: createV2Res.status, v2_create_body: createV2Body.slice(0, 200),
    };
  } catch (e: any) {
    results.nocodb = { error: e.message };
  }

  // Test Zapster — envia mensagem real para o próprio número admin
  const ADMIN_PHONE = process.env.ADMIN_PHONE || '551151921129';
  try {
    const zapUrl = `https://api.zapsterapi.com/v1/wa/messages`;
    const zapRes = await fetch(zapUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ZAPSTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: ADMIN_PHONE, text: 'teste de diagnóstico', instance_id: ZAPSTER_INSTANCE_ID }),
    });
    const zapBody = await zapRes.text();
    results.zapster = { status: zapRes.status, url: zapUrl, body: zapBody.slice(0, 300) };
  } catch (e: any) {
    results.zapster = { error: e.message };
  }

  return NextResponse.json(results);
}
