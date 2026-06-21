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

function styleBlocks(html) {
  const out = [];
  const re = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

let errors = 0;
let warnings = 0;
const err = (f, msg) => { console.error('ERROR ' + f + ': ' + msg); errors++; };
const warn = (f, msg) => { console.error('warn  ' + f + ': ' + msg); warnings++; };

// G6: brand-drift WARNINGS (never fail CI) — surface design-system reinvention.
//   - inline <style> redefining a shared .lab-* component (consume it instead)
//   - raw color literal in <script> not routed through a token (var(--x,#hex) /
//     token('--x',#hex))
// Theme-agnostic #ffffff/#000000 are allowed automatically; mark any other
// deliberate literal (e.g. a categorical chart palette) with a `lab-allow-hex`
// comment on the same line.
function brandDrift(file, html) {
  for (const css of styleBlocks(html)) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let r; const ruleRe = /([^{}]+)\{[^{}]*\}/g;
    while ((r = ruleRe.exec(clean))) {
      for (const sel of r[1].split(',').map((s) => s.trim())) {
        // Bare component selector (optionally one pseudo) = redefining the shared
        // component itself. A scoped/compound selector (".x .lab-btn", ".lab-btn.y")
        // is an allowed contextual tweak.
        if (/^\.lab-[a-z0-9-]+(?::[a-z-]+)?$/i.test(sel)) {
          warn(file, 'inline <style> redefines shared component ' + sel + ' — consume it from lab-theme.css (use a differently-named fallback class), do not redefine it per app');
          break;
        }
      }
    }
  }
  for (const src of scripts(html)) {
    for (const line of src.split('\n')) {
      const hexes = line.match(/#[0-9a-fA-F]{6}\b/g);
      if (!hexes || /lab-allow-hex/.test(line)) continue;
      if (/var\(\s*--|token\(/.test(line)) continue;                  // routed through a token
      if (hexes.every((h) => /^#(?:ffffff|000000)$/i.test(h))) continue; // theme-agnostic ink/surface
      warn(file, 'raw color in <script> not routed through a token: ' + line.trim().slice(0, 72) + '  (use var(--token,#hex)/token(), or mark lab-allow-hex)');
    }
  }
}

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

  // G2: brand contract — every app links the shared theme after its inline style
  if (!/<link\s[^>]*href=["']\/assets\/lab-theme\.css["']/i.test(html)) {
    err(file, 'missing <link rel="stylesheet" href="/assets/lab-theme.css"> (brand identity, see AGENTS.md)');
  }

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

  // G6: brand-drift (warnings only)
  brandDrift(file, html);
}
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// On a default run (no explicit files) the hand-authored homepage is in scope
// for the drift guard too, even though it skips the app filename/meta contract.
if (!process.argv.slice(2).length) {
  try { brandDrift('index.html', readFileSync('index.html', 'utf8')); } catch { /* no homepage */ }
}
console.log('[lint-app] ' + files.length + ' files, ' + errors + ' errors, ' + warnings + ' warnings');
process.exit(errors ? 1 : 0);
