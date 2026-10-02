#!/usr/bin/env node
/* Cross-domain Interstitium brand, navigation, SEO, and caching checks. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = ['a','b','c','d'].map(letter => JSON.parse(read('data/catalog/shard-' + letter + '.json')));
const totals = catalog.reduce((all, shard) => ({ academies: all.academies + shard.academies.length, paths: all.paths + shard.paths.length, modules: all.modules + shard.paths.reduce((n, item) => n + item.modules.length, 0) }), { academies:0, paths:0, modules:0 });
assert.deepEqual(totals, { academies:11, paths:65, modules:349 }, 'Catalog counts changed: update metadata to reflect actual data.');
const pages = fs.readdirSync(root).filter(p => p.endsWith('.html') && p !== '404.html');
const stale = /11 academies,\s*47(?: learning)? paths,\s*222 modules|10 academies,\s*41 paths,\s*204 modules/i;
for (const page of pages) {
  const content = read(page);
  assert.doesNotMatch(content, stale, page + ' contains outdated curriculum figures');
  assert.match(content, /<meta name="viewport"/, page + ' lacks responsive viewport');
  assert.match(content, /<link rel="canonical"/, page + ' lacks canonical');
  assert.match(content, /css\/il.css/, page + ' must load shared design system');
}
const script = read('js/app.js');
for (const target of ['https://interstitiumlabs.dev/noah/', 'https://interstitiumlabs.dev/portfolio/', 'https://interstitiumlabs.dev/']) {
  assert.ok(script.includes(target), 'Missing cross-app nav target: ' + target);
}
assert.ok(script.includes('assets/il-brand-mark.svg'), 'Shared branded navigation icon not configured');
assert.ok(fs.existsSync(path.join(root, 'assets/il-brand-mark.svg')), 'Shared branded navigation icon missing');
const css = read('css/il.css'), headers = read('_headers');
assert.ok(css.includes('fonts.googleapis.com'), 'Typography import missing');
assert.ok(headers.includes('fonts.googleapis.com') && headers.includes('fonts.gstatic.com'), 'CSP prevents brand fonts');
assert.doesNotMatch(headers, /max-age=31536000, immutable/, 'Unversioned assets cannot be cached immutably');
const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.theme_color, '#0a0f1d', 'App shell theme must match main site');
assert.equal(manifest.icons[0].src, 'assets/il-brand-mark.svg', 'Installable app must use canonical mark');
console.log('BRAND CHECKS PASSED:', JSON.stringify({ pages: pages.length, ...totals, crossAppLinks:3, status:'passed' }));
