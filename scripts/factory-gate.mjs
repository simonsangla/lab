// factory-gate.mjs — the single green gate a builder agent must pass before
// declaring an app done. Runs the same checks CI runs, scoped to one file:
//
//   node scripts/factory-gate.mjs apps/YYYY-MM-DD-slug.html
//
//   G1+G2  lint-app.mjs <file>     inline-JS syntax + meta/filename/brand
//   G4     smoke.mjs <file>        DOM-stub load: renders, no errors, fallbacks
//   G3     gen-index + git diff    gallery is idempotent (index.html not stale)
//
// Prints PASS/FAIL per gate and a summary; exit 0 only if all pass.

import { execFileSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/factory-gate.mjs apps/YYYY-MM-DD-slug.html');
  process.exit(2);
}

const node = process.execPath;
const results = [];

function gate(label, fn) {
  try {
    fn();
    results.push([label, true, '']);
    console.log('PASS  ' + label);
  } catch (e) {
    const detail = (e.stdout ? String(e.stdout) : '') + (e.stderr ? String(e.stderr) : '') || String(e.message || e);
    results.push([label, false, detail.trim()]);
    console.log('FAIL  ' + label);
    if (detail.trim()) console.log(detail.trim().split('\n').map((l) => '      ' + l).join('\n'));
  }
}

gate('G1+G2 lint  (' + file + ')', () => execFileSync(node, ['scripts/lint-app.mjs', file], { stdio: 'pipe' }));
gate('G4 smoke    (' + file + ')', () => execFileSync(node, ['scripts/smoke.mjs', file], { stdio: 'pipe' }));
gate('G3 gallery  (index.html idempotent)', () => {
  execFileSync(node, ['scripts/gen-index.mjs'], { stdio: 'pipe' });
  execFileSync('git', ['diff', '--exit-code', '--', 'index.html'], { stdio: 'pipe' });
});

const failed = results.filter((r) => !r[1]).length;
console.log('\n[factory-gate] ' + (results.length - failed) + '/' + results.length + ' gates passed' +
  (failed ? ' — run `npm run gen` and commit index.html if G3 failed' : ''));
process.exit(failed ? 1 : 0);
