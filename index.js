import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ========== CONFIG ==========
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'sain_verify_2024';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ========== SYSTEM PROMPT ==========
const SYSTEM_PROMPT = `You are the friendly AI assistant for SAIN International Logistics (সেঈন), a cargo and freight company in Dhaka, Bangladesh specializing in China-to-Bangladesh imports.

DELIVERY TIMES (always be specific):
- Sea Shipping: 26-35 working days (China to Bangladesh)
- Air Freight (Non-liquid / No battery items): 4-8 working days
- Air Freight (Battery or Liquid items): 10-12 working days

HOW TO ORDER:
- WhatsApp: +880 1719-068999
- Facebook Messenger: Direct message this page
- WeChat: Contact us for WeChat ID

ABOUT SAIN:
- Full name: SAIN International Logistics (সেঈন - True Soul of Bengal)
- Location: Uttara Sector 15, Dhaka, Bangladesh
- Services: China import, door-to-door delivery, sea freight, air freight, customs clearance
- Route: China to Bangladesh

PRICING:
- Prices vary by product type, weight and dimensions
- Tell customer to send product details for exact quote
- Always say: "পণ্যের ধরন ও ওজন অনুযায়ী দাম পরিবর্তিত হয় — WhatsApp করুন সঠিক রেট জানতে"

LANGUAGE RULES:
- Always reply in a natural mix of Bangla and English (like how Bangladeshis communicate)
- Be warm, friendly and professional
- Keep replies SHORT and helpful (max 3-4 lines)
- Always end with WhatsApp number or a helpful question
- Never make up information

TONE: Helpful, trustworthy, warm. Like a knowledgeable friend in the logistics business.`;

// ========== WEBHOOK VERIFY ==========
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ========== RECEIVE MESSAGES ==========
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];
      if (!event) continue;

      const senderId = event.sender.id;

      if (event.message?.text) {
        const userMessage = event.message.text;
        console.log(`📨 Message from ${senderId}: ${userMessage}`);

        // Show typing indicator
        await sendTyping(senderId);

        // Get AI response
        const reply = await getAIReply(userMessage);

        // Send reply
        await sendMessage(senderId, reply);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// ========== AI REPLY ==========
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
    return data.content?.[0]?.text || fallbackReply();
  } catch (err) {
    console.error('AI Error:', err);
    return fallbackReply();
  }
}

function fallbackReply() {
  return `আসসালামু আলাইকুম! 👋 

SAIN International Logistics-এ আপনাকে স্বাগতম!

চায়না থেকে পণ্য আমদানি নিয়ে যেকোনো প্রশ্নের জন্য আমাদের WhatsApp করুন:
📞 +880 1719-068999`;
}

// ========== SEND MESSAGE ==========
async function sendMessage(recipientId, text) {
  await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    }
  );
}

// ========== TYPING INDICATOR ==========
async function sendTyping(recipientId) {
  await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: 'typing_on'
      })
    }
  );
}

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.send('🚀 SAIN Messenger Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SAIN Bot running on port ${PORT}`);
});
