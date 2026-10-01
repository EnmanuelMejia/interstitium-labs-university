// Bakes 404.html into worker.js as the NOT_FOUND_HTML constant.
// The worker cannot rely on env.ASSETS (absent in this deployment) and the
// platform serves static assets without invoking the worker, so unknown paths
// reach the worker with no way to fetch the 404 page — it must be embedded.
// A <base href="/"> tag is injected so relative asset links resolve correctly
// no matter which missing path triggered the 404.
// Usage: node scripts/bake-404.mjs   (run after editing 404.html, before deploy)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, '404.html'), 'utf8');
// Inject <base href="/"> right after <head> so relative links work from any path.
if (!/<base\s/i.test(html)) {
  html = html.replace(/<head>/i, '<head>\n<base href="/">');
}
const block =
  '// ===== BEGIN BAKED 404 (generated from 404.html by scripts/bake-404.mjs; do not hand-edit) =====\n' +
  'const NOT_FOUND_HTML = ' + JSON.stringify(html) + ';\n' +
  '// ===== END BAKED 404 =====';

const wp = join(root, 'worker.js');
let worker = readFileSync(wp, 'utf8');
const re = /\/\/ ===== BEGIN BAKED 404[\s\S]*?\/\/ ===== END BAKED 404 =====/;
if (!re.test(worker)) {
  throw new Error('BAKED 404 marker block not found in worker.js');
}
worker = worker.replace(re, () => block);
writeFileSync(wp, worker);
console.log('Baked 404.html into worker.js (' + html.length + ' bytes).');
