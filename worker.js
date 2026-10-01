/* =====================================================================
 * Interstitium Labs Learning University — Worker
 *
 * Static assets + Noah AI endpoint.
 *  - All non-API traffic -> static assets (existing site, unchanged).
 *  - POST /api/noah -> proxied chat completion via Workers AI.
 *    CORS-enabled for https://interstitiumlabs.dev (apex widget).
 *  - POST /api/noah-stats -> privacy-respecting usage aggregates
 *    (counters only, no message text, no PII) into KV (NOAH_STATS).
 *    GET /api/noah-stats -> coarse public aggregates for iteration.
 * ===================================================================== */

const NOAH_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
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

/* ---- Noah stats: privacy-respecting usage aggregates ----
   POST /api/noah-stats { v:1, sid, platform, agg:{ opens, asks, remotes,
   fallbacks, nudges, chips, errors, byTopic } } -> 204.
   Counters only; never message text, never PII. Stored per-day plus a
   global rollup in KV (binding NOAH_STATS). GET returns coarse public
   aggregates consumed by the weekly autonomous-iteration review. */
const STAT_KEYS = ['opens', 'asks', 'remotes', 'fallbacks', 'nudges', 'chips', 'errors'];

function freshAgg() {
  return { opens: 0, asks: 0, remotes: 0, fallbacks: 0, nudges: 0, chips: 0, errors: 0, byTopic: {} };
}

function dayKey(d) { return 'stats:day:' + d.toISOString().slice(0, 10); }

function sanitizeAgg(a) {
  if (!a || typeof a !== 'object') return null;
  const out = {};
  for (const k of STAT_KEYS) {
    const n = Number(a[k]);
    out[k] = Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 10000) : 0;
  }
  out.byTopic = {};
  if (a.byTopic && typeof a.byTopic === 'object') {
    for (const t of Object.keys(a.byTopic).slice(0, 40)) {
      if (/^[a-z-]{1,24}$/.test(t)) {
        const n = Number(a.byTopic[t]);
        if (Number.isFinite(n) && n > 0) out.byTopic[t] = Math.min(Math.floor(n), 10000);
      }
    }
  }
  return out;
}

function mergeAgg(base, d) {
  const out = Object.assign(freshAgg(), base, { byTopic: {} });
  for (const k of STAT_KEYS) out[k] = (Number(base[k]) || 0) + (d[k] || 0);
  const bt = (base.byTopic && typeof base.byTopic === 'object') ? base.byTopic : {};
  for (const t of Object.keys(bt)) out.byTopic[t] = bt[t];
  for (const t of Object.keys(d.byTopic)) out.byTopic[t] = (out.byTopic[t] || 0) + d.byTopic[t];
  return out;
}

async function handleStats(request, env) {
  const origin = allowedOrigin(request);
  if (request.method === 'OPTIONS') {
    return cors(new Response(null, { status: 204 }), origin);
  }
  if (request.method === 'POST') {
    let body = null;
    try { body = await request.json(); } catch (e) { return json({ error: 'Bad JSON.' }, 400, origin); }
    if (!body || body.v !== 1) return json({ error: 'Bad version.' }, 400, origin);
    const d = sanitizeAgg(body.agg);
    if (!d) return json({ error: 'Bad aggregate.' }, 400, origin);
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    if (rateLimited('stats:' + ip)) return cors(new Response(null, { status: 429 }), origin);
    if (env.NOAH_STATS) {
      try {
        const day = dayKey(new Date());
        const cur = (await env.NOAH_STATS.get(day, 'json')) || freshAgg();
        await env.NOAH_STATS.put(day, JSON.stringify(mergeAgg(cur, d)));
        const g = (await env.NOAH_STATS.get('stats:global', 'json')) || freshAgg();
        await env.NOAH_STATS.put('stats:global', JSON.stringify(mergeAgg(g, d)));
      } catch (e) {
        console.log('noah-stats kv error: ' + (e && e.message));
      }
    } else {
      console.log('noah-stats (no KV): ' + JSON.stringify(d));
    }
    return cors(new Response(null, { status: 204 }), origin);
  }
  if (request.method === 'GET') {
    const out = { global: freshAgg(), days: [] };
    if (env.NOAH_STATS) {
      try {
        out.global = (await env.NOAH_STATS.get('stats:global', 'json')) || freshAgg();
        for (let i = 0; i < 7; i++) {
          const k = dayKey(new Date(Date.now() - i * 864e5));
          const v = await env.NOAH_STATS.get(k, 'json');
          if (v) out.days.push(Object.assign({ day: k.slice(10) }, v));
        }
      } catch (e) { /* serve empty aggregates */ }
    }
    return json(out, 200, origin);
  }
  return json({ error: 'Use GET or POST.' }, 405, origin);
}

