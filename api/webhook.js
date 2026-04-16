export default async function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body.data;
    
    // Captura os dados da Zapster
    const phone = data?.sender?.phone_number;
    const text = data?.content?.text;

    console.log("Mensagem recebida de:", phone, "Texto:", text);

    // AQUI É ONDE VOCÊ CONFIGURA A RESPOSTA
    try {
      await fetch('https://api.zapster.com.br/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzA5ODMyMTksImlzcyI6InphcHN0ZXJhcGkiLCJzdWIiOiIwNDZkOTM4OS1kZWFmLTRhMGUtODQ1NS1iMjFiNjk4YjIyMzgiLCJqdGkiOiI3YzQwMWVmMC1mMjM2LTQ5Y2ItYjYyMy0wM2JmNDNiNWQ3MGQifQ.8aPh7_mlj8z2Cy8MZjsEwp90YmqLfktMXuJdXYZx0Ko' // <--- COLOQUE SEU TOKEN AQUI
        },
        body: JSON.stringify({
          recipient: phone,
          text: "Olá! Recebi sua mensagem: " + text,
          instance_id: "48y1k0ssgbfalx0q1bx6q" // <--- COLOQUE SEU INSTANCE_ID AQUI
        })
      });

      res.status(200).json({ success: true, phone: phone });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).send('Método não permitido');
  }
}
