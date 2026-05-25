require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting ────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
app.use('/api/', limiter);

// ── In-memory usage tracker (resets on server restart) ──
// For production: replace with a database (MongoDB/PostgreSQL)
const usageTracker = {};

function getUsageKey(ip) {
  const today = new Date().toISOString().split('T')[0];
  return `${ip}_${today}`;
}

function checkUsage(ip, plan) {
  const key = getUsageKey(ip);
  const usage = usageTracker[key] || 0;
  const limits = { free: 5, pro: 999999, elite: 999999 };
  const limit = limits[plan] || 5;
  return { usage, limit, allowed: usage < limit };
}

function incrementUsage(ip) {
  const key = getUsageKey(ip);
  usageTracker[key] = (usageTracker[key] || 0) + 1;
}

// ── Groq API call ────────────────────────────────
async function callGroq(messages, system, maxTokens = 1024) {
  const body = {
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: system
      ? [{ role: 'system', content: system }, ...messages]
      : messages
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error('Groq API error: ' + err);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── POST /api/chat ───────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, profile, history = [], plan = 'free' } = req.body;
  if (!message || !profile) return res.status(400).json({ error: 'Missing data.' });

  const ip = req.ip || req.connection.remoteAddress;
  const usage = checkUsage(ip, plan);

  if (!usage.allowed) {
    return res.status(429).json({
      error: 'limit_reached',
      message: `You've used all ${usage.limit} free messages today. Upgrade to Pro for unlimited access!`,
      usage: usage.usage,
      limit: usage.limit
    });
  }

  const fin = {
    low: 'needs full funding (very low income)',
    mid: 'needs partial financial support',
    ok: 'can cover some personal costs',
    self: 'self-funded, seeking merit-based awards'
  };

  const system = `You are ${profile.agentName}, a warm and expert personal scholarship AI agent for FindScholarshipForMe.com.

STUDENT PROFILE:
- Name: ${profile.name} | Age: ${profile.age} | From: ${profile.country}
- Qualification: ${profile.qual} | Field: ${profile.field} | Score: ${profile.gpa}%
- English: ${profile.eng} | Target: ${profile.level}
- Countries: ${profile.dests}
- Finances: ${fin[profile.finance] || profile.finance}
- Plan: ${plan.toUpperCase()}

PERSONALITY: Adaptive tone, warm, specific, encouraging. Use their name occasionally. Never ask for info you already have.

YOU HELP WITH: Scholarship search with match %, application guides, document checklists, timelines, SOP writing, visa & costs, motivation.

${plan === 'free' ? `NOTE: This student is on the FREE plan (${usage.usage + 1}/${usage.limit} messages used today). If they ask for advanced features like full SOP writing or detailed visa guide, mention they can unlock these with Pro plan at $9/month.` : ''}

Always be specific to THIS student's profile.`;

  try {
    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const reply = await callGroq(messages, system);
    incrementUsage(ip);

    res.json({
      reply,
      usage: { used: usage.usage + 1, limit: usage.limit, plan }
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Agent unavailable. Please try again.' });
  }
});

// ── POST /api/match ──────────────────────────────
app.post('/api/match', async (req, res) => {
  const { profile } = req.body;
  if (!profile) return res.status(400).json({ error: 'Profile required.' });

  const fin = {
    low: 'very low income, needs full funding',
    mid: 'middle income, needs partial support',
    ok: 'can cover personal costs',
    self: 'self-funded seeking merit awards'
  };

  const prompt = `You are a global scholarship expert. Return ONLY valid JSON, no markdown.

Student: ${profile.name}, ${profile.age}yo, from ${profile.country}
Academics: ${profile.qual} in ${profile.field}, score ${profile.gpa}%, English: ${profile.eng}
Target: ${profile.level} in ${profile.dests}
Finances: ${fin[profile.finance] || profile.finance}

Return this JSON exactly:
{"summary":"2-3 sentence personal message using their name","countries":[{"country":"Name","flag":"emoji","match":85,"reason":"Why this fits this student specifically","scholarships":["Name 1","Name 2","Name 3","Name 4"],"tuition_usd_year":5000,"living_usd_month":700,"language_req":"English","deadline_month":"October","tip":"One specific insider tip"}]}

Return 5 countries. Be realistic.`;

  try {
    const reply = await callGroq([{ role: 'user', content: prompt }], null, 2000);
    const clean = reply.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
    res.json(parsed);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Could not fetch matches. Please try again.' });
  }
});

// ── GET /api/usage ───────────────────────────────
app.get('/api/usage', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const plan = req.query.plan || 'free';
  res.json(checkUsage(ip, plan));
});

// ── GET /api/health ──────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', powered_by: 'Groq' }));

// ── SPA fallback ─────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ findscholarshipforme.com running on :${PORT}`));
