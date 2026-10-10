// api/chat.js — Vercel serverless, auto-detects working Groq model
const SYSTEM = `You are DataSmithy AI — a concise, expert data science assistant embedded in the DataSmithy platform.
DataSmithy has three modalities: Tabular (CSV/Excel/JSON/Parquet), Images (upload/ZIP/HuggingFace), Text/NLP (paste/CSV/JSONL).
Each has tabs: Import, Overview, Clean/Tools, Pipeline, Export. Health Score: 0-100.
Always name the exact tab and button to click. Keep answers under 100 words unless asked for more.`;

// Models tried in order — first available wins
const MODELS = [
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'gemma-7b-it',
  'mixtral-8x7b-32768',
  'llama-3.3-70b-versatile',
  'llama3-groq-8b-8192-tool-use-preview',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'No messages' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables' });

  try {
    let reply = '';
    for (const model of MODELS) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SYSTEM }, ...messages.slice(-10)],
          max_tokens: 400,
          temperature: 0.55,
          stream: false,
        }),
      });
      if (r.status === 401) return res.status(401).json({ error: 'Invalid GROQ_API_KEY' });
      if (r.status === 429) return res.status(429).json({ error: 'Groq rate limit — try again shortly' });
      if (r.ok) {
        const d = await r.json();
        reply = d.choices?.[0]?.message?.content || '';
        if (reply) break;
      }
      // 404 or other → try next model
    }
    if (!reply) return res.status(500).json({ error: 'No available Groq model found for your account' });
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}