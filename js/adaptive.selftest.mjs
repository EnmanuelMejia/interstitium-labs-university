#!/usr/bin/env node
/* =====================================================================
 * adaptive.selftest.mjs — node-runnable self-test for js/adaptive.js
 * and js/noah.js. Run:  node adaptive.selftest.mjs   (exit 0 = pass)
 *
 * Strategy: the browser scripts are evaluated in a vm sandbox with a
 * fake window + a Map-backed localStorage shim. Every math generator is
 * run 50x with a seeded PRNG and its answer is INDEPENDENTLY recomputed
 * here by parsing the canonical question string — the generator's own
 * arithmetic is never trusted. Noah is checked for the Socratic contract:
 * the reply must never contain the literal solution.
 * ===================================================================== */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  passed++;
}

/* Deterministic PRNG (mulberry32) so the self-test is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Load a build script into a fresh sandbox; sharedMem lets two loads
 * share one localStorage (used to prove save/load persistence). */
function loadScript(name, sharedMem) {
  const code = readFileSync(path.join(here, name), 'utf8');
  const mem = sharedMem || new Map();
  const sandbox = {
    window: {},
    console,
    localStorage: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: name });
  return sandbox;
}

const aBox = loadScript('adaptive.js');
const nBox = loadScript('noah.js');
const adaptive = aBox.window.IL.adaptive;
const noah = nBox.window.IL.noah;
assert(adaptive && typeof adaptive.place === 'function', 'adaptive surface exposed');
assert(noah && typeof noah.ask === 'function', 'noah surface exposed');

/* ------------------------------------------------------------------ *
 * Interface shape: adaptive must expose EXACTLY the contracted fns.
 * ------------------------------------------------------------------ */
const ADAPTIVE_KEYS = ['place', 'next', 'record', 'dueReviews', 'gate', 'timed',
  'save', 'load', 'setGoal', 'listGoals', 'toggleGoal', 'noteMemory',
  'getMemory', 'genMath'].sort();
assert(JSON.stringify(Object.keys(adaptive).sort()) === JSON.stringify(ADAPTIVE_KEYS),
  'adaptive exposes exactly the contracted interface');
const NOAH_KEYS = ['ask', 'configureLLM'].sort();
assert(JSON.stringify(Object.keys(noah).sort()) === JSON.stringify(NOAH_KEYS),
  'noah exposes exactly the contracted interface');

/* ------------------------------------------------------------------ *
 * Math helpers mirrored independently in the test (never imported).
 * ------------------------------------------------------------------ */
function tGcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
function tFracStr(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = tGcd(n, d); n /= g; d /= g;
  return d === 1 ? String(n) : n + '/' + d;
}
function tDecStr(scaled, places) {
  const neg = scaled < 0;
  const s = String(Math.abs(scaled)).padStart(places + 1, '0');
  const ip = s.slice(0, s.length - places);
  const fp = s.slice(s.length - places).replace(/0+$/, '');
  return (neg ? '-' : '') + ip + (fp ? '.' + fp : '');
}
function tParseDec(str) {
  const parts = str.split('.');
  return { scaled: parseInt(parts[0] + parts[1], 10), places: parts[1].length };
}

/* Independent recomputation per topic: parse q, recompute the expected
 * correct choice string, and require choices[answer] to equal it. */
