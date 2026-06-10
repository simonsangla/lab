// lint-app.mjs — factory gates G1 (inline-JS syntax) + G2 (meta/filename lint).
//
//   node scripts/lint-app.mjs [apps/file.html ...]    (default: all of apps/)
//
// Errors fail the run; warnings don't (pre-existing apps are grandfathered on
// soft limits like description length).

import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('apps').filter((f) => f.endsWith('.html')).map((f) => join('apps', f));

const META_KEYS = ['app-name', 'app-description', 'app-tags'];

function parseMeta(html, name) {
  const re = new RegExp(
    '<meta\\s+name=["\']' + name + '["\']\\s+content=(?:"([^"]*)"|\'([^\']*)\')',
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

// Node string split on the script tags (G1) — not sed, multiple blocks OK.
function scripts(html) {
  const out = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) if (m[1].trim()) out.push(m[1]);
  return out;
}

let errors = 0;
let warnings = 0;
const err = (f, msg) => { console.error('ERROR ' + f + ': ' + msg); errors++; };
const warn = (f, msg) => { console.error('warn  ' + f + ': ' + msg); warnings++; };

const tmp = mkdtempSync(join(tmpdir(), 'lint-app-'));

try {
for (const file of files) {
  const base = file.split('/').pop();
  const html = readFileSync(file, 'utf8');

  // G2: filename contract
  const fm = base.match(/^(\d{4}-\d{2}-\d{2})-[a-z0-9-]+\.html$/);
  if (!fm) err(file, 'filename must be YYYY-MM-DD-slug.html (lowercase slug)');
  else if (isNaN(Date.parse(fm[1]))) err(file, 'filename date is not a valid date');
  else if (fm[1] > new Date().toISOString().slice(0, 10)) err(file, 'filename date is in the future');

  // G2: meta contract
  for (const key of META_KEYS) {
    const v = parseMeta(html, key);
    if (v === null) { err(file, 'missing <meta name="' + key + '">'); continue; }
    if (!v.trim()) err(file, key + ' is empty');
  }
  const desc = parseMeta(html, 'app-description') || '';
  if (desc.length > 140) warn(file, 'description is ' + desc.length + ' chars (>140), will clamp on the card');
  const tags = (parseMeta(html, 'app-tags') || '').split(',').map((t) => t.trim()).filter(Boolean);
  if (tags.length > 4) warn(file, tags.length + ' tags (>4), card gets noisy');

  // G1: every inline script must parse
  scripts(html).forEach((src, i) => {
    const p = join(tmp, base + '.' + i + '.js');
    writeFileSync(p, src);
    try {
      execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
    } catch (e) {
      err(file, 'inline script #' + i + ' failed node --check:\n' + String(e.stderr).trim());
    }
  });
}
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('[lint-app] ' + files.length + ' files, ' + errors + ' errors, ' + warnings + ' warnings');
process.exit(errors ? 1 : 0);
