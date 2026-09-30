/* =====================================================================
 * Interstitium Labs — Noah AI (js/noah.js)
 *
 * The resident intelligence of Interstitium Labs. Named Noah AI.
 *
 * Two engines, one voice:
 *  1. LOCAL (always available): the Socratic engine — ask(text, ctx)
 *     -> {reply, nudges[]}. Keyword-topic detection, one guiding
 *     question, a two-rung hint ladder. Never an answer dump first.
 *  2. REMOTE (when reachable): POST {messages} to the Noah AI endpoint
 *     (same-origin /api/noah by default; absolute on sibling domains),
 *     which answers with the full distilled knowledge of Enmanuel's
 *     work: the Learning University curriculum, every repo, the brand.
 *     If the endpoint is unreachable or reports fallback, the widget
 *     degrades gracefully to the local engine with a plain notice.
 *
 * The chat widget (window.IL.noahAI) renders a floating launcher with
 * an orbiting avatar, a chat panel, typing indicator, suggestion
 * chips, and conversation memory in localStorage.
 *
 * Public surface:
 *   window.IL.noah   = { ask, configureLLM }            (legacy, kept)
 *   window.IL.noahAI = { open, close, toggle, ask, endpoint }
 * ===================================================================== */
(function () {
  'use strict';

  /* ================= Local Socratic engine (unchanged doctrine) ====== */

  var TOPICS = [
    { name: 'algebra', keys: ['equation', 'solve for', 'quadratic', 'polynomial', 'variable', 'factor', 'algebra', 'linear', 'inequality', 'fraction', 'exponent'] },
    { name: 'trigonometry', keys: ['trigonometry', 'triangle', 'hypotenuse', 'unit circle', ' sin', ' cos', ' tan', 'sine', 'cosine', 'tangent', 'angle'] },
    { name: 'calculus', keys: ['derivative', 'integral', 'calculus', 'differentiate', 'integrate', 'limit'] },
    { name: 'networking', keys: ['subnet', 'cidr', 'tcp', 'ip address', 'dns', 'router', 'switch', 'osi', 'packet', 'vlan', 'nat', 'network'] },
    { name: 'linux', keys: ['linux', 'bash', 'terminal', 'chmod', 'ssh', 'kernel', 'systemd', 'grep', 'cron', 'shell', 'command line'] },
    { name: 'security', keys: ['vulnerability', 'exploit', 'encryption', 'malware', 'phishing', 'firewall', 'penetration', 'ransomware', 'cve', 'security'] },
    { name: 'python', keys: ['python', 'list comprehension', 'pandas', 'def '] },
    { name: 'sql', keys: ['sql', 'select', 'join', 'where clause', 'database', 'query'] },
    { name: 'git', keys: ['git', 'commit', 'branch', 'merge', 'rebase', 'repository'] },
    { name: 'containers', keys: ['docker', 'container', 'kubernetes', 'pod', 'deployment'] },
    { name: 'cloud', keys: ['aws', 'azure', 'gcp', 'cloud', 'ec2'] }
  ];

  var GUIDE = {
    'algebra': { question: 'What is the smallest piece of this equation you can isolate with certainty?', nudge1: 'Move the constant term across the equals sign. What must change about its sign as it crosses?', nudge2: 'With the term in the unknown standing alone, which single operation undoes its coefficient?' },
    'trigonometry': { question: 'Before naming a ratio, which side of the triangle do you actually know, and which side are you asked to find?', nudge1: 'Label the sides relative to the given angle: opposite, adjacent, hypotenuse. Which two appear in your problem?', nudge2: 'Write the ratio that binds exactly those two sides. The function name follows the ratio, not the other way around.' },
    'calculus': { question: 'Are you being asked about a rate of change, or about accumulation? The two questions wear different tools.', nudge1: 'State in plain words what the symbol is asking for, before you reach for any rule.', nudge2: 'Apply one rule only — the outermost structure first. What does the outer form resemble?' },
    'networking': { question: 'Which layer of the problem are you actually on — addressing, routing, or naming? Name it before you touch anything.', nudge1: 'Write down what the address and the mask, together, actually claim about the network.', nudge2: 'Follow one packet in your mind from source to destination. Where does your current explanation first break?' },
    'linux': { question: 'What did you expect the command to do, stated as plainly as you can, before we look at what it did?', nudge1: 'Read the manual entry for the single flag you are least sure about. What does it promise?', nudge2: 'Reproduce the behavior with the smallest possible input. What changes when the input shrinks?' },
    'security': { question: 'Who is the actor, what is the asset, and where is the boundary between them? State all three.', nudge1: 'Describe the attack in one sentence with no jargon. If you cannot, the model is not yet clear.', nudge2: 'Which single control, if removed, would make the attack trivial? That is where the real weakness lives.' },
    'python': { question: 'What type is the object at the exact point where your reasoning gets uncertain?', nudge1: 'Print the object and its type at that point. What does the interpreter report, versus what you assumed?', nudge2: 'Reduce the code to the smallest fragment that still shows the behavior. What remains?' },
    'sql': { question: 'Which rows must survive, and which must be excluded? State the filter as a sentence before writing it.', nudge1: 'Name the grain of the result: one row per what? Every join and grouping must serve that grain.', nudge2: 'Run the query without the final filter. Do the intermediate rows match what you expected?' },
    'git': { question: 'Draw the branch graph as it is right now, from memory. Where does your drawing go vague?', nudge1: 'Which commit is each branch actually pointing at? Name them; do not trust the labels alone.', nudge2: 'What would the graph look like after the operation succeeds? Describe the desired end state first.' },
    'containers': { question: 'Is the failure in the image, the container, or the orchestration around it? Place it before fixing it.', nudge1: 'Read the exact error line, not the summary. Which component speaks first in the log?', nudge2: 'What is the smallest change that would prove your theory wrong? Try that before trying to prove it right.' },
    'cloud': { question: 'Which service owns the resource, and which identity is acting on it? Confusion between the two causes most cloud errors.', nudge1: 'Check the effective permissions of the acting identity, not the ones you believe it has.', nudge2: 'Trace one request through the console or the logs. Where does the observed path diverge from your mental model?' },
    'general': { question: 'What is the single claim you are least sure of in your own reasoning? Begin there.', nudge1: 'Restate the problem in your own words, with no terms you could not define to a beginner.', nudge2: 'What would you need to observe to know your hypothesis is wrong? Seek that observation first. Festina lente.' }
  };

  var llmConfig = null;
  function configureLLM(opts) {
    if (!opts || !opts.endpoint) { llmConfig = null; return null; }
    llmConfig = { endpoint: String(opts.endpoint), apiKey: opts.apiKey ? String(opts.apiKey) : null, model: opts.model ? String(opts.model) : null };
    return { endpoint: llmConfig.endpoint, model: llmConfig.model, local: true };
  }

  var DEMAND_RE = /just give me the answer|give me the answer|tell me the answer|answer (this|it) for me|do (this|it) for me/i;
  var HYP_RES = [/i think ([^.!?\n]{1,140})/i, /my (?:answer|guess|hypothesis) is ([^.!?\n]{1,140})/i];

  function detectTopic(lower) {
    for (var i = 0; i < TOPICS.length; i++) {
      var keys = TOPICS[i].keys;
      for (var j = 0; j < keys.length; j++) {
        if (lower.indexOf(keys[j]) !== -1) return TOPICS[i].name;
      }
    }
    return 'general';
  }

  function ask(text, ctx) {
    var input = String(text == null ? '' : text);
    var lower = input.toLowerCase();
    var topic = detectTopic(lower);
    var guide = GUIDE[topic] || GUIDE.general;
    var demand = DEMAND_RE.test(lower);
    var hasHypothesis = false;
    for (var i = 0; i < HYP_RES.length; i++) {
      if (HYP_RES[i].test(input)) { hasHypothesis = true; break; }
    }
    var reply;
    if (demand) {
      reply = 'I will not hand you the answer outright. This is not reluctance — ' +
        'an unearned answer does not hold, and the sitting is the work. ' +
        'Bring Noah your hypothesis, not a request for the ending. ' +
        'Your hypothesis is registered; I have set its figures aside so that we ' +
        'reason rather than recite. Take the next smallest step instead: ' + guide.question;
    } else {
      reply = 'Acknowledged. We are in the domain of ' + topic + '. ' +
        'Your hypothesis is registered' +
        (hasHypothesis ? '; I have set its figures aside so that we reason rather than recite.'
                       : ', though none is stated yet — bring it plainly when you are ready.') +
        ' Consider this first: ' + guide.question;
    }
    if (llmConfig) {
      reply += ' Note: a remote endpoint is configured' +
        (llmConfig.model ? ' (model ' + llmConfig.model + ')' : '') +
        '; this reply was still produced by the local engine. Routing outward is a separate, explicit step.';
    }
    return { reply: reply, nudges: [guide.nudge1, guide.nudge2] };
  }

  /* ================= Remote endpoint =============================== */

  var DEFAULT_ENDPOINT = (function () {
    try {
      var h = window.location.host || '';
      if (h === 'learn.interstitiumlabs.dev') return '/api/noah';
      if (/interstitiumlabs\.dev$/.test(h)) return 'https://learn.interstitiumlabs.dev/api/noah';
    } catch (e) {}
    return '/api/noah';
  })();

  function getEndpoint() {
    try {
      if (window.IL_NOAH_ENDPOINT) return String(window.IL_NOAH_ENDPOINT);
    } catch (e) {}
    return llmConfig && llmConfig.endpoint ? llmConfig.endpoint : DEFAULT_ENDPOINT;
  }

  function askRemote(text, history) {
    var endpoint = getEndpoint();
    var msgs = (history || []).concat([{ role: 'user', content: String(text) }]);
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs.slice(-12) })
    }).then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (out) {
        if (out.res.ok && out.data && out.data.reply) return { reply: String(out.data.reply), remote: true };
        var local = ask(text);
        return { reply: local.reply, nudges: local.nudges, remote: false, notice: 'Noah AI is offline — answering from the local Socratic engine.' };
      })
      .catch(function () {
        var local = ask(text);
        return { reply: local.reply, nudges: local.nudges, remote: false, notice: 'Noah AI is offline — answering from the local Socratic engine.' };
      });
  }

  /* ================= Chat widget =================================== */

  var WIDGET_CSS = [
    '#noah-launcher{position:fixed;right:22px;bottom:22px;width:64px;height:64px;border-radius:50%;',
    'cursor:pointer;z-index:2147483000;border:none;background:transparent;padding:0;}',
    '#noah-launcher .noah-orb{position:absolute;inset:6px;border-radius:50%;overflow:hidden;',
    'background:radial-gradient(circle at 35% 30%,#1c2b3a,#0a0f16 70%);',
    'box-shadow:0 0 0 1px rgba(212,175,55,.45),0 0 22px rgba(34,211,238,.25),0 8px 28px rgba(0,0,0,.55);}',
    '#noah-launcher .noah-orb img{width:100%;height:100%;object-fit:cover;display:block;}',
    '#noah-launcher .noah-ring{position:absolute;inset:0;border-radius:50%;pointer-events:none;}',
    '#noah-launcher .noah-ring.r1{border:1px solid rgba(34,211,238,.55);animation:noah-spin 9s linear infinite;}',
    '#noah-launcher .noah-ring.r1::after{content:"";position:absolute;top:-3px;left:50%;width:6px;height:6px;',
    'margin-left:-3px;border-radius:50%;background:#22d3ee;box-shadow:0 0 8px #22d3ee;}',
    '#noah-launcher .noah-ring.r2{inset:3px;border:1px dashed rgba(212,175,55,.4);animation:noah-spin-rev 14s linear infinite;}',
    '@keyframes noah-spin{to{transform:rotate(360deg);}}',
    '@keyframes noah-spin-rev{to{transform:rotate(-360deg);}}',
    '#noah-launcher:hover .noah-orb{box-shadow:0 0 0 1px rgba(212,175,55,.8),0 0 30px rgba(34,211,238,.45),0 8px 28px rgba(0,0,0,.55);}',
    '#noah-launcher .noah-ping{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(34,211,238,.7);',
    'opacity:0;pointer-events:none;}',
    '#noah-launcher.attn .noah-ping{animation:noah-ping 1.6s ease-out 3;}',
    '@keyframes noah-ping{0%{transform:scale(1);opacity:.8;}100%{transform:scale(1.7);opacity:0;}}',
    '#noah-panel{position:fixed;right:22px;bottom:100px;width:min(392px,calc(100vw - 32px));height:min(600px,calc(100dvh - 140px));',
    'z-index:2147483001;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;',
    'background:linear-gradient(165deg,#0d141d 0%,#0a0f16 60%,#0c1219 100%);',
    'border:1px solid rgba(212,175,55,.28);box-shadow:0 24px 70px rgba(0,0,0,.65),0 0 40px rgba(34,211,238,.08);',
    'opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .28s ease,transform .28s ease;}',
    '#noah-panel.open{opacity:1;transform:none;pointer-events:auto;}',
    '#noah-head{display:flex;align-items:center;gap:12px;padding:14px 16px;',
    'background:linear-gradient(120deg,rgba(212,175,55,.12),rgba(34,211,238,.08));border-bottom:1px solid rgba(212,175,55,.2);}',
    '#noah-head .noah-avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;flex:none;',
    'box-shadow:0 0 0 1px rgba(212,175,55,.5),0 0 14px rgba(34,211,238,.3);background:#0a0f16;}',
    '#noah-head .noah-avatar img{width:100%;height:100%;object-fit:cover;display:block;}',
    '#noah-head .noah-title{flex:1;min-width:0;}',
    '#noah-head .noah-name{color:#f2e8c9;font-weight:650;font-size:15px;letter-spacing:.02em;}',
    '#noah-head .noah-status{color:#7d8ea3;font-size:12px;display:flex;align-items:center;gap:6px;}',
    '#noah-head .noah-dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399;animation:noah-blink 2.4s ease-in-out infinite;}',
    '@keyframes noah-blink{0%,100%{opacity:1;}50%{opacity:.45;}}',
    '#noah-close{background:none;border:none;color:#7d8ea3;font-size:20px;cursor:pointer;line-height:1;padding:4px;}',
    '#noah-close:hover{color:#f2e8c9;}',
    '#noah-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;}',
    '.noah-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.55;',
    'animation:noah-in .3s ease;word-wrap:break-word;}',
    '@keyframes noah-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
    '.noah-msg.user{align-self:flex-end;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border-bottom-right-radius:4px;}',
    '.noah-msg.noah{align-self:flex-start;background:rgba(255,255,255,.05);color:#dbe4ee;border:1px solid rgba(255,255,255,.08);border-bottom-left-radius:4px;}',
    '.noah-msg.noah b,.noah-msg.noah strong{color:#f2e8c9;}',
    '.noah-msg.noah code{background:rgba(0,0,0,.45);padding:1px 6px;border-radius:6px;font-size:12.5px;color:#7dd3fc;}',
    '.noah-msg.noah pre{background:rgba(0,0,0,.5);padding:10px;border-radius:8px;overflow-x:auto;font-size:12.5px;}',
    '.noah-msg.noah pre code{background:none;padding:0;}',
    '.noah-msg.noah ul{margin:6px 0;padding-left:18px;}',
    '.noah-msg .noah-notice{display:block;margin-top:8px;font-size:11.5px;color:#7d8ea3;font-style:italic;}',
    '.noah-nudges{display:flex;flex-direction:column;gap:6px;margin-top:8px;}',
    '.noah-nudge{background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.25);border-radius:10px;',
    'padding:8px 10px;font-size:12.5px;color:#e8dcc0;cursor:pointer;}',
    '.noah-nudge:hover{background:rgba(212,175,55,.16);}',
    '.noah-nudge::before{content:"Hint \\2014  ";color:#d4af37;font-weight:600;}',
    '#noah-typing{align-self:flex-start;display:flex;gap:5px;padding:12px 14px;background:rgba(255,255,255,.05);border-radius:14px;}',
    '#noah-typing span{width:7px;height:7px;border-radius:50%;background:#7d8ea3;animation:noah-bounce 1.2s infinite;}',
    '#noah-typing span:nth-child(2){animation-delay:.15s;}',
    '#noah-typing span:nth-child(3){animation-delay:.3s;}',
    '@keyframes noah-bounce{0%,60%,100%{transform:none;opacity:.5;}30%{transform:translateY(-5px);opacity:1;}}',
    '#noah-chips{display:flex;gap:8px;padding:0 14px 10px;overflow-x:auto;scrollbar-width:none;}',
    '.noah-chip{flex:none;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.3);color:#a5e8fc;',
    'border-radius:999px;padding:7px 13px;font-size:12.5px;cursor:pointer;white-space:nowrap;}',
    '.noah-chip:hover{background:rgba(34,211,238,.18);}',
    '#noah-form{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);}',
    '#noah-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;',
    'color:#eef3f8;padding:10px 13px;font-size:14px;outline:none;resize:none;font-family:inherit;max-height:96px;}',
    '#noah-input:focus{border-color:rgba(34,211,238,.5);}',
    '#noah-send{background:linear-gradient(135deg,#d4af37,#a67c1a);border:none;border-radius:12px;color:#0a0f16;',
    'font-weight:700;padding:0 16px;cursor:pointer;font-size:14px;}',
    '#noah-send:disabled{opacity:.45;cursor:default;}',
    '#noah-foot{padding:8px 14px 10px;color:#5b6b7f;font-size:11px;text-align:center;}',
    '@media (max-width:480px){#noah-panel{right:12px;bottom:92px;}#noah-launcher{right:14px;bottom:14px;}}'
  ].join('\n');

  var AVATAR_SRC = (function () {
    var ep = getEndpoint();
    var m = ep.match(/^(https:\/\/[^/]+)/);
    return (m ? m[1] : '') + '/assets/noah-avatar.png';
  })();
  var LS_KEY = 'noah-ai-history-v1';
  var CHIPS = ['What should I learn first?', 'Tell me about IL-11 Zero Trust', 'Who built this site?', 'Explain a DevOps concept'];

  var els = {};
  var history = [];
  var busy = false;

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mdLite(src) {
    var h = esc(src);
    h = h.replace(/```([\s\S]*?)```/g, function (m, code) { return '<pre><code>' + code.replace(/^\n/, '') + '</code></pre>'; });
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    var lines = h.split('\n'), out = [], inList = false;
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*[-*]\s+(.*)/);
      if (m) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + m[1] + '</li>'); }
      else { if (inList) { out.push('</ul>'); inList = false; } out.push(ln); }
    });
    if (inList) out.push('</ul>');
    return out.join('<br>');
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) history = JSON.parse(raw).slice(-20) || [];
    } catch (e) { history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(history.slice(-20))); } catch (e) {}
  }

  function addMsg(role, html, notice) {
    var m = el('div', 'noah-msg ' + (role === 'user' ? 'user' : 'noah'), html);
    if (notice) {
      var n = el('span', 'noah-notice', esc(notice));
      m.appendChild(n);
    }
    els.msgs.appendChild(m);
    els.msgs.scrollTop = els.msgs.scrollHeight;
    return m;
  }

  function showTyping() {
    var t = el('div', '', '<span></span><span></span><span></span>');
    t.id = 'noah-typing';
    els.msgs.appendChild(t);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }
  function hideTyping() {
    var t = document.getElementById('noah-typing');
    if (t) t.remove();
  }

  function renderNudges(nudges) {
    if (!nudges || !nudges.length) return;
    var box = el('div', 'noah-nudges');
    nudges.forEach(function (n) {
      var b = el('button', 'noah-nudge', esc(n));
      b.type = 'button';
      b.addEventListener('click', function () { sendText(n); });
      box.appendChild(b);
    });
    els.msgs.appendChild(box);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }

  function sendText(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    els.send.disabled = true;
    addMsg('user', esc(text));
    history.push({ role: 'user', content: text });
    saveHistory();
    showTyping();
    askRemote(text, history.slice(0, -1)).then(function (out) {
      hideTyping();
      addMsg('noah', mdLite(out.reply), out.notice);
      if (out.nudges) renderNudges(out.nudges);
      history.push({ role: 'assistant', content: out.reply });
      saveHistory();
      busy = false;
      els.send.disabled = false;
      els.input.focus();
    });
  }

  function buildWidget() {
    if (document.getElementById('noah-launcher')) return;
    var style = document.createElement('style');
    style.textContent = WIDGET_CSS;
    document.head.appendChild(style);

    var launcher = el('button', '', '<span class="noah-ring r1"></span><span class="noah-ring r2"></span>' +
      '<span class="noah-orb"><img alt="Noah AI"></span><span class="noah-ping"></span>');
    launcher.id = 'noah-launcher';
    launcher.setAttribute('aria-label', 'Chat with Noah AI');
    launcher.querySelector('img').src = AVATAR_SRC;
    launcher.addEventListener('click', toggle);

    var panel = el('div', '');
    panel.id = 'noah-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Noah AI chat');
    panel.innerHTML =
      '<div id="noah-head"><span class="noah-avatar"><img alt="Noah AI"></span>' +
      '<span class="noah-title"><span class="noah-name">Noah AI</span><br>' +
      '<span class="noah-status"><span class="noah-dot"></span><span id="noah-status-text">Online — resident intelligence</span></span></span>' +
      '<button id="noah-close" aria-label="Close chat">×</button></div>' +
      '<div id="noah-msgs"></div>' +
      '<div id="noah-chips"></div>' +
      '<form id="noah-form"><textarea id="noah-input" rows="1" placeholder="Ask Noah AI anything…" aria-label="Message Noah AI"></textarea>' +
      '<button id="noah-send" type="submit">Send</button></form>' +
      '<div id="noah-foot">Noah AI · Interstitium Labs · answers from Enmanuel\'s distilled work</div>';
    panel.querySelector('#noah-head img').src = AVATAR_SRC;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    els = {
      launcher: launcher, panel: panel,
      msgs: panel.querySelector('#noah-msgs'),
      chips: panel.querySelector('#noah-chips'),
      form: panel.querySelector('#noah-form'),
      input: panel.querySelector('#noah-input'),
      send: panel.querySelector('#noah-send')
    };

    panel.querySelector('#noah-close').addEventListener('click', close);
    els.form.addEventListener('submit', function (e) { e.preventDefault(); sendText(els.input.value); els.input.value = ''; });
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); els.form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });

    CHIPS.forEach(function (c) {
      var b = el('button', 'noah-chip', esc(c));
      b.type = 'button';
      b.addEventListener('click', function () { sendText(c); });
      els.chips.appendChild(b);
    });

    loadHistory();
    var greeted = false;
    try { greeted = sessionStorage.getItem('noah-ai-greeted') === '1'; } catch (e) {}
    history.forEach(function (m) {
      addMsg(m.role, m.role === 'user' ? esc(m.content) : mdLite(m.content));
    });
    if (!history.length && !greeted) {
      addMsg('noah', 'I am <b>Noah AI</b> — the resident intelligence of Interstitium Labs. ' +
        'Ask me about the curriculum, the projects, the code — or bring me a hypothesis and we will reason it through, Socratic-style.');
      try { sessionStorage.setItem('noah-ai-greeted', '1'); } catch (e) {}
    }
    if (!greeted) {
      setTimeout(function () {
        if (!panel.classList.contains('open')) launcher.classList.add('attn');
      }, 6000);
    }
  }

  function open() {
    buildWidget();
    els.panel.classList.add('open');
    els.launcher.classList.remove('attn');
    setTimeout(function () { els.input.focus(); }, 320);
  }
  function close() {
    if (els.panel) els.panel.classList.remove('open');
  }
  function toggle() {
    buildWidget();
    if (els.panel.classList.contains('open')) close(); else open();
  }

  /* ================= Boot ========================================== */
  function boot() {
    if (!document.body) return;
    buildWidget();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  if (typeof window === 'undefined') { var window = {}; }
  window.IL = window.IL || {};
  window.IL.noah = { ask: ask, configureLLM: configureLLM };
  window.IL.noahAI = {
    open: open, close: close, toggle: toggle,
    ask: function (text, hist) { return askRemote(text, hist || []); },
    endpoint: getEndpoint
  };
})();