const RECOMPUTE = {
  'whole-numbers'(g) {
    const m = g.q.match(/^Compute: (\d+) \+ (\d+) \* (\d+)\.$/);
    assert(m, 'whole-numbers q format: ' + g.q);
    assert(Number(g.choices[g.answer]) === Number(m[1]) + Number(m[2]) * Number(m[3]),
      'whole-numbers answer correct');
  },
  'fractions'(g) {
    const m = g.q.match(/^Compute: (\d+)\/(\d+) \+ (\d+)\/(\d+)\.$/);
    assert(m, 'fractions q format: ' + g.q);
    const a = +m[1], b = +m[2], c = +m[3], d = +m[4];
    assert(g.choices[g.answer] === tFracStr(a * d + c * b, b * d), 'fractions answer correct');
  },
  'decimals'(g) {
    const m = g.q.match(/^Compute: (\d+\.\d+) \* (\d+\.\d+)\.$/);
    assert(m, 'decimals q format: ' + g.q);
    const x = tParseDec(m[1]), y = tParseDec(m[2]);
    assert(g.choices[g.answer] === tDecStr(x.scaled * y.scaled, x.places + y.places),
      'decimals answer correct: ' + g.q);
  },
  'percents'(g) {
    const m = g.q.match(/^What is (\d+)% of (\d+)\?$/);
    assert(m, 'percents q format: ' + g.q);
    const expected = (Number(m[1]) * Number(m[2])) / 100;
    assert(Number.isInteger(expected), 'percents constructed whole');
    assert(Number(g.choices[g.answer]) === expected, 'percents answer correct');
  },
  'linear-equations'(g) {
    const m = g.q.match(/^Solve for x: (-?\d+)x ([+-]) (\d+) = (-?\d+)\.$/);
    assert(m, 'linear-equations q format: ' + g.q);
    const a = +m[1], sb = m[2] === '+' ? 1 : -1, B = +m[3], c = +m[4];
    const x = (c - sb * B) / a;
    assert(Number.isInteger(x), 'linear-equations integer root');
    assert(g.choices[g.answer] === String(x), 'linear-equations answer correct: ' + g.q);
  },
  'inequalities'(g) {
    const m = g.q.match(/^Solve for x: (-?\d+)x ([+-]) (\d+) ([<>]) (-?\d+)\.$/);
    assert(m, 'inequalities q format: ' + g.q);
    const a = +m[1], sb = m[2] === '+' ? 1 : -1, B = +m[3], op = m[4], c = +m[5];
    const boundary = (c - sb * B) / a;
    assert(Number.isInteger(boundary), 'inequalities integer boundary');
    const dir = (op === '>') !== (a < 0) ? '>' : '<';
    assert(g.choices[g.answer] === 'x ' + dir + ' ' + boundary,
      'inequalities answer correct: ' + g.q + ' got ' + g.choices[g.answer]);
  },
  'systems'(g) {
    const re = /(-?\d+)x ([+-]) (\d+)y = (-?\d+)/g;
    const ms = [re.exec(g.q), re.exec(g.q)];
    assert(ms[0] && ms[1], 'systems q format: ' + g.q);
    const p = (mm) => ({ a: +mm[1], b: (mm[2] === '+' ? 1 : -1) * +mm[3], c: +mm[4] });
    const e1 = p(ms[0]), e2 = p(ms[1]);
    const det = e1.a * e2.b - e2.a * e1.b;
    assert(det !== 0, 'systems non-singular');
    const x = (e1.c * e2.b - e2.c * e1.b) / det;
    const y = (e1.a * e2.c - e2.a * e1.c) / det;
    assert(Number.isInteger(x) && Number.isInteger(y), 'systems integer solution');
    assert(g.choices[g.answer] === '(' + x + ', ' + y + ')',
      'systems answer correct: ' + g.q);
  },
  'functions'(g) {
    const m = g.q.match(/^Given f\(x\) = (\d+)x\^2 \+ (\d+)x \+ (\d+), find f\((-?\d+)\)\.$/);
    assert(m, 'functions q format: ' + g.q);
    const a = +m[1], b = +m[2], c = +m[3], x0 = +m[4];
    assert(Number(g.choices[g.answer]) === a * x0 * x0 + b * x0 + c,
      'functions answer correct: ' + g.q);
  },
  'trig'(g) {
    const m = g.q.match(/^Evaluate (sin|cos|tan)\((\d+) degrees\)\.$/);
    assert(m, 'trig q format: ' + g.q);
    const table = {
      'sin|0': '0', 'sin|30': '1/2', 'sin|45': '√2/2', 'sin|60': '√3/2', 'sin|90': '1',
      'cos|0': '1', 'cos|30': '√3/2', 'cos|45': '√2/2', 'cos|60': '1/2', 'cos|90': '0',
      'tan|0': '0', 'tan|30': '√3/3', 'tan|45': '1', 'tan|60': '√3'
    };
    const expected = table[m[1] + '|' + m[2]];
    assert(expected !== undefined, 'trig known special angle: ' + g.q);
    assert(g.choices[g.answer] === expected, 'trig answer correct: ' + g.q);
  },
  'units-measurement'(g) {
    const m = g.q.match(/^Convert ([\d.]+) (\S+) to (\S+)\.$/);
    assert(m, 'units q format: ' + g.q);
    const factors = {
      'km->m': 1000, 'm->cm': 100, 'cm->mm': 10, 'kg->g': 1000,
      'g->mg': 1000, 'L->mL': 1000, 'm->km': 1 / 1000, 'hr->min': 60, 'min->sec': 60
    };
    const f = factors[m[2] + '->' + m[3]];
    assert(f !== undefined, 'units known conversion: ' + g.q);
    const expected = parseFloat(m[1]) * f;
    const got = Number(g.choices[g.answer]);
    assert(Math.abs(got - expected) < 1e-9 * Math.max(1, Math.abs(expected)),
      'units answer correct: ' + g.q + ' got ' + g.choices[g.answer]);
  },
  'exponents'(g) {
    const m = g.q.match(/^Simplify (\d+)\^(\d+) \* (\d+)\^(\d+)\.$/);
    assert(m, 'exponents q format: ' + g.q);
    assert(m[1] === m[3], 'exponents same base');
    assert(g.choices[g.answer] === m[1] + '^' + (Number(m[2]) + Number(m[4])),
      'exponents answer correct: ' + g.q);
  },
  'basic-stats'(g) {
    const m = g.q.match(/^Find the mean of: ([\d, ]+)\.$/);
    assert(m, 'basic-stats q format: ' + g.q);
    const vals = m[1].split(',').map((s) => Number(s.trim()));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    assert(Number(g.choices[g.answer]) === mean, 'basic-stats answer correct: ' + g.q);
  }
};

