import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'mock_db.json');

// Inicializa o banco se não existir
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ leads: [], clients: [] }, null, 2));
}

function getData() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveData(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export async function findClient(phone: string) {
  const data = getData();
  return data.clients.find((c: any) => c.phone === phone) || null;
}

export async function getLead(phone: string) {
  const data = getData();
  return data.leads.find((l: any) => l.phone === phone) || null;
}

export async function createLead(phone: string, initialData: any) {
  const data = getData();
  const newLead = { 
    id: Date.now(), 
    phone, 
    ...initialData, 
    status: 'Novo', 
    current_step: 'START',
    responses: {} 
  };
  data.leads.push(newLead);
  saveData(data);
  return newLead;
}

export async function updateLead(id: string | number, update: any) {
  const data = getData();
  const index = data.leads.findIndex((l: any) => l.id === id);
  if (index !== -1) {
    data.leads[index] = { ...data.leads[index], ...update };
    saveData(data);
    return data.leads[index];
  }
  return null;
}
