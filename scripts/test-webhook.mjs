import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3000/api/webhook';

async function sendMockMessage(from, text) {
  console.log(`Enviando mensagem de ${from}: "${text}"`);
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'message.received',
      data: {
        from: from,
        body: text,
        isGroup: false
      }
    })
  });
  
  const data = await response.json();
  console.log('Resposta do Webhook:', data);
}

// Para testar, você deve estar com o servidor rodando (npm run dev)
// sendMockMessage('5511999999999', 'Ola');
console.log('Script de teste carregado. Use sendMockMessage no console ou descomente acima.');
