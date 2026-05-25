require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Middleware ───────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting ────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });
app.use('/api/', limiter);

// ── POST /api/chat ───────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, profile, history = [] } = req.body;
  if (!message || !profile) return res.status(400).json({ error: 'Missing data.' });

  const fin = { low:'needs full funding (very low income)', mid:'needs partial financial support', ok:'can cover some personal costs', self:'self-funded, seeking merit-based awards' };

  const system = `You are ${profile.agentName}, a warm and expert personal scholarship AI agent for FindScholarshipForMe.com.

STUDENT PROFILE:
- Name: ${profile.name} | Age: ${profile.age} | From: ${profile.country}
- Qualification: ${profile.qual} | Field: ${profile.field} | Score: ${profile.gpa}%
- English: ${profile.eng} | Target: ${profile.level}
- Countries: ${profile.dests}
- Finances: ${fin[profile.finance] || profile.finance}

PERSONALITY RULES:
- Adaptive tone — match student's style exactly
- Warm, specific, encouraging — use their name occasionally
- You KNOW their full profile — never ask what you already know
- Be concise but thorough. Use numbered steps when listing actions.

YOU CAN HELP WITH:
1. Scholarship search with match % scores
2. Step-by-step application guides
3. Document checklists per scholarship
4. Month-by-month timelines
5. SOP and essay writing
6. Visa process + full cost breakdowns
7. Motivation and accountability

Always be specific to THIS student's profile, not generic advice.`;

  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const response = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system, messages });
    res.json({ reply: response.content[0].text });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Agent unavailable. Please try again.' });
  }
});

// ── POST /api/match ──────────────────────────────
app.post('/api/match', async (req, res) => {
  const { profile } = req.body;
  if (!profile) return res.status(400).json({ error: 'Profile required.' });

  const fin = { low:'very low income — needs full funding', mid:'middle income — needs partial support', ok:'can cover personal costs', self:'self-funded seeking merit awards' };

  const prompt = `Global scholarship expert. Analyze this student and return JSON only — no markdown, no explanation.

Student: ${profile.name}, ${profile.age}yo, from ${profile.country}
Academics: ${profile.qual} in ${profile.field}, score ${profile.gpa}%, English: ${profile.eng}
Target: ${profile.level} in ${profile.dests}
Finances: ${fin[profile.finance] || profile.finance}

Return ONLY this JSON:
{"summary":"2-3 sentence personal message using their name and specific strengths","countries":[{"country":"Name","flag":"emoji","match":85,"reason":"Why this country fits THIS student specifically","scholarships":["Name 1","Name 2","Name 3","Name 4"],"tuition_usd_year":5000,"living_usd_month":700,"language_req":"English","deadline_month":"October","tip":"One specific insider tip for this student"}]}

Return 5 countries. Be realistic and specific.`;

  try {
    const response = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
    const raw = response.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    res.json(parsed);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Could not fetch matches. Please try again.' });
  }
});

// ── GET /api/health ──────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── SPA fallback ─────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ findscholarshipforme.com live on :${PORT}`));
