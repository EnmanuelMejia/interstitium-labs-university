# BUILD CONTRACT — Interstitium Labs learning university (static production build)
Target dir: `/home/hatch/workspace/goals/interstitium-labs-learning-university-build/build/`
Deploy target: Cloudflare Workers Assets (static, no build step, no server). `wrangler.jsonc` with `assets.directory: ./` at build root.

## Non-negotiable identity (from research/theme-spirit.md)
- Voice: "Knowledge operating system", "The connective tissue of knowledge.", "A plant, not a video LMS.", Latin seal SCIENTIA OMNIA VINCIT, quatrain Quaerere · Intelligere · Liberare · Transcendere.
- Design tokens: gold = nucleus (accent only), cyan = signal (interactive only). Dark hermetic treatise, aurora backdrop, breathing sigil, esoteric-plate motifs. NO SaaS-purple-gradient rebrand, no emoji, no hype copy.
- Honesty as feature: "No fake API keys.", "we do not fake a fleet.", checkout offline on purpose until Payment Links live, "Orchestrate, don't clone" (route to official vendor portals, never clone their content), "Not a photocopy of anyone's PDF." Every button works or is not rendered.
- Noah tutor: Socratic ("Wrong answers get Socratic tips — never an answer dump first.", "Bring Noah your hypothesis"), educational Interstitium agent, local-first.
- Adaptive loop mantra: **Place → Fringe → Gate → Deepen.** Mastery in localStorage. Global rule: **no duplicated courses** — one canonical node per concept.

## File layout (exact)
```
build/
  index.html        # hero (AI Pantheon terminal storm) + academies + paths preview + Noah teaser
  paths.html        # filterable catalog of all paths (role/skill/cert/time filters)
  academy.html?id=IL-02      # dynamic academy page
  path.html?id=<path-id>     # dynamic path page: modules, sources, assessments, "Start a sitting"
  learn.html?id=<path-id>     # adaptive sitting: Place → Fringe → Gate → Deepen
  assess.html                # assessment center: timed simulations list + runner (?a=<id>)
  courses.html               # My Enrolled Courses: import flow (paste history → dedupe → track)
  enroll.html                # tiers + payment rails (honest offline-on-purpose framing)
  honesty.html               # transparency ledger: what's real, what's offline, what's coming, dated
  about.html                 # founder / Student Zero / method
  css/il.css                 # design tokens + all styles
  js/app.js                  # shared: nav/footer render, catalog loader, helpers
  js/hero.js                 # AI Pantheon terminal-storm canvas
  js/adaptive.js             # adaptive engine -> window.IL.adaptive
  js/noah.js                 # Noah tutor -> window.IL.noah
  data/catalog/index.json      # shard manifest {"shards":[...]}
  data/catalog/shard-*.json    # academies + paths + modules + assessments + questions (sharded;
                               # each shard <100KB so GitHub MCP file pushes stay under the arg limit;
                               # app.js merges shards at load)
  data/dedupe-matrix.json    # dedupe artifact
  data/sources.json          # every direct source study resource, attributed
  assets/sigil.svg           # procedural IL sigil (original)
  manifest.webmanifest, sw.js, wrangler.jsonc
  scripts/validate.mjs       # node: schema + dedupe + internal-link validation
  DEPLOY.md                  # deploy checklist (written by QA)
```

## data/catalog.json schema
```json
{
 "academies":[{"code":"IL-01","name":"...","tagline":"...","hours":420,"blurb":"..."}],
 "paths":[{
   "id":"slug","academy":"IL-06","title":"...","subtitle":"...","type":"career|certification|foundations",
   "difficulty":"beginner|intermediate|advanced","hours":120,"status":"published",
   "tags":["soc","blue-team"],
   "modules":[{"id":"slug","title":"...","kind":"math|core|lab|exam_prep|career|capstone",
     "topics":["..."],
     "sources":[{"name":"TryHackMe","url":"https://...","note":"..."}],
     "il_provides":"..."}],
   "assessments":[{"id":"slug","title":"...","kind":"diagnostic|gate|timed",
     "questions":33,"minutes":46,
     "items":[{"q":"...","choices":["..."],"answer":0,"explain":"...","topic":"..."}]}]
 }]}
```
Rules: every module lists ≥1 source with a REAL url (official vendor/portal pages, learn.mongodb.com, ocw.mit.edu, portswigger.net, skillsprep.org, aleks.com, khanacademy.org, brilliant.org, pearson.com, etc.). `il_provides` describes what Interstitium itself adds (never vendor content cloned). ≥10 authored items per timed assessment; explanations required.

