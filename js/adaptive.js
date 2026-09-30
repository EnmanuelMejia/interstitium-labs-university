/* =====================================================================
 * Interstitium Labs — Adaptive learning engine (js/adaptive.js)
 *
 * The adaptive loop: Place -> Fringe -> Gate -> Deepen.
 * Mastery lives in localStorage. No network calls. No dependencies.
 * ES2020, pure vanilla JS.
 *
 * Theory grounding (from research/math-aleks.md, KST / ALEKS, published):
 *  - The learner's actionable set is always the OUTER FRINGE: topics whose
 *    prerequisites are met but which are not yet mastered. It is COMPUTED
 *    from the prerequisite graph, never curated.
 *  - Placement is CAT-style: an IRT-lite update moves the mastery estimate
 *    toward observed correctness, weighted by item difficulty.
 *  - Practice updates are streak-aware (a second consecutive correct answer
 *    moves mastery further, mirroring the ALEKS +1/+2 learning score) and
 *    schedule review with SM-2 spaced repetition.
 *  - Gates pass only when every path topic reaches the mastery threshold.
 *
 * Public surface: window.IL.adaptive
 *   place(pathId, answers)                    -> {mastery, fringe}
 *   next(state)                               -> {kind, topicId, item?}
 *   record(state, topicId, correct, difficulty)-> state (updated)
 *   dueReviews(state)                         -> [topicId]
 *   gate(state, pathId)                       -> {passed, score, fringe}
 *   timed(assessment)                         -> controller
 *   save() / load()                           -> localStorage 'il_adaptive_v1'
 *   setGoal(text) / listGoals() / toggleGoal(id)
 *   noteMemory(key, value) / getMemory(key)
 *   genMath(topicId, rand)                    -> {q, choices, answer, explain, topic}
 *
 * State shape used by next/record/dueReviews/gate:
 *   { topics:[topicId], mastery:{topicId:0..1}, sm2:{topicId:rec},
 *     prereqs:{topicId:[prereqId]}, log:[...] }
 * Callers (learn.html) seed state.prereqs from data/catalog.json topic order;
 * when absent, the built-in DEFAULT_PREREQS seed (the catalog math spine
 * order: arithmetic -> pre-algebra -> algebra -> trig -> stats) is used.
 * ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  var STORE_KEY = 'il_adaptive_v1';
  var MASTERED_AT = 0.8;   // mastery threshold: topic counts as learned
  var PREREQ_AT = 0.7;     // prerequisite threshold: topic is "ready"
  var GATE_SCORE = 0.8;    // gate passes when every path topic >= this
  var TIMED_PASS = 0.7;    // timed assessment pass mark
  var DAY_MS = 86400000;

  /* Prerequisite seed, ordered along the catalog math spine
   * (arithmetic -> pre-algebra -> algebra 1 -> trig -> statistics),
   * plus common standalone IT topics (no prereqs: always fringe-ready).
   * learn.html replaces this with the catalog-derived map per path. */
  var DEFAULT_PREREQS = {
    'whole-numbers': [],
    'fractions': ['whole-numbers'],
    'decimals': ['whole-numbers'],
    'percents': ['fractions', 'decimals'],
    'exponents': ['whole-numbers'],
    'units-measurement': ['decimals'],
    'linear-equations': ['whole-numbers', 'fractions'],
    'inequalities': ['linear-equations'],
    'systems': ['linear-equations'],
    'functions': ['linear-equations'],
    'trig': ['functions', 'exponents'],
    'basic-stats': ['fractions', 'decimals'],
    'networking': [], 'linux': [], 'security': [], 'python': [],
    'sql': [], 'git': [], 'docker': [], 'cloud': []
  };

  /* ------------------------------------------------------------------ *
   * Small utilities
   * ------------------------------------------------------------------ */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clamp01(v) { return clamp(v, 0, 1); }

  function ri(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
  function pickR(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
  function shuffle(rand, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  /* Canonical reduced fraction string: "5/6", or "2" for whole numbers. */
  function fracStr(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d); n /= g; d /= g;
    if (d === 1) return String(n);
    return n + '/' + d;
  }
  /* Exact decimal string for an integer scaled by 10^places (no float error). */
  function decStr(scaled, places) {
    var neg = scaled < 0;
    var s = String(Math.abs(scaled)).padStart(places + 1, '0');
    var ip = s.slice(0, s.length - places);
    var fp = s.slice(s.length - places).replace(/0+$/, '');
    return (neg ? '-' : '') + ip + (fp ? '.' + fp : '');
  }

  /* Build a 4-choice set: correct string + 3 plausible distractors,
   * deduplicated, shuffled; returns {choices, answer}. */
  function finalizeChoices(correctStr, candidates, rand) {
    var seen = {};
    seen[correctStr] = true;
    var distractors = [];
    for (var i = 0; i < candidates.length && distractors.length < 3; i++) {
      var c = String(candidates[i]);
      if (!seen[c]) { seen[c] = true; distractors.push(c); }
    }
    // Numeric fallback padding (only reached if candidates were thin).
    var k = 2;
    while (distractors.length < 3) {
      var n = Number(correctStr);
      var pad = String(Number.isFinite(n) ? (n + k) : (correctStr + k));
      if (!seen[pad]) { seen[pad] = true; distractors.push(pad); }
      k++;
    }
    var choices = shuffle(rand, [correctStr].concat(distractors));
    return { choices: choices, answer: choices.indexOf(correctStr) };
  }

  /* ------------------------------------------------------------------ *
   * Fringe computation (ALEKS outer fringe, KST-grounded)
   * fringe = topics not yet mastered whose every prereq is met.
   * ------------------------------------------------------------------ */
  function masteryOf(mastery, topicId) {
    var m = mastery ? mastery[topicId] : undefined;
    return (typeof m === 'number') ? m : 0.5;
  }
  function computeFringe(mastery, prereqs) {
    var pre = prereqs || DEFAULT_PREREQS;
    var universe = {};
    var k;
    for (k in pre) universe[k] = true;
    if (mastery) for (k in mastery) universe[k] = true;
    var fringe = [];
    for (k in universe) {
      if (masteryOf(mastery, k) >= MASTERED_AT) continue;
      var ps = pre[k] || [];
      var ready = true;
      for (var i = 0; i < ps.length; i++) {
        if (masteryOf(mastery, ps[i]) < PREREQ_AT) { ready = false; break; }
      }
      if (ready) fringe.push(k);
    }
    fringe.sort(function (a, b) {
      var d = masteryOf(mastery, a) - masteryOf(mastery, b);
      if (d !== 0) return d;
      var pa = (pre[a] || []).length, pb = (pre[b] || []).length;
      if (pa !== pb) return pa - pb;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    return fringe;
  }

  /* ------------------------------------------------------------------ *
   * place(pathId, answers) — CAT-style diagnostic.
   * answers: [{topicId, correct, difficulty}]; difficulty in 0..1.
   * IRT-lite: start at 0.5; move toward observed correctness (1/0),
   * weighted by difficulty — harder items move the estimate more.
   * ------------------------------------------------------------------ */
  function place(pathId, answers) {
    var mastery = {};
    var list = answers || [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i] || {};
      var t = a.topicId;
      if (!t) continue;
      var d = clamp(typeof a.difficulty === 'number' ? a.difficulty : 0.5, 0.1, 1);
      var obs = a.correct ? 1 : 0;
      var m = (typeof mastery[t] === 'number') ? mastery[t] : 0.5;
      m = m + 0.45 * d * (obs - m);
      mastery[t] = clamp(m, 0.02, 0.99); // keep residual uncertainty
    }
    return { mastery: mastery, fringe: computeFringe(mastery, DEFAULT_PREREQS) };
  }

  /* ------------------------------------------------------------------ *
   * next(state) — ALEKS-style fringe sequencing.
   * Priority: due spaced-repetition reviews first, then the lowest-mastery
   * fringe topic whose prereqs are met (easiest-ready first).
   * kind: 'study' for unseen/weak topics, 'quiz' for partially learned,
   * 'review' for spaced-repetition due items.
   * ------------------------------------------------------------------ */
  function next(state) {
    state = state || {};
    var mastery = state.mastery || {};
    var prereqs = state.prereqs || DEFAULT_PREREQS;

    var reviews = dueReviews(state);
    if (reviews.length > 0) {
      var rt = reviews[0];
      return { kind: 'review', topicId: rt, item: tryGenMath(rt) };
    }

    var pre = prereqs;
    var universe = {};
    var k;
    for (k in pre) universe[k] = true;
    for (k in mastery) universe[k] = true;
    var topics = state.topics || [];
    for (var i = 0; i < topics.length; i++) universe[topics[i]] = true;

    var fringe = computeFringe(mastery, prereqs);
    // Restrict to path topics when the state names them.
    if (topics.length > 0) {
      var inPath = {};
      for (var j = 0; j < topics.length; j++) inPath[topics[j]] = true;
      fringe = fringe.filter(function (t) { return inPath[t]; });
    }
    if (fringe.length === 0) {
      return { kind: 'study', topicId: null, done: true,
               note: 'Fringe empty: run gate() to confirm path completion.' };
    }
    var t = fringe[0];
    var m = masteryOf(mastery, t);
    var seen = state.sm2 && state.sm2[t];
    var kind = (!seen || m < 0.35) ? 'study' : 'quiz';
    return { kind: kind, topicId: t, item: tryGenMath(t) };
  }

  function tryGenMath(topicId) {
    try {
      if (GEN[topicId]) return genMath(topicId, Math.random);
    } catch (e) { /* non-math topics simply carry no generated item */ }
    return undefined;
  }

  /* ------------------------------------------------------------------ *
   * record(state, topicId, correct, difficulty) — practice update.
   * Mastery: streak-aware move (second consecutive correct moves further;
   * incorrect moves down). SM-2 schedules the next review:
   * correct -> ease +0.1, interval 1 -> 6 -> interval*ease days;
   * incorrect -> ease -0.2 (floor 1.3), interval resets to 1 day.
   * Five consecutive misses flags switchSuggested (ALEKS re-route rule).
   * Returns the updated state.
   * ------------------------------------------------------------------ */
  function record(state, topicId, correct, difficulty) {
    state = state || {};
    state.mastery = state.mastery || {};
    state.sm2 = state.sm2 || {};
    if (!topicId) return state;
    var d = clamp01(typeof difficulty === 'number' ? difficulty : 0.5);
    var m = masteryOf(state.mastery, topicId);
    var rec = state.sm2[topicId] || { interval: 0, ease: 2.5, due: 0, reps: 0, streak: 0, misses: 0 };

    if (correct) {
      var streakBonus = rec.streak >= 1 ? 0.08 : 0; // 2nd consecutive correct: extra credit
      m = m + (1 - m) * (0.28 * (0.5 + 0.5 * d) + streakBonus);
      rec.streak += 1; rec.misses = 0; rec.reps += 1;
      rec.ease = Math.min(2.5, rec.ease + 0.1);
      rec.interval = rec.reps === 1 ? 1 : (rec.reps === 2 ? 6 : Math.max(1, Math.round(rec.interval * rec.ease)));
    } else {
      m = m - m * (0.35 * (0.5 + 0.5 * d));
      rec.streak = 0; rec.misses += 1; rec.reps = 0;
      rec.ease = Math.max(1.3, rec.ease - 0.2);
      rec.interval = 1;
    }
    rec.due = Date.now() + rec.interval * DAY_MS;
    state.mastery[topicId] = clamp01(m);
    state.sm2[topicId] = rec;
    state.switchSuggested = rec.misses >= 5;

    // Bounded telemetry log (calibration instrument, newest last).
    state.log = state.log || [];
    state.log.push({ t: Date.now(), topic: topicId, correct: !!correct, difficulty: d });
    if (state.log.length > 200) state.log = state.log.slice(-200);
    return state;
  }

  /* ------------------------------------------------------------------ *
   * dueReviews(state) — spaced-repetition queue: topics whose SM-2 due
   * timestamp has passed, oldest due first.
   * ------------------------------------------------------------------ */
  function dueReviews(state) {
    state = state || {};
    var sm2 = state.sm2 || {};
    var now = Date.now();
    var due = [];
    for (var t in sm2) {
      if (sm2[t] && typeof sm2[t].due === 'number' && sm2[t].due <= now) {
        due.push({ topic: t, due: sm2[t].due });
      }
    }
    due.sort(function (a, b) { return a.due - b.due; });
    return due.map(function (e) { return e.topic; });
  }

  /* ------------------------------------------------------------------ *
   * gate(state, pathId) — passed when every path topic (state.topics)
   * reaches the mastery threshold. score = mean mastery.
   * ------------------------------------------------------------------ */
  function gate(state, pathId) {
    state = state || {};
    var topics = state.topics || [];
    var mastery = state.mastery || {};
    var below = [];
    var sum = 0;
    for (var i = 0; i < topics.length; i++) {
      var t = topics[i];
      var m = masteryOf(mastery, t);
      sum += m;
      if (m < GATE_SCORE) below.push(t);
    }
    var score = topics.length > 0 ? sum / topics.length : 0;
    return { passed: topics.length > 0 && below.length === 0, score: score, fringe: below };
  }

  /* ------------------------------------------------------------------ *
   * timed(assessment) — timed assessment controller.
   * assessment: {items:[{q, choices, answer, topic?}], minutes}.
   * Timer is timestamp-based (Date.now), robust to tab sleep.
   * passed = score >= 0.7. perTopic aggregates {correct,total,score}.
   * ------------------------------------------------------------------ */
  function timed(assessment) {
    var items = (assessment && assessment.items) || [];
    var totalMs = Math.max(0, ((assessment && assessment.minutes) || 0) * 60000);
    var deadline = Date.now() + totalMs;
    var sel = new Array(items.length).fill(null);
    var submitted = false;
    var cached = null;
    function expired() { return Date.now() >= deadline; }
    return {
      total: items.length,
      remainingSec: function () {
        return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      },
      remaining: function () { return this.remainingSec(); }, // legacy alias
      answer: function (i, choiceIdx) {
        if (submitted || expired()) return false;
        if (!Number.isInteger(i) || i < 0 || i >= items.length) return false;
        sel[i] = choiceIdx;
        return true;
      },
      submit: function () {
        if (cached) return cached;
        var correct = 0;
        var perTopic = {};
        for (var i = 0; i < items.length; i++) {
          var tp = items[i].topic || 'general';
          if (!perTopic[tp]) perTopic[tp] = { correct: 0, total: 0 };
          perTopic[tp].total++;
          if (sel[i] === items[i].answer) { correct++; perTopic[tp].correct++; }
        }
        for (var k in perTopic) {
          perTopic[k].score = perTopic[k].total ? perTopic[k].correct / perTopic[k].total : 0;
        }
        var total = items.length;
        var score = total ? correct / total : 0;
        cached = { score: score, correct: correct, total: total,
                   passed: score >= TIMED_PASS, perTopic: perTopic };
        submitted = true;
        return cached;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * Persistence: localStorage 'il_adaptive_v1' (guarded for non-browser).
   * One store holds learner sessions, goals, and memory.
   * ------------------------------------------------------------------ */
  var store = { goals: [], memory: {}, sessions: {} };
  var goalSeq = 0;

  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* storage unavailable: stay in-memory */ }
    return null;
  }
  function save() {
    var s = getStorage();
    if (!s) return false;
    try { s.setItem(STORE_KEY, JSON.stringify(store)); return true; }
    catch (e) { return false; }
  }
  function load() {
    var s = getStorage();
    if (s) {
      try {
        var raw = s.getItem(STORE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          store = {
            goals: Array.isArray(parsed.goals) ? parsed.goals : [],
            memory: (parsed.memory && typeof parsed.memory === 'object') ? parsed.memory : {},
            sessions: (parsed.sessions && typeof parsed.sessions === 'object') ? parsed.sessions : {}
          };
        }
      } catch (e) { /* corrupted store: keep current in-memory state */ }
    }
    return store;
  }

  /* Learner goals + memory (persisted in the same store). */
  function setGoal(text) {
    goalSeq++;
    var g = { id: 'g' + Date.now().toString(36) + goalSeq.toString(36),
              text: String(text), done: false, created: Date.now() };
    store.goals.push(g);
    save();
    return g;
  }
  function listGoals() { return store.goals.slice(); }
  function toggleGoal(id) {
    for (var i = 0; i < store.goals.length; i++) {
      if (store.goals[i].id === id) {
        store.goals[i].done = !store.goals[i].done;
        save();
        return store.goals[i];
      }
    }
    return null;
  }
  function noteMemory(key, value) { store.memory[String(key)] = value; save(); return true; }
  function getMemory(key) { return store.memory[String(key)]; }

  /* =====================================================================
   * genMath(topicId, rand) — parameterized question generators.
   * Each returns {q, choices[4], answer, explain, topic}.
   * Every generator randomizes coefficients and builds 3 plausible
   * distractors from common error patterns (sign slips, order-of-operations
   * errors, place-value errors, direction flips). All answers are computed,
   * never guessed — each formula is verified in adaptive.selftest.mjs.
   * rand: function returning [0,1); defaults to Math.random.
   * ===================================================================== */
  function genWholeNumbers(rand) {
    var a = ri(rand, 3, 9), b = ri(rand, 3, 9), c = ri(rand, 3, 9);
    var correct = a + b * c;
    var q = 'Compute: ' + a + ' + ' + b + ' * ' + c + '.';
    var fin = finalizeChoices(String(correct),
      [String((a + b) * c), String(a * b + c), String(a + b + c), String(b * c - a)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Multiplication before addition: ' + b + ' * ' + c + ' = ' + (b * c) +
               ', then ' + a + ' + ' + (b * c) + ' = ' + correct + '.',
      topic: 'whole-numbers' };
  }

  function genFractions(rand) {
    var b = ri(rand, 2, 9), d = ri(rand, 2, 9);
    var a = ri(rand, 1, b - 1), c = ri(rand, 1, d - 1);
    var num = a * d + c * b, den = b * d;
    var correct = fracStr(num, den);
    var q = 'Compute: ' + a + '/' + b + ' + ' + c + '/' + d + '.';
    var fin = finalizeChoices(correct,
      [fracStr(a + c, b + d), fracStr(a + c, b * d), fracStr(num, b + d)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Common denominator ' + den + ': ' + a + '/' + b + ' = ' + (a * d) + '/' + den +
               ', ' + c + '/' + d + ' = ' + (c * b) + '/' + den +
               '; sum = ' + num + '/' + den + ' = ' + correct + '.',
      topic: 'fractions' };
  }

  function genDecimals(rand) {
    var X = ri(rand, 11, 99), Y = ri(rand, 11, 99);
    var xs = String(X / 100), ys = String(Y / 100);
    var prod = X * Y;
    var correct = decStr(prod, 4);
    var q = 'Compute: ' + xs + ' * ' + ys + '.';
    var fin = finalizeChoices(correct,
      [decStr(prod, 3), decStr(prod, 2), decStr(prod, 5)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Multiply as whole numbers: ' + X + ' * ' + Y + ' = ' + prod +
               '; two decimal places in each factor means four in the product: ' + correct + '.',
      topic: 'decimals' };
  }

  function genPercents(rand) {
    var p = pickR(rand, [5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
    var n = ri(rand, 2, 20) * (100 / gcd(p, 100)); // n chosen so p% of n is whole
    var correct = (p * n) / 100;
    var q = 'What is ' + p + '% of ' + n + '?';
    var cands = [];
    if (Number.isInteger((p * n) / 10)) cands.push(String((p * n) / 10));
    if (Number.isInteger(((100 - p) * n) / 100)) cands.push(String(((100 - p) * n) / 100));
    cands.push(String(correct * 2));
    if (correct % 2 === 0) cands.push(String(correct / 2));
    cands.push(String(correct + 10));
    var fin = finalizeChoices(String(correct), cands, rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: p + '% means ' + p + '/100, so (' + p + ' * ' + n + ') / 100 = ' + correct + '.',
      topic: 'percents' };
  }

  function genLinearEquations(rand) {
    var x0 = ri(rand, -9, 9);
    var a = ri(rand, 2, 9);
    if (rand() < 0.35) a = -a;
    var b = ri(rand, -20, 20) || 7; // avoid 0 for clean formatting
    var c = a * x0 + b;
    var q = 'Solve for x: ' + a + 'x ' + (b >= 0 ? '+' : '-') + ' ' + Math.abs(b) + ' = ' + c + '.';
    var cands = [String(x0 + 1), String(x0 - 1), String(x0 + 2), String(-x0)];
    if (Number.isInteger((c + b) / a)) cands.push(String((c + b) / a)); // sign-slip error
    var fin = finalizeChoices(String(x0), cands, rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Isolate x: ' + (b >= 0 ? 'subtract ' + b : 'add ' + (-b)) + ' from both sides, then divide by ' + a +
               ': x = ' + (c - b) + ' / ' + a + ' = ' + x0 + '.',
      topic: 'linear-equations' };
  }

  function genInequalities(rand) {
    var x0 = ri(rand, -6, 6);
    var a = ri(rand, 2, 9);
    if (rand() < 0.5) a = -a;
    var b = ri(rand, -15, 15) || 5;
    var op = a > 0 ? '>' : '<'; // chosen so the solution is x > x0 (a>0) or x < x0 (a<0)
    var c = a * x0 + b;
    var q = 'Solve for x: ' + a + 'x ' + (b >= 0 ? '+' : '-') + ' ' + Math.abs(b) + ' ' + op + ' ' + c + '.';
    var flip = op === '>' ? '<' : '>';
    // Verify: op '>' with a>0 -> x > x0; op '<' with a<0 -> x > x0 after flip.
    var dir = (op === '>') !== (a < 0) ? '>' : '<';
    var correct = 'x ' + dir + ' ' + x0;
    var fin = finalizeChoices(correct,
      ['x ' + flip + ' ' + x0, 'x ' + dir + ' ' + (x0 + 1), 'x ' + flip + ' ' + (x0 - 1),
       'x ' + dir + ' ' + (-x0), 'x ' + dir + ' ' + (x0 + 2)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Isolate x: ' + a + 'x ' + op + ' ' + (c - b) +
               (a < 0 ? '; dividing by a negative flips the inequality' : '') +
               ', so x ' + dir + ' ' + x0 + '.',
      topic: 'inequalities' };
  }

  function genSystems(rand) {
    var x0, y0, a1, b1, a2, b2, det, guard = 0;
    do {
      x0 = ri(rand, -6, 6); y0 = ri(rand, -6, 6);
      a1 = ri(rand, 1, 5) * (rand() < 0.5 ? -1 : 1);
      b1 = ri(rand, 1, 5) * (rand() < 0.5 ? -1 : 1);
      a2 = ri(rand, 1, 5) * (rand() < 0.5 ? -1 : 1);
      b2 = ri(rand, 1, 5) * (rand() < 0.5 ? -1 : 1);
      det = a1 * b2 - a2 * b1;
      guard++;
    } while ((det === 0 || (x0 === 0 && y0 === 0)) && guard < 50);
    var c1 = a1 * x0 + b1 * y0, c2 = a2 * x0 + b2 * y0;
    function eq(a, b, c) {
      return a + 'x ' + (b >= 0 ? '+' : '-') + ' ' + Math.abs(b) + 'y = ' + c;
    }
    var q = 'Solve the system: ' + eq(a1, b1, c1) + '; ' + eq(a2, b2, c2) + '.';
    var correct = '(' + x0 + ', ' + y0 + ')';
    var fin = finalizeChoices(correct,
      ['(' + y0 + ', ' + x0 + ')', '(' + (x0 + 1) + ', ' + y0 + ')',
       '(' + (-x0) + ', ' + y0 + ')', '(' + x0 + ', ' + (y0 + 1) + ')',
       '(' + (x0 - 1) + ', ' + (y0 - 1) + ')'], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Substitute to check: the pair (' + x0 + ', ' + y0 + ') satisfies both equations: ' +
               c1 + ' = ' + c1 + ' and ' + c2 + ' = ' + c2 + '.',
      topic: 'systems' };
  }

  function genFunctions(rand) {
    var a = ri(rand, 1, 3), b = ri(rand, 1, 9), c = ri(rand, 1, 9);
    var x0 = ri(rand, -4, 4);
    var val = a * x0 * x0 + b * x0 + c;
    var q = 'Given f(x) = ' + a + 'x^2 + ' + b + 'x + ' + c + ', find f(' + x0 + ').';
    var fin = finalizeChoices(String(val),
      [String(a * x0 * x0 - b * x0 + c), String(a * x0 + b * x0 + c),
       String(val + a), String(val - a), String(val + 2 * x0)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'f(' + x0 + ') = ' + a + '*(' + x0 + ')^2 + ' + b + '*(' + x0 + ') + ' + c +
               ' = ' + (a * x0 * x0) + ' + ' + (b * x0) + ' + ' + c + ' = ' + val + '.',
      topic: 'functions' };
  }

  function genTrig(rand) {
    var table = [
      ['sin', 0, '0'], ['sin', 30, '1/2'], ['sin', 45, '√2/2'],
      ['sin', 60, '√3/2'], ['sin', 90, '1'],
      ['cos', 0, '1'], ['cos', 30, '√3/2'], ['cos', 45, '√2/2'],
      ['cos', 60, '1/2'], ['cos', 90, '0'],
      ['tan', 0, '0'], ['tan', 30, '√3/3'], ['tan', 45, '1'], ['tan', 60, '√3']
    ];
    var entry = pickR(rand, table);
    var fn = entry[0], deg = entry[1], correct = entry[2];
    var values = ['0', '1/2', '√2/2', '√3/2', '1', '√3/3', '√3'];
    var cands = values.filter(function (v) { return v !== correct; });
    shuffle(rand, cands);
    var fin = finalizeChoices(correct, cands.slice(0, 3), rand);
    var q = 'Evaluate ' + fn + '(' + deg + ' degrees).';
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Special angle: ' + fn + '(' + deg + ' degrees) = ' + correct +
               ' (from the 30-60-90 / 45-45-90 reference triangles).',
      topic: 'trig' };
  }

  function genUnits(rand) {
    var conv = [
      ['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10],
      ['kg', 'g', 1000], ['g', 'mg', 1000], ['L', 'mL', 1000],
      ['m', 'km', 1 / 1000], ['hr', 'min', 60], ['min', 'sec', 60]
    ];
    var e = pickR(rand, conv);
    var from = e[0], to = e[1], f = e[2];
    var v, vStr;
    if (f === 1 / 1000) { v = ri(rand, 1, 9000); vStr = String(v); }
    else if (f === 60) { v = ri(rand, 1, 12); vStr = String(v); }
    else { v = ri(rand, 1, 90) / 10; vStr = String(v); }
    function numStr(x) {
      if (Number.isInteger(x)) return String(x);
      var s = x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
    var correct = numStr(v * f);
    var q = 'Convert ' + vStr + ' ' + from + ' to ' + to + '.';
    var fin = finalizeChoices(correct,
      [numStr(v * f / 10), numStr(v * f * 10), numStr(v / f)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: '1 ' + from + ' = ' + (f >= 1 ? f : '1/' + Math.round(1 / f)) + ' ' + to +
               ', so ' + vStr + ' ' + from + ' = ' + correct + ' ' + to + '.',
      topic: 'units-measurement' };
  }

  function genExponents(rand) {
    var b = ri(rand, 2, 5), m = ri(rand, 2, 5), n = ri(rand, 2, 5);
    var correct = b + '^' + (m + n);
    var q = 'Simplify ' + b + '^' + m + ' * ' + b + '^' + n + '.';
    var fin = finalizeChoices(correct,
      [b + '^' + (m * n), b + '^' + (m + n + 1), (b + 1) + '^' + (m + n),
       b + '^' + Math.abs(m - n), b + '^' + (m + n + 2)], rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Same base: multiply by adding exponents. ' + m + ' + ' + n + ' = ' + (m + n) +
               ', so the result is ' + correct + '.',
      topic: 'exponents' };
  }

  function genBasicStats(rand) {
    var cnt = ri(rand, 4, 6), M = ri(rand, 3, 15);
    var arr = [], sum = 0, guard = 0, last;
    do {
      arr = []; sum = 0;
      for (var i = 0; i < cnt - 1; i++) {
        var v = Math.max(1, M + ri(rand, -5, 5));
        arr.push(v); sum += v;
      }
      last = M * cnt - sum;
      guard++;
    } while ((last < 1 || last > 40) && guard < 50);
    arr.push(last);
    shuffle(rand, arr);
    var q = 'Find the mean of: ' + arr.join(', ') + '.';
    var cands = [String(M + 1), String(M - 1), String(M + 2), String(M - 2)];
    var fin = finalizeChoices(String(M), cands, rand);
    return { q: q, choices: fin.choices, answer: fin.answer,
      explain: 'Mean = sum / count = ' + (M * cnt) + ' / ' + cnt + ' = ' + M + '.',
      topic: 'basic-stats' };
  }

  var GEN = {
    'whole-numbers': genWholeNumbers,
    'fractions': genFractions,
    'decimals': genDecimals,
    'percents': genPercents,
    'linear-equations': genLinearEquations,
    'inequalities': genInequalities,
    'systems': genSystems,
    'functions': genFunctions,
    'trig': genTrig,
    'units-measurement': genUnits,
    'exponents': genExponents,
    'basic-stats': genBasicStats
  };

  function genMath(topicId, rand) {
    var fn = GEN[topicId];
    if (!fn) throw new Error('adaptive.genMath: unknown topic "' + topicId + '"');
    var r = (typeof rand === 'function') ? rand : Math.random;
    return fn(r);
  }

  /* ------------------------------------------------------------------ *
   * Public surface
   * ------------------------------------------------------------------ */
  if (typeof window === 'undefined') { window = {}; } // guarded for non-browser envs
  window.IL = window.IL || {};
  window.IL.adaptive = {
    place: place,
    next: next,
    record: record,
    dueReviews: dueReviews,
    gate: gate,
    timed: timed,
    save: save,
    load: load,
    setGoal: setGoal,
    listGoals: listGoals,
    toggleGoal: toggleGoal,
    noteMemory: noteMemory,
    getMemory: getMemory,
    genMath: genMath
  };
})();