const GEN_TOPICS = Object.keys(RECOMPUTE);
assert(GEN_TOPICS.length === 12, '12 generators covered');

/* Run each generator 50x with a seeded PRNG. */
GEN_TOPICS.forEach((topic, ti) => {
  for (let i = 0; i < 50; i++) {
    const rand = mulberry32(1000 + ti * 7919 + i);
    const g = adaptive.genMath(topic, rand);
    assert(g && typeof g.q === 'string' && g.q.length > 0, topic + ' q present');
    assert(Array.isArray(g.choices) && g.choices.length === 4, topic + ' has 4 choices');
    assert(new Set(g.choices).size === 4, topic + ' choices unique: ' + g.choices.join('|'));
    assert(Number.isInteger(g.answer) && g.answer >= 0 && g.answer < 4,
      topic + ' answer index valid');
    assert(typeof g.explain === 'string' && g.explain.length > 10, topic + ' explain present');
    assert(g.topic === topic, topic + ' topic field matches');
    RECOMPUTE[topic](g); // independent correctness check
  }
});

/* Unknown topic throws a clear error. */
let threw = false;
try { adaptive.genMath('nope-not-a-topic', mulberry32(1)); } catch (e) { threw = /unknown topic/.test(e.message); }
assert(threw, 'genMath throws on unknown topic');

/* ------------------------------------------------------------------ *
 * place(): IRT-lite diagnostic + fringe gating.
 * ------------------------------------------------------------------ */
{
  const good = [];
  for (let i = 0; i < 5; i++) good.push({ topicId: 'trig', correct: true, difficulty: 0.8 });
  const r = adaptive.place('math-path', good);
  assert(r.mastery.trig > 0.5, 'place: correct answers raise mastery');
  assert(r.mastery.trig <= 0.99, 'place: mastery clamped');
  // Prerequisite gating: trig answered well but its prereqs are unknown,
  // so trig must NOT be fringe-ready; prereq-free whole-numbers must be.
  assert(!r.fringe.includes('trig'), 'place: fringe gated by prereqs');
  assert(r.fringe.includes('whole-numbers'), 'place: prereq-free topic is fringe-ready');

  const bad = [];
  for (let i = 0; i < 5; i++) bad.push({ topicId: 'fractions', correct: false, difficulty: 0.5 });
  const r2 = adaptive.place('math-path', bad);
  assert(r2.mastery.fractions < 0.5, 'place: incorrect answers lower mastery');
  assert(r2.mastery.fractions >= 0.02, 'place: mastery floor respected');
  for (const k in r2.mastery) {
    assert(r2.mastery[k] >= 0 && r2.mastery[k] <= 1, 'place: mastery in 0..1');
  }
}