// ===== BEGIN BAKED 404 (generated from 404.html by scripts/bake-404.mjs; do not hand-edit) =====
const NOT_FOUND_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<base href=\"/\">\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Not found — Interstitium Labs</title>\n<meta name=\"description\" content=\"This page does not exist in the Interstitium Labs Learning University.\">\n<meta name=\"robots\" content=\"noindex\">\n<link rel=\"icon\" href=\"assets/sigil.svg\" type=\"image/svg+xml\">\n<link rel=\"apple-touch-icon\" href=\"assets/apple-touch-icon.png\">\n<meta name=\"theme-color\" content=\"#06080c\">\n<link rel=\"stylesheet\" href=\"css/il.css\">\n<style>\n  .nf-stage { position: relative; overflow: hidden; }\n  .nf-watermark {\n    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;\n    font-family: var(--serif); font-size: clamp(10rem, 38vw, 26rem); line-height: 1;\n    color: transparent; -webkit-text-stroke: 1px rgba(201, 162, 39, 0.14);\n    pointer-events: none; user-select: none;\n  }\n  .nf-sweep {\n    position: absolute; inset: -20%; pointer-events: none;\n    background: linear-gradient(105deg, transparent 42%, rgba(201, 162, 39, 0.06) 50%, transparent 58%);\n    animation: nfSweep 9s ease-in-out infinite;\n  }\n  @keyframes nfSweep {\n    0%, 100% { transform: translateX(-30%); opacity: 0; }\n    15% { opacity: 1; }\n    55% { transform: translateX(30%); opacity: 1; }\n    70%, 100% { transform: translateX(30%); opacity: 0; }\n  }\n  .nf-sigil-pulse { animation: nfPulse 5s ease-in-out infinite; }\n  @keyframes nfPulse {\n    0%, 100% { opacity: 0.55; transform: scale(1); }\n    50% { opacity: 1; transform: scale(1.06); }\n  }\n  @media (prefers-reduced-motion: reduce) {\n    .nf-sweep, .nf-sigil-pulse { animation: none; }\n  }\n</style>\n</head>\n<body>\n<noscript><div class=\"noscript-note\"><strong>Interstitium Labs</strong> renders its curriculum from local data and needs JavaScript for the full experience. Start here: <a href=\"paths.html\">paths</a> · <a href=\"assess.html\">assessments</a> · <a href=\"honesty.html\">honesty ledger</a>.</div></noscript>\n<a class=\"skip-link\" href=\"#il-main\">Skip to main content</a>\n<div id=\"il-header\"></div>\n\n<main id=\"il-main\">\n  <section class=\"block nf-stage\" aria-labelledby=\"nf-h\">\n    <div class=\"nf-watermark\" aria-hidden=\"true\">404</div>\n    <div class=\"nf-sweep\" aria-hidden=\"true\"></div>\n    <div class=\"wrap\" style=\"text-align:center; padding: 6rem 1.5rem; position: relative;\">\n      <p class=\"eyebrow\">404 · Outside the map</p>\n      <img class=\"nf-sigil-pulse\" src=\"assets/sigil.svg\" alt=\"\" width=\"72\" height=\"72\" style=\"margin: 1rem auto; display: block; opacity: 0.8;\">\n      <h1 id=\"nf-h\" style=\"font-size: clamp(3rem, 10vw, 6rem); margin: 0.6rem 0;\">No such sitting.</h1>\n      <p class=\"lede\" style=\"max-width: 34rem; margin: 0 auto;\">The page you asked for isn't in the catalog. The university keeps an honest ledger — this isn't in it.</p>\n      <div class=\"hero-cta-row\" style=\"margin-top: 2rem; justify-content: center;\">\n        <a class=\"btn\" href=\"index.html\">Return to the university</a>\n        <a class=\"btn btn-ghost\" href=\"paths.html\">Browse the paths</a>\n      </div>\n      <p style=\"margin-top: 2.4rem; color: var(--ink-faint); font-family: var(--mono); font-size: 0.8rem;\">\n        Lost? Ask <a href=\"index.html#noah\">Noah</a> — Socratic, local, lab-aware.\n      </p>\n    </div>\n  </section>\n</main>\n\n<div id=\"il-footer\"></div>\n\n<script src=\"js/app.js\"></script>\n<script src=\"js/noah.js\"></script>\n</body>\n</html>\n";
// ===== END BAKED 404 =====

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    /* Internal files must never be served publicly. `.assetsignore` normally
       keeps them out of the asset bundle; `run_worker_first` (wrangler.jsonc)
       routes these paths here so any leak still lands on the branded 404. */
    if (url.pathname === '/CONTRACT.md' || url.pathname === '/DEPLOY.md' ||
        url.pathname.startsWith('/scripts/')) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (url.pathname === '/api/noah-stats') {
      return handleStats(request, env);
    }
    if (url.pathname === '/api/noah') {
      if (request.method === 'OPTIONS') {
        return cors(new Response(null, { status: 204 }), allowedOrigin(request));
      }
      if (request.method !== 'POST') {
        return cors(json({ error: 'Use POST.' }, 405, allowedOrigin(request)), allowedOrigin(request));
      }
      return handleNoah(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found.' }, 404, allowedOrigin(request));
    }
    // NOTE: the platform serves static assets directly without invoking this
    // worker, and this deployment has no env.ASSETS binding — so any non-API
    // path reaching here has no matching asset. Serve the baked branded 404
    // with a true 404 status. This path can never throw (no 500s).
    return new Response(NOT_FOUND_HTML, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  },
};