## data/dedupe-matrix.json
`[{"course":"...","sources":["..."],"decision":"kept|merged|dropped","reason":"...","canonical":"<path-id>/<module-id> or null"}]` — must cover every Rev 2 source; zero duplicates in catalog.

## data/sources.json
`[{"name":"...","url":"...","category":"...","description":"...","used_in":["<path-id>",...]}]` — every direct source study resource kept and linked.

## window.IL.adaptive (js/adaptive.js)
- `place(pathId, answers) -> {mastery:{topicId:0..1}, fringe:[topicId]}` — CAT-style diagnostic.
- `next(state) -> {kind:'study'|'quiz'|'review', topicId, item}` — ALEKS-style fringe sequencing (lowest-mastery ready topic whose prereqs are met).
- `record(state, topicId, correct, difficulty) -> state` — Bayesian-ish mastery update + SM-2 scheduling.
- `dueReviews(state) -> [topicId]` — spaced repetition.
- `gate(state, pathId) -> {passed:bool, score, fringe:[topicId]}`
- `timed(assessment) -> controller {remaining(), answer(i,choice), submit()->{score,passed}}`
- `save()/load()` — localStorage key `il_adaptive_v1`. `goals` + `memory` per-learner: `setGoal(text)`, `noteMemory(k,v)`.
- `genMath(topicId, rng) -> {q, choices, answer, explain}` — parameterized math variants (linear eq, fractions, trig, etc.).

## window.IL.noah (js/noah.js)
- `ask(text, ctx{pathId,topicId}) -> {reply, nudges[]}` — Socratic: acknowledges hypothesis, asks guiding question, offers hint ladder; NEVER dumps the answer first. Keyword/topic-aware via catalog.
- `configureLLM({endpoint, apiKey})` hook documented in code comments (optional upgrade path; default fully local).

## Hero (js/hero.js + index.html) — REVISED per user directive 2026-09-30 13:12 EDT, AMENDED per user directive 2026-09-30 ~14:06 EDT
- Big hero sigil RESTORED (founder order 2026-09-30 ~14:06 EDT supersedes the 13:12 removal): the first-iteration rotating-axis sigil (Blender render, 360px web-optimized `assets/sigil-hero-rotate.gif`, 36 frames, ~956KB; static `assets/sigil-hero-static.png` fallback under prefers-reduced-motion) floats centered over the battle canvas above the hero copy. Small sigil usages continue (nav mark, footer, favicon).
- Cinematic ANIME-STYLE animated battle: the "AI Pantheon battle" — AI entities fighting each other BY opening terminals and running commands. Terminal windows spawn recursively, command streams flood the frame, competing AIs visibly out-compute each other (per-entity ops counters, volley flares, name plates with ORIGINAL entity names).
- ORIGINAL procedural WebGL/canvas only (no liftable anime exists; copyrighted footage off-limits — also satisfies licensed/original-visuals rule). Dark cinematic grade, HDR-style glow, streaming terminal text, recursive terminal windows in parallax depth, particle/code-rain. Entities as original geometric constructs; gold/cyan discipline kept (gold nucleus accents vs cyan signals).
- Sound: WebAudio synth hooks, MUTED BY DEFAULT, opt-in toggle only (autoplay policy respected; toggle works or isn't rendered).
- Accessible fallback: prefers-reduced-motion + manual reduce-motion control → static cinematic keyframe + text summary of the scene.
- Performance: capped particles/commands, hardware-scaled, pause offscreen (IntersectionObserver), DPR ≤1.5, delta-clamped rAF, visible Skip control.

## Pages contract
- All pages: shared header/footer rendered by js/app.js into `#il-header`/`#il-footer`; skip link; `<html lang="en">`; meta description; responsive 320px→; keyboard navigable.
- courses.html import: textarea paste → extract URLs + titles → dedupe vs catalog (title similarity + URL match) → save `il_enrolled_v1` → render track with resume links. Empty state + instructions until import.
- enroll.html: tiers; rails listed honestly (Cards + Apple/Google Pay via Stripe Payment Links when live; PayPal; Venmo; crypto XMR/XRP/XLM via processor — mark each `live:false` except contact). CTA = `mailto:mejiaenmanueld@gmail.com` "Request enrollment". Honesty note: checkout offline on purpose.
- assess.html: lists all timed assessments from catalog; runner with countdown, per-question nav, submit → score → fringe update via IL.adaptive.

## Validation (scripts/validate.mjs, run by QA)
- catalog.json schema check; every path has ≥1 module; every module has ≥1 source with http url; every timed assessment has ≥10 items with answer index valid; dedupe-matrix covers all sources.json names; no duplicate (path,module) titles; internal page links resolve.
