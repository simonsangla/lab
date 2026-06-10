// screenshot.mjs — CI browser verification (factory deployment gate).
// Visits the gallery and every app on the given deployment, fails on any
// console error or page error, and saves mobile + desktop screenshots.
//
//   node .github/scripts/screenshot.mjs <base-url>

import { readdirSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('usage: screenshot.mjs <base-url>'); process.exit(2); }

const pages = ['/', ...readdirSync('apps').filter((f) => f.endsWith('.html')).map((f) => '/apps/' + f)];
const newest = pages[pages.length - 1];
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
let failures = 0;

for (const path of pages) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Chromium logs every non-2xx fetch as "Failed to load resource" even when
    // the app handles it - live-source apps probe public APIs that may 404 by
    // design (At Risk Today's Blocked/demo fallback). JS errors still fail.
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    errors.push('navigation failed: ' + e.message);
  }
  const slug = path === '/' ? 'index' : path.split('/').pop().replace(/\.html$/, '');
  await page.screenshot({ path: 'shots/' + slug + '-mobile.png', fullPage: true }).catch(() => {});
  if (path === '/' || path === newest) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: 'shots/' + slug + '-desktop.png', fullPage: true }).catch(() => {});
  }
  if (errors.length) {
    failures++;
    console.error('FAIL ' + path);
    errors.slice(0, 5).forEach((e) => console.error('     ' + e));
  } else {
    console.log('PASS ' + path);
  }
  await ctx.close();
}

await browser.close();
console.log('[screenshot] ' + pages.length + ' pages, ' + failures + ' with console/page errors');
process.exit(failures ? 1 : 0);
