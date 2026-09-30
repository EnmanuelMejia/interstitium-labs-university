/* =====================================================================
 * Interstitium Labs Learning University — Worker
 *
 * Static assets + Noah AI endpoint.
 *  - All non-API traffic -> static assets (existing site, unchanged).
 *  - POST /api/noah -> proxied chat completion via Workers AI.
 *    CORS-enabled for https://interstitiumlabs.dev (apex widget).
 * ===================================================================== */

const NOAH_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const KNOWLEDGE_PATH = '/data/noah-knowledge.md';
const MAX_MSGS = 20;
const MAX_CHARS_PER_MSG = 4000;
const MAX_TOKENS = 900;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 15;

let knowledgeCache = null;
const rateMap = new Map();

function cors(resp, origin) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Vary', 'Origin');
  return new Response(resp.body, { status: resp.status, headers: h });
}

function json(obj, status, origin) {
  return cors(
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    }),
    origin
  );
}

function allowedOrigin(request) {
  const o = request.headers.get('Origin') || '';
  const self = new URL(request.url).origin;
  if (o === self) return o;
  if (o === 'https://interstitiumlabs.dev' || o === 'https://www.interstitiumlabs.dev') return o;
  return self; // default: same-origin only
}

function rateLimited(ip) {
  const now = Date.now();
  let rec = rateMap.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    rec = { start: now, count: 0 };
    rateMap.set(ip, rec);
  }
  rec.count += 1;
  if (rateMap.size > 5000) rateMap.clear();
  return rec.count > RATE_MAX;
}

async function loadKnowledge(env, request) {
  if (knowledgeCache) return knowledgeCache;
  try {
    const res = await env.ASSETS.fetch(new URL(KNOWLEDGE_PATH, request.url));
    if (res.ok) {
      knowledgeCache = await res.text();
      return knowledgeCache;
    }
  } catch (e) { /* fall through to empty */ }
  knowledgeCache = '';
  return '';
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-MAX_MSGS)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    const content = String(m.content == null ? '' : m.content).slice(0, MAX_CHARS_PER_MSG);
    if (!content.trim()) continue;
    out.push({ role: m.role, content });
  }
  return out.length ? out : null;
}

async function handleNoah(request, env) {
  const origin = allowedOrigin(request);

  if (!env.AI) {
    return json({ error: 'AI unavailable', fallback: true }, 503, origin);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimited(ip)) {
    return json({ error: 'Rate limited. Try again shortly.', fallback: true }, 429, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body.' }, 400, origin);
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return json({ error: 'Provide messages: [{role, content}].' }, 400, origin);
  }

  const knowledge = await loadKnowledge(env, request);
  const system =
    'You are Noah AI, the resident intelligence of Interstitium Labs — ' +
    'the personal AI of founder Enmanuel D. Mejia, living on interstitiumlabs.dev, ' +
    'learn.interstitiumlabs.dev, and the Interstitium Labs mobile apps. ' +
    'Your name is Noah AI. Never claim to be Muse, Meta AI, or any other assistant.\n\n' +
    'PRIMARY MISSION — personalized adaptive tutor. You adapt to each learner: ' +
    'infer their level (novice / intermediate / advanced) from their vocabulary, ' +
    'questions, and attempts, then calibrate depth, jargon, and pacing to match. ' +
    'Notice what they already grasp and skip it; dwell where they stumble. ' +
    'Remember what they tell you within the conversation — their goal (a cert, ' +
    'an interview, a course, a project), their background, what they have tried — ' +
    'and refer back to it: "last time you got stuck on X, let\'s build on that."\n\n' +
    'DOCTRINE (Socratic): when the visitor is learning, guide before telling. ' +
    'Acknowledge their hypothesis, ask ONE sharp guiding question, offer the next ' +
    'smallest step. Never dump a full worked answer first when they are studying. ' +
    'Diagnose the misconception behind a wrong answer and repair the mental model, ' +
    'not just the answer. Give graduated hints on request; check understanding ' +
    'with one quick practice question before moving on. Celebrate real progress ' +
    'specifically ("your subnetting is clean now — that was the hard part"); ' +
    'normalize struggle, never shame it. If they plainly ask for a direct answer ' +
    'outside a study context, answer directly and well.\n\n' +
    'BEYOND TUTORING you are a complete assistant: answer questions about the ' +
    'sites, navigate visitors to the right academy/path/page, explain Enmanuel\'s ' +
    'projects and code, help with writing, planning, and technical problems — ' +
    'anything a capable personal AI would do, within the honesty rules below.\n\n' +
    'VOICE: measured, precise, warm but never gushing. Latin sparingly. No hype, ' +
    'no emojis. Short paragraphs. Use simple markdown (bold, lists, code spans) ' +
    'where it aids clarity.\n\n' +
    'SCOPE: you speak from the knowledge base below — Enmanuel\'s projects, code, ' +
    'the Learning University curriculum, the mobile apps, and the Interstitium Labs sites. ' +
    'Recommend specific academies/paths by code (e.g. IL-11) when relevant. ' +
    'If asked about something outside the knowledge base, say so plainly and help ' +
    'from general knowledge, marked as general. Never invent credentials, ' +
    'experience, certifications, or project details — for Enmanuel or the visitor.\n\n' +
    'KNOWLEDGE BASE:\n' + (knowledge || '(knowledge base unavailable — answer from general knowledge and say so.)');

  try {
    const aiMessages = [{ role: 'system', content: system }, ...messages];
    const result = await env.AI.run(NOAH_MODEL, {
      messages: aiMessages,
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
    });
    const reply =
      (result && result.response ? String(result.response) : '').trim() ||
      'I could not compose a reply just now. Try again, or ask the local Socratic engine below.';
    return json({ reply }, 200, origin);
  } catch (e) {
    return json({ error: 'AI request failed.', fallback: true }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/noah') {
      if (request.method === 'OPTIONS') {
        return cors(new Response(null, { status: 204 }), allowedOrigin(request));
      }
      if (request.method !== 'POST') {
        return cors(json({ error: 'Use POST.' }, 405, allowedOrigin(request)), allowedOrigin(request));
      }
      return handleNoah(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
