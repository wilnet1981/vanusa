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

  // Test NocoDB
  try {
    const nocoUrl = `${NOCODB_HOST}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/Leads?limit=1`;
    const nocoRes = await fetch(nocoUrl, {
      headers: { 'xc-token': NOCODB_API_TOKEN || '', 'Content-Type': 'application/json' },
    });
    const nocoBody = await nocoRes.text();
    results.nocodb = { status: nocoRes.status, url: nocoUrl, body: nocoBody.slice(0, 300) };
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
