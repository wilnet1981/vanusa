import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const {
  NOCODB_API_TOKEN,
  NOCODB_HOST = 'https://app.nocodb.com',
  NOCODB_PROJECT_ID
} = process.env;

if (!NOCODB_API_TOKEN || !NOCODB_PROJECT_ID) {
  console.error('Erro: NOCODB_API_TOKEN e NOCODB_PROJECT_ID são necessários no .env.local');
  process.exit(1);
}

const headers = {
  'xc-token': NOCODB_API_TOKEN,
  'Content-Type': 'application/json'
};

async function createTable(tableName, columns) {
  console.log(`Criando tabela: ${tableName}...`);
  const url = `${NOCODB_HOST}/api/v1/db/meta/projects/${NOCODB_PROJECT_ID}/tables`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      table_name: tableName,
      title: tableName,
      columns
    })
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`Tabela ${tableName} criada com sucesso!`);
  } else {
    // Se a tabela já existir, tudo bem
    if (data.message && data.message.includes('already exists')) {
      console.log(`Tabela ${tableName} já existe.`);
    } else {
      console.error(`Erro ao criar tabela ${tableName}:`, data);
    }
  }
}

async function setup() {
  console.log('--- Iniciando Configuração do NocoDB ---');

  // 1. Tabela de Clientes
  await createTable('Clients', [
    { column_name: 'id', title: 'ID', uidt: 'ID', primary: true },
    { column_name: 'phone', title: 'Telefone', uidt: 'SingleLineText', unique: true },
    { column_name: 'name', title: 'Nome', uidt: 'SingleLineText' }
  ]);

  // 2. Tabela de Leads
  await createTable('Leads', [
    { column_name: 'id', title: 'ID', uidt: 'ID', primary: true },
    { column_name: 'phone', title: 'Telefone', uidt: 'SingleLineText', unique: true },
    { column_name: 'status', title: 'Status', uidt: 'SingleLineText' },
    { column_name: 'current_step', title: 'Passo Atual', uidt: 'SingleLineText' },
    { column_name: 'category', title: 'Categoria', uidt: 'SingleLineText' },
    
    // Campos de Qualificação
    { column_name: 'name', title: 'Nome Completo', uidt: 'SingleLineText' },
    { column_name: 'cargo', title: 'Cargo Atual/Pretendido', uidt: 'SingleLineText' },
    { column_name: 'remuneracao', title: 'Remuneração', uidt: 'SingleLineText' },
    { column_name: 'investimento', title: 'Investimento Disponível', uidt: 'SingleLineText' },
    { column_name: 'objetivo', title: 'Objetivo Principal', uidt: 'LongText' },
    { column_name: 'urgencia', title: 'Nível de Urgência', uidt: 'SingleLineText' },
    { column_name: 'comprometimento', title: 'Comprometimento (1-10)', uidt: 'SingleLineText' },
    
    // Metadados
    { column_name: 'last_message_at', title: 'Última Mensagem', uidt: 'DateTime' },
    { column_name: 'raw_data', title: 'Dados Brutos (JSON)', uidt: 'LongText' }
  ]);

  // 3. Tabela de AI Status (Failover)
  await createTable('AIStatus', [
    { column_name: 'id', title: 'ID', uidt: 'ID', primary: true },
    { column_name: 'provider_id', title: 'Provedor ID', uidt: 'SingleLineText', unique: true },
    { column_name: 'cooldown_until', title: 'Cooldown Até', uidt: 'DateTime' }
  ]);

  console.log('--- Configuração Concluída ---');
}

setup();
