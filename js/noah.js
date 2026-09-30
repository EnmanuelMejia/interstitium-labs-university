/* =====================================================================
 * Interstitium Labs — Noah, the Socratic tutor (js/noah.js)
 *
 * Doctrine: "Wrong answers get Socratic tips — never an answer dump first."
 * "Bring Noah your hypothesis — not 'just give me the answer.'"
 *
 * ask(text, ctx) -> {reply, nudges[]}
 *  - Detects the topic from keyword tables (algebra, trigonometry,
 *    calculus, networking, linux, security, python, sql, git,
 *    containers, cloud; falls back to general reasoning).
 *  - Acknowledges the learner's hypothesis, asks ONE guiding question,
 *    and returns a two-step hint ladder (nudges). The literal answer is
 *    never stated first — not in the reply, not in the nudges.
 *  - If the learner demands the answer outright ("just give me the
 *    answer"), Noah refuses gently, in voice, and offers the next
 *    smallest step instead.
 *
 * Voice: measured, precise, Latin sparingly, no hype, no emojis.
 * Fully local by default. See configureLLM for the optional upgrade hook.
 *
 * Public surface: window.IL.noah = { ask, configureLLM }
 * ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Topic keyword tables. Order matters: first match wins.
   * ------------------------------------------------------------------ */
  var TOPICS = [
    { name: 'algebra',
      keys: ['equation', 'solve for', 'quadratic', 'polynomial', 'variable',
             'factor', 'algebra', 'linear', 'inequality', 'fraction', 'exponent'] },
    { name: 'trigonometry',
      keys: ['trigonometry', 'triangle', 'hypotenuse', 'unit circle',
             ' sin', ' cos', ' tan', 'sine', 'cosine', 'tangent', 'angle'] },
    { name: 'calculus',
      keys: ['derivative', 'integral', 'calculus', 'differentiate',
             'integrate', 'limit'] },
    { name: 'networking',
      keys: ['subnet', 'cidr', 'tcp', 'ip address', 'dns', 'router',
             'switch', 'osi', 'packet', 'vlan', 'nat', 'network'] },
    { name: 'linux',
      keys: ['linux', 'bash', 'terminal', 'chmod', 'ssh', 'kernel',
             'systemd', 'grep', 'cron', 'shell', 'command line'] },
    { name: 'security',
      keys: ['vulnerability', 'exploit', 'encryption', 'malware', 'phishing',
             'firewall', 'penetration', 'ransomware', 'cve', 'security'] },
    { name: 'python',
      keys: ['python', 'list comprehension', 'pandas', 'def '] },
    { name: 'sql',
      keys: ['sql', 'select', 'join', 'where clause', 'database', 'query'] },
    { name: 'git',
      keys: ['git', 'commit', 'branch', 'merge', 'rebase', 'repository'] },
    { name: 'containers',
      keys: ['docker', 'container', 'kubernetes', 'pod', 'deployment'] },
    { name: 'cloud',
      keys: ['aws', 'azure', 'gcp', 'cloud', 'ec2'] }
  ];

  /* Guiding question + two-rung hint ladder per topic.
   * Constraint, enforced by construction and by self-test: no template
   * may contain the literal answer to a learner's question, so templates
   * never state worked solutions and never echo the learner's figures. */
  var GUIDE = {
    'algebra': {
      question: 'What is the smallest piece of this equation you can isolate with certainty?',
      nudge1: 'Move the constant term across the equals sign. What must change about its sign as it crosses?',
      nudge2: 'With the term in the unknown standing alone, which single operation undoes its coefficient?'
    },
    'trigonometry': {
      question: 'Before naming a ratio, which side of the triangle do you actually know, and which side are you asked to find?',
      nudge1: 'Label the sides relative to the given angle: opposite, adjacent, hypotenuse. Which two appear in your problem?',
      nudge2: 'Write the ratio that binds exactly those two sides. The function name follows the ratio, not the other way around.'
    },
    'calculus': {
      question: 'Are you being asked about a rate of change, or about accumulation? The two questions wear different tools.',
      nudge1: 'State in plain words what the symbol is asking for, before you reach for any rule.',
      nudge2: 'Apply one rule only — the outermost structure first. What does the outer form resemble?'
    },
    'networking': {
      question: 'Which layer of the problem are you actually on — addressing, routing, or naming? Name it before you touch anything.',
      nudge1: 'Write down what the address and the mask, together, actually claim about the network.',
      nudge2: 'Follow one packet in your mind from source to destination. Where does your current explanation first break?'
    },
    'linux': {
      question: 'What did you expect the command to do, stated as plainly as you can, before we look at what it did?',
      nudge1: 'Read the manual entry for the single flag you are least sure about. What does it promise?',
      nudge2: 'Reproduce the behavior with the smallest possible input. What changes when the input shrinks?'
    },
    'security': {
      question: 'Who is the actor, what is the asset, and where is the boundary between them? State all three.',
      nudge1: 'Describe the attack in one sentence with no jargon. If you cannot, the model is not yet clear.',
      nudge2: 'Which single control, if removed, would make the attack trivial? That is where the real weakness lives.'
    },
    'python': {
      question: 'What type is the object at the exact point where your reasoning gets uncertain?',
      nudge1: 'Print the object and its type at that point. What does the interpreter report, versus what you assumed?',
      nudge2: 'Reduce the code to the smallest fragment that still shows the behavior. What remains?'
    },
    'sql': {
      question: 'Which rows must survive, and which must be excluded? State the filter as a sentence before writing it.',
      nudge1: 'Name the grain of the result: one row per what? Every join and grouping must serve that grain.',
      nudge2: 'Run the query without the final filter. Do the intermediate rows match what you expected?'
    },
    'git': {
      question: 'Draw the branch graph as it is right now, from memory. Where does your drawing go vague?',
      nudge1: 'Which commit is each branch actually pointing at? Name them; do not trust the labels alone.',
      nudge2: 'What would the graph look like after the operation succeeds? Describe the desired end state first.'
    },
    'containers': {
      question: 'Is the failure in the image, the container, or the orchestration around it? Place it before fixing it.',
      nudge1: 'Read the exact error line, not the summary. Which component speaks first in the log?',
      nudge2: 'What is the smallest change that would prove your theory wrong? Try that before trying to prove it right.'
    },
    'cloud': {
      question: 'Which service owns the resource, and which identity is acting on it? Confusion between the two causes most cloud errors.',
      nudge1: 'Check the effective permissions of the acting identity, not the ones you believe it has.',
      nudge2: 'Trace one request through the console or the logs. Where does the observed path diverge from your mental model?'
    },
    'general': {
      question: 'What is the single claim you are least sure of in your own reasoning? Begin there.',
      nudge1: 'Restate the problem in your own words, with no terms you could not define to a beginner.',
      nudge2: 'What would you need to observe to know your hypothesis is wrong? Seek that observation first. Festina lente.'
    }
  };

  /* ------------------------------------------------------------------ *
   * Optional LLM upgrade hook.
   *
   * configureLLM({endpoint, apiKey, model}) records a remote endpoint.
   * The default path stays FULLY LOCAL: ask() performs no network calls
   * in this build. When a config is present, ask() appends a short notice
   * that a remote endpoint is configured and that routing outward would be
   * a separate, explicit, user-confirmed step — a future build may
   * implement opt-in routing at the marked point below.
   *
   * The apiKey is held in module memory only. It is never logged,
   * never rendered into a reply, and never persisted.
   * ------------------------------------------------------------------ */
  var llmConfig = null;
  function configureLLM(opts) {
    if (!opts || !opts.endpoint) { llmConfig = null; return null; }
    llmConfig = {
      endpoint: String(opts.endpoint),
      apiKey: opts.apiKey ? String(opts.apiKey) : null,
      model: opts.model ? String(opts.model) : null
    };
    // Future opt-in routing point: only ever call llmConfig.endpoint here,
    // behind an explicit user confirmation, and never with the key in a URL.
    return { endpoint: llmConfig.endpoint, model: llmConfig.model, local: true };
  }

  /* ------------------------------------------------------------------ *
   * ask(text, ctx) -> {reply, nudges[]}
   * ------------------------------------------------------------------ */
  var DEMAND_RE = /just give me the answer|give me the answer|tell me the answer|answer (this|it) for me|do (this|it) for me/i;
  var HYP_RES = [
    /i think ([^.!?\n]{1,140})/i,
    /my (?:answer|guess|hypothesis) is ([^.!?\n]{1,140})/i
  ];

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
      // Gentle refusal, in voice: never an answer dump first.
      reply = 'I will not hand you the answer outright. This is not reluctance — ' +
        'an unearned answer does not hold, and the sitting is the work. ' +
        'Bring Noah your hypothesis, not a request for the ending. ' +
        'Your hypothesis is registered; I have set its figures aside so that we ' +
        'reason rather than recite. Take the next smallest step instead: ' +
        guide.question;
    } else {
      reply = 'Acknowledged. We are in the domain of ' + topic + '. ' +
        'Your hypothesis is registered' +
        (hasHypothesis
          ? '; I have set its figures aside so that we reason rather than recite.'
          : ', though none is stated yet — bring it plainly when you are ready.') +
        ' Consider this first: ' + guide.question;
    }

    // FUTURE OPT-IN ROUTING POINT (see configureLLM): when llmConfig is set,
    // a future build may route here — only with explicit user confirmation.
    if (llmConfig) {
      reply += ' Note: a remote endpoint is configured' +
        (llmConfig.model ? ' (model ' + llmConfig.model + ')' : '') +
        '; this reply was still produced by the local engine. Routing outward ' +
        'is a separate, explicit step.';
    }

    return { reply: reply, nudges: [guide.nudge1, guide.nudge2] };
  }

  /* ------------------------------------------------------------------ *
   * Public surface
   * ------------------------------------------------------------------ */
  if (typeof window === 'undefined') { window = {}; } // guarded for non-browser envs
  window.IL = window.IL || {};
  window.IL.noah = {
    ask: ask,
    configureLLM: configureLLM
  };
})();