/* ------------------------------------------------------------------ *
 * next() / record(): fringe sequencing + SM-2 scheduling.
 * ------------------------------------------------------------------ */
{
  const state = { topics: ['whole-numbers', 'fractions'], mastery: {}, sm2: {} };
  const n1 = adaptive.next(state);
  assert(n1.kind === 'study' && n1.topicId === 'whole-numbers',
    'next: starts at lowest-mastery prereq-free topic');
  assert(n1.item && typeof n1.item.q === 'string', 'next: math topic carries generated item');

  // Three correct answers at max difficulty push whole-numbers past 0.8.
  adaptive.record(state, 'whole-numbers', true, 1);
  adaptive.record(state, 'whole-numbers', true, 1);
  adaptive.record(state, 'whole-numbers', true, 1);
  assert(state.mastery['whole-numbers'] >= 0.8, 'record: mastery climbs with correct answers');
  const rec = state.sm2['whole-numbers'];
  assert(rec && typeof rec.interval === 'number' && typeof rec.ease === 'number' &&
         typeof rec.due === 'number' && rec.due > Date.now(),
    'record: SM-2 schedule written');

  const n2 = adaptive.next(state);
  assert(n2.topicId === 'fractions', 'next: advances along fringe once prereq met, got ' + n2.topicId);

  // Incorrect answers move mastery down.
  const s2 = { mastery: {}, sm2: {} };
  adaptive.record(s2, 'decimals', false, 0.5);
  assert(s2.mastery.decimals < 0.5, 'record: incorrect lowers mastery');
  assert(s2.mastery.decimals >= 0, 'record: mastery never negative');

  // Five consecutive misses flags a re-route suggestion.
  const s3 = { mastery: {}, sm2: {} };
  for (let i = 0; i < 5; i++) adaptive.record(s3, 'percents', false, 0.5);
  assert(s3.switchSuggested === true, 'record: 5 misses suggests switching topic');
}

/* ------------------------------------------------------------------ *
 * dueReviews(): spaced-repetition queue.
 * ------------------------------------------------------------------ */
{
  const state = { mastery: {}, sm2: {} };
  adaptive.record(state, 'decimals', true, 0.5);
  adaptive.record(state, 'percents', true, 0.5);
  state.sm2.decimals.due = Date.now() - 1000; // force overdue
  const due = adaptive.dueReviews(state);
  assert(due.includes('decimals'), 'dueReviews: overdue topic listed');
  assert(!due.includes('percents'), 'dueReviews: future-due topic excluded');

  // next() prioritizes due reviews.
  const n = adaptive.next(state);
  assert(n.kind === 'review' && n.topicId === 'decimals', 'next: due review takes priority');
}

/* ------------------------------------------------------------------ *
 * gate(): path completion.
 * ------------------------------------------------------------------ */
{
  const state = { topics: ['whole-numbers', 'fractions'],
                  mastery: { 'whole-numbers': 0.9, fractions: 0.7 }, sm2: {} };
  const g1 = adaptive.gate(state, 'math-path');
  assert(g1.passed === false, 'gate: fails while a topic is below threshold');
  assert(g1.fringe.includes('fractions'), 'gate: fringe names the weak topic');
  assert(Math.abs(g1.score - 0.8) < 1e-9, 'gate: score is mean mastery');

  state.mastery.fractions = 0.85;
  const g2 = adaptive.gate(state, 'math-path');
  assert(g2.passed === true && g2.fringe.length === 0, 'gate: passes when all topics >= 0.8');
}

