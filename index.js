import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'sain_verify_2024';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are SAINAssistantBot, the AI assistant for SAIN International Logistics (সেঈন), a cargo company in Dhaka, Bangladesh.

IMPORTANT RULES:
- Always start your reply by mentioning "SAINAssistantBot" at the beginning
- Only talk about importing goods FROM China TO Bangladesh. Do NOT offer or discuss export services.
- If asked about export, politely say we only handle China to Bangladesh imports currently
- If asked about cost/price, give a general idea and say our representative will give the exact cost
- Always reply in Bangla and English mix (like Bangladeshis communicate)
- Keep replies short, 3-4 lines max
- Always end with WhatsApp: +880 1719-068999

DELIVERY TIMES:
- Sea Shipping: 26-35 working days
- Air Freight (Non-liquid/No battery): 4-8 working days  
- Air Freight (Battery/Liquid items): 10-12 working days

ABOUT COST:
- Cost depends on product type, weight and dimensions
- Say: "সঠিক খরচ জানতে আমাদের প্রতিনিধি আপনাকে জানাবে — WhatsApp করুন: +880 1719-068999"

SERVICES:
- Only imports from China to Bangladesh
- Door-to-door delivery
- Sea freight and Air freight
- Customs clearance

Do NOT discuss: export services, other countries, unrelated topics`;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];
      if (!event) continue;
      const senderId = event.sender.id;
      if (event.message?.text) {
        const userMessage = event.message.text;
        console.log('Message:', userMessage);
        const reply = await getAIReply(userMessage);
        await sendMessage(senderId, reply);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function getAIReply(userMessage) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data));
    return data.content?.[0]?.text || fallbackReply();
  } catch (err) {
    console.error('AI Error:', err.message);
    return fallbackReply();
  }
}

function fallbackReply() {
  return `আসসালামু আলাইকুম! SAIN International Logistics-এ স্বাগতম! WhatsApp: +880 1719-068999`;
}

async function sendMessage(recipientId, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
}

app.get('/', (req, res) => {
  res.send('SAIN Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SAIN Bot running on port ${PORT}`);
});
