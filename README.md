# Interstitium Labs Learning University

The static, self-paced learning platform of [Interstitium Labs](https://interstitiumlabs.dev), deployed at **[learn.interstitiumlabs.dev](https://learn.interstitiumlabs.dev)**.

No build step and no server: plain HTML/CSS/JS served as Cloudflare Workers Assets, with a small Worker (`worker.js`) in front. Learning is adaptive and local-first — progress and mastery live in the learner's browser (localStorage), and the Noah tutor is Socratic by design: wrong answers get Socratic tips, never an answer dump first.

## How learning works

The adaptive loop is **Place → Fringe → Gate → Deepen**:

1. **Place** — a short diagnostic locates the learner's current level in a path.
2. **Fringe** — study sits just past that level, at the edge of what they can do.
3. **Gate** — a checkpoint verifies the concept before the path advances.
4. **Deepen** — mastered material recurs through review until it holds.

One canonical node per concept: the catalog dedupes globally, so a concept is taught once, in one place, and referenced everywhere else.

## Catalog

The catalog is data-driven (`data/catalog/` shards + `data/catalog.json`, with `data/sources.json` and `data/dedupe-matrix.json`). The build contract's validator (`scripts/validate.mjs`) checks the shipped catalog: **11 academies, 65 paths, 349 modules, 8 timed assessments** — every path has at least one module, every module at least one source with a real URL, and every assessment at least 10 items with an answer key and explanation.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: academies and paths preview, Noah teaser |
| `paths.html` | Filterable catalog of all paths (role / skill / cert / time) |
| `academy.html?id=IL-02` | Dynamic academy page |
| `path.html?id=<path-id>` | A path: modules, sources, assessments, "Start a sitting" |
| `learn.html?id=<path-id>` | The adaptive sitting (Place → Fringe → Gate → Deepen) |
| `assess.html` | Assessment center: timed simulations (`?a=<id>`) |
| `courses.html` | My Enrolled Courses: import a study history, dedupe, track |
| `enroll.html` | Tiers and enrollment |
| `honesty.html` | Transparency ledger: what is real, what is offline, what is coming — dated |
| `about.html` | Founder, "Student Zero", and the method |

## Code layout

- `js/app.js` — shared shell: navigation/footer rendering, catalog loader, helpers
- `js/adaptive.js` — the adaptive engine (`window.IL.adaptive`)
- `js/noah.js` — the Noah tutor (`window.IL.noah`); knowledge base in `data/noah-knowledge.md`
- `js/hero.js` — home-page canvas visual
- `css/il.css` — design tokens and all styles
- `worker.js` + `wrangler.jsonc` — Cloudflare Worker and Workers Assets config (KV binding `NOAH_STATS`, Workers AI binding)
- `scripts/` — validation and brand checks (below)
- `CONTRACT.md` — the build contract this site is held to; `DEPLOY.md` — the deploy runbook

## Run locally

It is a static site — serve the repository root with any static file server:

```bash
python3 -m http.server 8080
# or, with the Worker in the loop:
npx wrangler dev
```

Then open `http://localhost:8080` (or the Wrangler URL).

## Pre-deploy checks

From the repository root (see `DEPLOY.md` for the full checklist):

```bash
node scripts/validate.mjs          # catalog schema, dedupe, links — must exit 0
node js/adaptive.selftest.mjs      # adaptive engine self-test — must print ALL TESTS PASSED
node --check js/app.js && node --check js/hero.js && node --check js/noah.js && node scripts/brand-check.mjs
```

Deploy is a Wrangler publish of the repository root as Workers Assets (worker name `interstitium-labs-university`).

## License

Copyright (c) 2026 Enmanuel D. Mejia / Interstitium Labs. All rights reserved — see [LICENSE](LICENSE).
