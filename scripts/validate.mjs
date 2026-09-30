#!/usr/bin/env node
/* Interstitium Labs learning university — build validator.
   Implements the "Validation" section of build/CONTRACT.md:
     1. catalog schema check (sharded)
     2. every path has >=1 module
     3. every module has >=1 source with an http(s) url
     4. every timed assessment has >=10 items, each with a valid answer
        index and an explanation
     5. dedupe-matrix covers every sources.json name
     6. no duplicate (path title, module title) pairs
     7. every non-null canonical resolves to a real path/module id
     8. internal page links resolve to real files in build/
   Exit 0 = all green. Exit 1 = errors listed on stderr.
   Usage: node scripts/validate.mjs  (run from build/ or anywhere) */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

function fail(msg) { errors.push(msg); }
function note(msg) { notes.push(msg); }

function readJson(rel) {
  const p = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`FATAL: cannot read/parse ${rel}: ${e.message}`);
    return null;
  }
}

/* ---------- helpers ---------- */
function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }
function isHttpUrl(v) { return typeof v === 'string' && /^https?:\/\//i.test(v.trim()); }

function check(cond, msg) { if (!cond) fail(msg); }

/* ---------- 1. catalog schema (sharded: data/catalog/index.json + shards) ---------- */
const manifest = readJson('data/catalog/index.json');
const catalog = { academies: [], paths: [] };
if (manifest && Array.isArray(manifest.shards)) {
  for (const s of manifest.shards) {
    const part = readJson('data/catalog/' + s) || {};
    if (Array.isArray(part.academies)) catalog.academies.push(...part.academies);
    if (Array.isArray(part.paths)) catalog.paths.push(...part.paths);
  }
} else {
  fail('FATAL: data/catalog/index.json missing or has no shards array');
}
if (catalog) {
  check(catalog && typeof catalog === 'object', 'merged catalog is not an object');
  check(Array.isArray(catalog.academies), 'merged catalog: "academies" must be an array');
  check(Array.isArray(catalog.paths), 'merged catalog: "paths" must be an array');

  const academyCodes = new Set();
  (catalog.academies || []).forEach((a, i) => {
    check(isNonEmptyString(a.code), `academy[${i}]: missing code`);
    check(isNonEmptyString(a.name), `academy[${i}] (${a.code}): missing name`);
    check(isNonEmptyString(a.tagline), `academy[${i}] (${a.code}): missing tagline`);
    check(isNonEmptyString(a.blurb), `academy[${i}] (${a.code}): missing blurb`);
    check(Number.isFinite(Number(a.hours)) && Number(a.hours) >= 0,
      `academy[${i}] (${a.code}): hours must be a non-negative number`);
    if (a.code) {
      if (academyCodes.has(a.code)) fail(`duplicate academy code: ${a.code}`);
      academyCodes.add(a.code);
    }
  });

  const pathIds = new Set();
  const moduleIndex = new Map(); // "pathId/moduleId" -> module

  (catalog.paths || []).forEach((p, pi) => {
    const pid = p.id || `<path[${pi}]>`;
    check(isNonEmptyString(p.id), `path[${pi}]: missing id`);
    check(isNonEmptyString(p.title), `path ${pid}: missing title`);
    check(isNonEmptyString(p.subtitle), `path ${pid}: missing subtitle`);
    check(['career', 'certification', 'foundations'].includes(p.type),
      `path ${pid}: type must be career|certification|foundations (got ${JSON.stringify(p.type)})`);
    check(['beginner', 'intermediate', 'advanced'].includes(p.difficulty),
      `path ${pid}: difficulty must be beginner|intermediate|advanced (got ${JSON.stringify(p.difficulty)})`);
    check(Number.isFinite(Number(p.hours)) && Number(p.hours) > 0,
      `path ${pid}: hours must be a positive number`);
    check(isNonEmptyString(p.status), `path ${pid}: missing status`);
    check(academyCodes.has(p.academy),
      `path ${pid}: academy ${JSON.stringify(p.academy)} is not a known academy code`);
    check(Array.isArray(p.tags), `path ${pid}: tags must be an array`);
    if (p.id) {
      if (pathIds.has(p.id)) fail(`duplicate path id: ${p.id}`);
      pathIds.add(p.id);
    }

    /* 2. every path has >= 1 module */
    check(Array.isArray(p.modules) && p.modules.length >= 1,
      `path ${pid}: must have >= 1 module`);

    const modIds = new Set();
    (p.modules || []).forEach((m, mi) => {
      const mid = m.id || `<module[${mi}]>`;
      const key = `${pid}/${mid}`;
      check(isNonEmptyString(m.id), `path ${pid} module[${mi}]: missing id`);
      check(isNonEmptyString(m.title), `path ${pid} module ${mid}: missing title`);
      check(isNonEmptyString(m.kind), `path ${pid} module ${mid}: missing kind`);
      check(Array.isArray(m.topics), `path ${pid} module ${mid}: topics must be an array`);
      check(isNonEmptyString(m.il_provides), `path ${pid} module ${mid}: missing il_provides`);
      if (m.id) {
        if (modIds.has(m.id)) fail(`duplicate module id ${m.id} in path ${pid}`);
        modIds.add(m.id);
        moduleIndex.set(key, m);
      }

      /* 3. every module has >= 1 source with http(s) url */
      check(Array.isArray(m.sources) && m.sources.length >= 1,
        `path ${pid} module ${mid}: must have >= 1 source`);
      (m.sources || []).forEach((s, si) => {
        check(isNonEmptyString(s.name), `path ${pid} module ${mid} source[${si}]: missing name`);
        check(isHttpUrl(s.url),
          `path ${pid} module ${mid} source[${si}] (${s.name || '?'}): url must be http(s) (got ${JSON.stringify(s.url)})`);
      });
    });

    /* 4. timed assessments: >=10 items, valid answer index, explanation */
    check(Array.isArray(p.assessments), `path ${pid}: assessments must be an array`);
    const asmIds = new Set();
    (p.assessments || []).forEach((a, ai) => {
      const aid = a.id || `<assessment[${ai}]>`;
      check(isNonEmptyString(a.id), `path ${pid} assessment[${ai}]: missing id`);
      check(isNonEmptyString(a.title), `path ${pid} assessment ${aid}: missing title`);
      check(['diagnostic', 'gate', 'timed'].includes(a.kind),
        `path ${pid} assessment ${aid}: kind must be diagnostic|gate|timed (got ${JSON.stringify(a.kind)})`);
      if (a.id) {
        if (asmIds.has(a.id)) fail(`duplicate assessment id ${a.id} in path ${pid}`);
        asmIds.add(a.id);
      }
      if (a.kind === 'timed') {
        const items = a.items || [];
        check(items.length >= 10,
          `timed assessment ${aid} (path ${pid}): needs >= 10 items, has ${items.length}`);
        check(Number.isFinite(Number(a.minutes)) && Number(a.minutes) > 0,
          `timed assessment ${aid}: minutes must be a positive number`);
        check(Number(a.questions) === items.length,
          `timed assessment ${aid}: questions field (${a.questions}) must equal items length (${items.length})`);
        items.forEach((it, ii) => {
          const ctx = `timed assessment ${aid} item[${ii}]`;
          check(isNonEmptyString(it.q), `${ctx}: missing question text`);
          check(Array.isArray(it.choices) && it.choices.length >= 2,
            `${ctx}: choices must be an array of >= 2`);
          check(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < (it.choices || []).length,
            `${ctx}: answer index ${JSON.stringify(it.answer)} invalid for ${ (it.choices || []).length} choices`);
          check(isNonEmptyString(it.explain), `${ctx}: missing explanation`);
        });
      }
    });
  });

  note(`catalog: ${academyCodes.size} academies, ${pathIds.size} paths, ${moduleIndex.size} modules`);

  /* 6. no duplicate (path title, module title) pairs */
  const seen = new Map();
  (catalog.paths || []).forEach((p) => {
    (p.modules || []).forEach((m) => {
      const k = `${String(p.title).trim().toLowerCase()} ||| ${String(m.title).trim().toLowerCase()}`;
      if (seen.has(k)) {
        fail(`duplicate (path, module) title pair: path "${p.title}" module "${m.title}" ` +
          `appears in ${seen.get(k)} and ${p.id}/${m.id}`);
      } else {
        seen.set(k, `${p.id}/${m.id}`);
      }
    });
  });

  /* 7a. canonical references inside the catalog itself (if any) */
  (catalog.paths || []).forEach((p) => {
    (p.modules || []).forEach((m) => {
      if (m.canonical != null) {
        checkCanonical(String(m.canonical), `module ${p.id}/${m.id}`, pathIds, moduleIndex);
      }
    });
  });
}

/* ---------- 5 & 7b. sources.json + dedupe-matrix.json ---------- */
const sources = readJson('data/sources.json');
const dedupe = readJson('data/dedupe-matrix.json');

function checkCanonical(canonical, where, pathIds, moduleIndex) {
  const parts = canonical.split('/');
  if (parts.length !== 2) {
    fail(`${where}: canonical ${JSON.stringify(canonical)} must be "<path-id>/<module-id>" or null`);
    return;
  }
  const [pid, mid] = parts;
  if (!pathIds.has(pid)) {
    fail(`${where}: canonical path id "${pid}" does not exist`);
    return;
  }
  if (!moduleIndex.has(`${pid}/${mid}`)) {
    fail(`${where}: canonical module "${mid}" does not exist in path "${pid}"`);
  }
}

if (sources && dedupe && catalog) {
  check(Array.isArray(sources), 'sources.json must be an array');
  check(Array.isArray(dedupe), 'dedupe-matrix.json must be an array');

  const pathIds = new Set((catalog.paths || []).map((p) => p.id));
  const moduleIndex = new Set();
  (catalog.paths || []).forEach((p) => (p.modules || []).forEach((m) => moduleIndex.add(`${p.id}/${m.id}`)));

  const sourceNames = new Set();
  sources.forEach((s, i) => {
    check(isNonEmptyString(s.name), `sources.json[${i}]: missing name`);
    check(isHttpUrl(s.url), `sources.json[${i}] (${s.name || '?'}): url must be http(s)`);
    check(isNonEmptyString(s.category), `sources.json[${i}] (${s.name}): missing category`);
    check(isNonEmptyString(s.description), `sources.json[${i}] (${s.name}): missing description`);
    check(Array.isArray(s.used_in), `sources.json[${i}] (${s.name}): used_in must be an array`);
    (s.used_in || []).forEach((pid) => {
      check(pathIds.has(pid), `sources.json[${i}] (${s.name}): used_in path "${pid}" does not exist`);
    });
    if (s.name) {
      if (sourceNames.has(s.name)) fail(`duplicate source name: ${s.name}`);
      sourceNames.add(s.name);
    }
  });

  const covered = new Set();
  dedupe.forEach((e, i) => {
    check(isNonEmptyString(e.course), `dedupe-matrix.json[${i}]: missing course`);
    check(Array.isArray(e.sources), `dedupe-matrix.json[${i}]: sources must be an array`);
    check(['kept', 'merged', 'dropped'].includes(e.decision),
      `dedupe-matrix.json[${i}]: decision must be kept|merged|dropped (got ${JSON.stringify(e.decision)})`);
    check(isNonEmptyString(e.reason), `dedupe-matrix.json[${i}]: missing reason`);
    (e.sources || []).forEach((n) => covered.add(n));
    if (e.canonical != null) {
      checkCanonical(String(e.canonical), `dedupe entry "${e.course}"`, pathIds, moduleIndex);
    }
  });

  /* 5. dedupe-matrix must cover every sources.json name */
  sourceNames.forEach((n) => {
    if (!covered.has(n)) fail(`dedupe-matrix does not cover source: ${n}`);
  });
  note(`dedupe: ${dedupe.length} entries cover all ${sourceNames.size} sources.json names`);

  /* every source name cited by dedupe must exist in sources.json */
  covered.forEach((n) => {
    if (!sourceNames.has(n)) fail(`dedupe-matrix cites unknown source: ${n}`);
  });
}

/* ---------- 8. internal page links resolve ---------- */
(function checkInternalLinks() {
  const pages = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .sort();
  check(pages.length === 10, `expected 10 HTML pages, found ${pages.length}: ${pages.join(', ')}`);

  const attrRe = /(?:href|src)\s*=\s*(['"])(.*?)\1/g;
  let checked = 0;
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    let m;
    while ((m = attrRe.exec(html)) !== null) {
      let url = m[2];
      if (!url || url.startsWith('#') || url.startsWith('mailto:') ||
          url.startsWith('tel:') || url.startsWith('data:') ||
          /^https?:\/\//i.test(url) || url.includes('${') || url.includes("' +")) {
        continue; // external, anchor-only, mailto, or JS-built at runtime
      }
      // strip fragment and query; runtime-built links checked by page base below
      const base = url.split('#')[0].split('?')[0];
      if (!base) continue;
      checked += 1;
      const target = path.normalize(path.join(ROOT, base));
      if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
        fail(`${page}: link "${url}" escapes the build directory`);
        continue;
      }
      if (!fs.existsSync(target)) {
        fail(`${page}: internal link "${url}" resolves to missing file ${path.relative(ROOT, target)}`);
      }
    }
  });
  note(`link check: ${checked} static internal href/src targets resolved`);

  /* dynamic (JS-built) page targets referenced in templates */
  const dynTargets = ['academy.html', 'path.html', 'learn.html', 'assess.html'];
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    dynTargets.forEach((t) => {
      if (html.includes(`'${t}`) || html.includes(`"${t}`) || html.includes(`=${t}`)) {
        if (!fs.existsSync(path.join(ROOT, t))) fail(`${page}: dynamic link target ${t} missing`);
      }
    });
  });

  /* every js/* referenced by script tags must exist */
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const srcRe = /<script[^>]+src\s*=\s*(['"])(.*?)\1/g;
    let m;
    while ((m = srcRe.exec(html)) !== null) {
      const u = m[2];
      if (/^https?:\/\//i.test(u)) continue;
      if (!fs.existsSync(path.join(ROOT, u))) fail(`${page}: script src "${u}" missing`);
    }
  });
})();

/* ---------- report ---------- */
notes.forEach((n) => console.log('note: ' + n));
if (errors.length) {
  console.error(`\nVALIDATION FAILED: ${errors.length} error(s)`);
  errors.forEach((e) => console.error('  ✗ ' + e));
  process.exit(1);
}
console.log('\nVALIDATION PASSED — all CONTRACT checks green.');
process.exit(0);
