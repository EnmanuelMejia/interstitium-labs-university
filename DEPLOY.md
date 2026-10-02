# DEPLOY.md — Interstitium Labs Learning University (static production build)

Production target: **Cloudflare Workers Assets** (pure static, no build step, no server).
Deploy root: repository root (or its equivalent prepared release directory) — `wrangler.jsonc` sets `assets.directory: "./"` and worker name
`interstitium-labs-university`.

## 0. Pre-deploy verification (do this every time)

From the repository root:

```bash
node scripts/validate.mjs          # CONTRACT validation: schema, dedupe, links — must exit 0
node js/adaptive.selftest.mjs      # adaptive engine: must print ALL TESTS PASSED (5279 assertions)
node --check js/app.js && node --check js/hero.js && node --check js/noah.js && node scripts/brand-check.mjs
```

All three must pass. `validate.mjs` checks: catalog schema (11 academies, 65 paths,
349 modules, 8 assessments), every path ≥1 module, every module ≥1 source with an
http(s) URL, every timed assessment ≥10 items with valid answer index + explanation,
dedupe-matrix covering all 70 sources.json names, no duplicate (path, module) titles,
every non-null canonical resolving to a real path/module id, and every internal
href/src resolving to a file in `build/`.

## 1. Deploy checklist

- [ ] `npx wrangler login` — authenticate the Cloudflare account that owns
      interstitiumlabs.dev. (First deploy only; the session persists.)
- [ ] `npx wrangler deploy` from `build/` — publishes the whole directory as static
      assets. Expected output: a `*.workers.dev` URL plus the custom-domain bindings.
- [ ] Smoke-test the live URL: `/`, `/paths.html`, `/assess.html?a=<id>`,
      `/learn.html?id=<path-id>`, `/enroll.html`. Confirm the catalog loads
      (no "Catalog offline" notice) and the PWA manifest resolves.
- [ ] Confirm `sw.js` registers (DevTools → Application → Service Workers) and the
      offline fallback serves `index.html` for navigations.

## 2. DNS — interstitiumlabs.dev + app subdomain

- In the Cloudflare dashboard for the interstitiumlabs.dev zone, add the Worker as a
  custom domain (Workers & Pages → the worker → Settings → Domains & Routes →
  Add Custom Domain). Cloudflare provisions the certificate automatically.
- Recommended mapping (founder decision; either is fine):
  - Keep apex `interstitiumlabs.dev` on the primary Interstitium Labs site.
  - Bind `learn.interstitiumlabs.dev` to this university worker; the primary site stays on the apex.
    marketing/portfolio site. If the apex serves something else, bind the university
    to the subdomain instead — no code change needed, the app uses relative URLs.
- `start_url` and `scope` in `manifest.webmanifest` are relative (`./`), so the PWA
  works under either mapping.

## 3. What still needs the founder (cannot be done by an agent)

1. **Domain DNS access** — adding the custom domain to the Worker and confirming
   the certificate issues. Needs his Cloudflare login / DNS control.
2. **Stripe Payment Links** — enrollments are offline-on-purpose until these exist.
   When live: create one Payment Link per tier (Tier I The Sitting, Tier II The
   University, Tier III Mentored), then wire them into `enroll.html` replacing the
   `mailto:` CTAs, and update `honesty.html` to mark cards live. Until then the
   honest copy ("checkout offline on purpose") stays.
3. **Optional dynamic backend** — Neon Postgres + OAuth (Cloudflare Access, Google,
   or GitHub) if/when cross-device mastery sync ships. The static build is complete
   without it; this is a future phase, not a launch blocker.
4. **Live-browser visual QA** (a subagent cannot do this): watch the hero AI Pantheon
   battle on a real screen, toggle **Reduce motion** and **Sound** (sound is synth,
   muted by default), click every `mailto:` CTA to confirm the mail client opens
   with the right subject, and run one full sitting + one timed assessment
   end-to-end in Chrome, Firefox, and Safari at 320px width.

## 4. Rollback

Static assets — there is no database migration and no server state. To roll back:
`npx wrangler rollback` (or redeploy the previous known-good `build/` snapshot).
The service worker is versioned (`il-university-v1`); bump the cache name in
`sw.js` on any deploy that changes cached shell files so clients pick up the new
shell instead of the stale one.

## 5. Known honest limitations (say these out loud)

- **No server-side auth — by design.** Mastery, fringe state, goals, and enrolled
  courses live in `localStorage` (`il_adaptive_v1`, `il_enrolled_v1`). They are
  per-browser, per-device. This is the local-first architecture, not a missing
  feature; cross-device sync waits on the optional backend in §3.
- **Payments offline on purpose.** Cards / Apple Pay / Google Pay / PayPal / Venmo /
  crypto rails are all marked not-live except the contact CTA. `enroll.html` says
  so plainly; nothing pretends to take money.
- **Hero audio is WebAudio synth, not Dolby.** Procedural tones, muted by default,
  opt-in toggle only. No recorded score, no spatial audio claims.
- **Noah is a local Socratic engine.** Keyword/topic-aware over the catalog, never
  an answer dump — but it is not a hosted LLM. The `configureLLM` hook is
  documented in code as an optional upgrade path.
- **Assessment integrity is self-administered.** Timed simulations run client-side;
  scores are honest self-measurement, not proctored credentials.
- **External links route to official vendor portals** (learn.mongodb.com,
  ocw.mit.edu, portswigger.net, …). We never clone their content — "Orchestrate,
  don't clone."

## 6. Post-deploy

- Re-run `node scripts/validate.mjs` against the deployed copy if anything was
  re-published, and log the deploy date + wrangler version on `honesty.html`'s
  dated ledger so the transparency record stays current.

## Cross-domain release gate

- Apex `https://interstitiumlabs.dev/` is the primary site. `https://www.interstitiumlabs.dev/` should redirect to it.
- `https://learn.interstitiumlabs.dev/` is the university Worker; never route apex traffic to the university Worker.
- Check `https://interstitiumlabs.dev/noah/` and `https://interstitiumlabs.dev/portfolio/` links from the university navigation.
- `main` branch updates do not prove the university Worker was deployed. Verify the authorized Wrangler/Cloudflare deployment and then validate the live hostname separately.
- Never modify DNS, certificate or zone routing until a current zone export, dependency inventory and rollback path have been reviewed.
