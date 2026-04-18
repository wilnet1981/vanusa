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

  // Test NocoDB — listar bases disponíveis na conta (v1 e v2)
  const nocoHeaders = { 'xc-token': NOCODB_API_TOKEN || '', 'Content-Type': 'application/json' };
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${NOCODB_HOST}/api/v1/db/meta/projects/`, { headers: nocoHeaders }),
      fetch(`${NOCODB_HOST}/api/v2/meta/bases/`, { headers: nocoHeaders }),
    ]);
    const [b1, b2] = await Promise.all([r1.text(), r2.text()]);
    const j1 = JSON.parse(b1); const j2 = JSON.parse(b2);
    results.nocodb = {
      v1_status: r1.status,
      v1_bases: j1?.list?.map((b: any) => ({ id: b.id, title: b.title })) || b1.slice(0, 300),
      v2_status: r2.status,
      v2_bases: j2?.list?.map((b: any) => ({ id: b.id, title: b.title })) || b2.slice(0, 300),
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