/* ------------------------------------------------------------------ *
 * timed(): timestamp-based controller.
 * ------------------------------------------------------------------ */
{
  const items = [];
  for (let i = 0; i < 12; i++) {
    items.push({ q: 'q' + i, choices: ['a', 'b'], answer: 0,
                 topic: i < 6 ? 'whole-numbers' : 'fractions' });
  }
  const c = adaptive.timed({ items, minutes: 1 });
  assert(c.total === 12, 'timed: total exposed');
  const rem = c.remainingSec();
  assert(rem > 0 && rem <= 60, 'timed: remainingSec within window, got ' + rem);
  for (let i = 0; i < 10; i++) assert(c.answer(i, 0) === true, 'timed: answer accepted');
  assert(c.answer(10, 1) === true && c.answer(11, 1) === true, 'timed: wrong answers accepted');
  assert(c.answer(99, 0) === false, 'timed: out-of-range rejected');
  const res = c.submit();
  assert(res.correct === 10 && res.total === 12, 'timed: scoring');
  assert(Math.abs(res.score - 10 / 12) < 1e-9, 'timed: score ratio');
  assert(res.passed === true, 'timed: pass at >= 0.7');
  assert(res.perTopic['whole-numbers'].score === 1, 'timed: perTopic whole-numbers');
  assert(Math.abs(res.perTopic.fractions.score - 4 / 6) < 1e-9, 'timed: perTopic fractions');
  assert(c.submit() === res, 'timed: submit idempotent');

  // Untimed controller: minutes 0 / missing / null / negative -> no deadline.
  // (minutes: 0 must never mean "already expired": that instantly killed
  // every untimed placement diagnostic.)
  for (const m of [0, undefined, null, -5, 'x', NaN]) {
    const cu = adaptive.timed({ items, minutes: m });
    assert(cu.timed === false, 'timed: untimed flag for minutes=' + String(m));
    assert(cu.remainingSec() === Infinity, 'timed: untimed remainingSec is Infinity');
    assert(cu.answer(0, 0) === true, 'timed: untimed answers accepted');
    for (let i = 0; i < 12; i++) cu.answer(i, 0);
    const ru = cu.submit();
    assert(ru.correct === 12 && ru.passed === true, 'timed: untimed full-score submit');
  }
  const c2 = adaptive.timed({ items }); // minutes key absent entirely
  assert(c2.timed === false && c2.answer(3, 1) === true, 'timed: absent minutes untimed');

  // Timed flag exposed on timed controllers.
  assert(c.timed === true, 'timed: timed flag true for positive minutes');

  // Deterministic expiry: patch the vm sandbox's Date (adaptive.js runs
  // inside the sandbox, so the outer Date.now is invisible to it).
  {
    const sandboxDate = vm.runInContext('Date', aBox);
    const realNow = sandboxDate.now;
    let now = realNow();
    sandboxDate.now = () => now;
    try {
      const c4 = adaptive.timed({ items, minutes: 1 });
      assert(c4.answer(0, 0) === true, 'timed: answer accepted before deadline');
      now += 61 * 1000; // past the 60 s deadline
      assert(c4.remainingSec() === 0, 'timed: remainingSec 0 after deadline');
      assert(c4.answer(1, 0) === false, 'timed: answer rejected after deadline');
      const r4 = c4.submit();
      assert(r4.correct === 1 && r4.passed === false, 'timed: submit after expiry scores given answers');
    } finally {
      sandboxDate.now = realNow;
    }
  }

  // Failing score.
  const c3 = adaptive.timed({ items, minutes: 5 });
  for (let i = 0; i < 12; i++) c3.answer(i, 1);
  assert(c3.submit().passed === false, 'timed: all-wrong fails');
}

/* ------------------------------------------------------------------ *
 * Goals + memory.
 * ------------------------------------------------------------------ */
{
  const g = adaptive.setGoal('Master fractions');
  assert(g && g.id && g.text === 'Master fractions' && g.done === false, 'setGoal');
  assert(adaptive.listGoals().length === 1, 'listGoals');
  const t1 = adaptive.toggleGoal(g.id);
  assert(t1.done === true, 'toggleGoal flips on');
  assert(adaptive.toggleGoal(g.id).done === false, 'toggleGoal flips off');
  assert(adaptive.toggleGoal('missing') === null, 'toggleGoal unknown -> null');
  assert(adaptive.noteMemory('deck', 'sundance') === true, 'noteMemory');
  assert(adaptive.getMemory('deck') === 'sundance', 'getMemory');
  assert(adaptive.getMemory('absent') === undefined, 'getMemory unknown -> undefined');
}

/* ------------------------------------------------------------------ *
 * save()/load(): localStorage 'il_adaptive_v1', proven across loads.
 * ------------------------------------------------------------------ */
{
  const mem = new Map();
  const boxA = loadScript('adaptive.js', mem);
  const A = boxA.window.IL.adaptive;
  A.setGoal('Persist me');
  A.noteMemory('k', 'v');
  assert(A.save() === true, 'save returns true with storage');

  const raw = mem.get('il_adaptive_v1');
  assert(typeof raw === 'string' && raw.includes('Persist me'), 'save writes il_adaptive_v1');

  const boxB = loadScript('adaptive.js', mem); // fresh module, same storage
  const B = boxB.window.IL.adaptive;
  const loaded = B.load();
  assert(loaded.goals.length === 1 && loaded.goals[0].text === 'Persist me',
    'load restores goals across instances');
  assert(B.getMemory('k') === 'v', 'load restores memory across instances');

  // No-storage environment: save() must not throw, load() returns a store.
  const boxC = loadScript('adaptive.js');
  delete boxC.localStorage;
  const C = boxC.window.IL.adaptive;
  assert(C.save() === false, 'save without storage returns false, no throw');
  const st = C.load();
  assert(st && Array.isArray(st.goals), 'load without storage returns store shape');
}

/* ------------------------------------------------------------------ *
 * noah.ask(): Socratic contract.
 * ------------------------------------------------------------------ */
{
  // Basic shape + topic detection.
  const r1 = noah.ask('How do I solve for x in 3x + 5 = 20?');
  assert(typeof r1.reply === 'string' && r1.reply.length > 20, 'noah: reply present');
  assert(Array.isArray(r1.nudges) && r1.nudges.length === 2 &&
         r1.nudges.every((n) => typeof n === 'string' && n.length > 10),
    'noah: two nudges');
  assert(r1.reply.toLowerCase().includes('algebra'), 'noah: topic detected');

  const rNet = noah.ask('How do I compute a subnet mask?');
  assert(rNet.reply.toLowerCase().includes('networking'), 'noah: networking detected');

  // No answer dump: demand-for-answer case. The solution to 2x+6=14 is 4;
  // Noah's templates carry no digits at all, so this is a hard guarantee.
  const r2 = noah.ask('Solve for x: 2x + 6 = 14. just give me the answer');
  const all2 = r2.reply + ' ' + r2.nudges.join(' ');
  assert(/[0-9]/.test(all2) === false, 'noah: no digits in refusal (no literal solution)');
  assert(/will not hand you the answer/i.test(r2.reply), 'noah: gentle refusal in voice');

  // No answer dump: plain ask. 12*8=96 must not appear.
  const r3 = noah.ask('What is 12 * 8?');
  const all3 = r3.reply + ' ' + r3.nudges.join(' ');
  assert(!all3.includes('96'), 'noah: plain ask contains no literal solution');

  // Hypothesis acknowledged.
  const r4 = noah.ask('I think the derivative uses the power rule. Am I right?');
  assert(/hypothesis is registered/i.test(r4.reply), 'noah: hypothesis acknowledged');

  // Empty input does not crash.
  const r5 = noah.ask('');
  assert(typeof r5.reply === 'string' && r5.nudges.length === 2, 'noah: empty input safe');

  // configureLLM hook: documented, local by default, noted when set.
  const cfg = noah.configureLLM({ endpoint: 'https://example.invalid/v1', model: 'noah-test' });
  assert(cfg && cfg.local === true, 'noah: configureLLM returns local-first receipt');
  const r6 = noah.ask('What is a subnet?');
  assert(/local engine/i.test(r6.reply), 'noah: configured endpoint noted, reply stays local');
  assert(noah.configureLLM(null) === null, 'noah: configureLLM(null) clears');
  const r7 = noah.ask('What is a subnet?');
  assert(!/local engine/i.test(r7.reply), 'noah: notice gone after clear');
}

console.log('ALL TESTS PASSED (' + passed + ' assertions)');
process.exit(0);
