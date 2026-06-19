// scaffold-app.mjs — factory scaffolder. Emits a canonical, gate-passing
// single-file app skeleton so builder agents start from the shared brand
// boilerplate instead of re-deriving it (and drifting).
//
//   node scripts/scaffold-app.mjs <slug> "<App Name>" "<description>" "<tag,tag,tag>" [YYYY-MM-DD]
//
// Writes apps/<date>-<slug>.html. Refuses to overwrite. The skeleton already
// passes G1/G2/G4: it has the meta trio, links /assets/lab-theme.css after its
// inline <style>, has a back link + <h1>, and renders a default into #out on
// load (so the smoke harness sees rendered content). Builders fill in the IIFE.

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [slug, name, description, tags, dateArg] = process.argv.slice(2);

if (!slug || !name || !description || !tags) {
  console.error('usage: node scripts/scaffold-app.mjs <slug> "<Name>" "<description>" "<tag,tag>" [YYYY-MM-DD]');
  process.exit(2);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('slug must be lowercase letters, digits and hyphens only');
  process.exit(2);
}
const date = dateArg || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('date must be YYYY-MM-DD');
  process.exit(2);
}

const file = join('apps', date + '-' + slug + '.html');
if (existsSync(file)) {
  console.error('refusing to overwrite ' + file);
  process.exit(1);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="app-name" content="${esc(name)}">
<meta name="app-description" content="${esc(description)}">
<meta name="app-tags" content="${esc(tags)}">
<title>${esc(name)} &mdash; lab.</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#009A44">
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${esc(name)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  /* file:// dark fallback. /assets/lab-theme.css (loaded after) remaps these to
     the light brand identity on live. Variable names match the shared sheet. */
  :root {
    --bg: #0a0a0a; --surface: #141414; --border: #242424;
    --text: #e8e8e8; --muted: #8a8a8a; --accent: #2bd07f;
    --red: #ef4444; --yellow: #facc15; --green: #22c55e;
    --lab-green: #009A44; --lab-green-text: #2bd07f; --lab-green-dark: #2bd07f;
    --lab-green-tint: #10231a;
    --font-display: 'IBM Plex Sans', system-ui, sans-serif;
    --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font-family: var(--font-display);
    min-height: 100dvh; line-height: 1.5;
    padding: max(64px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(48px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    overscroll-behavior-y: contain;
  }
  a, button { -webkit-tap-highlight-color: transparent; }
  .back { font-family: var(--font-mono); font-size: 12px; color: var(--muted); text-decoration: none; position: absolute; top: 20px; left: 20px; }
  .back:hover, .back:active { color: var(--lab-green-text); }
  .wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
  .kicker { font-family: var(--font-mono); font-weight: 600; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--lab-green-text); margin: 0 0 8px; }
  header h1 { font-weight: 700; font-size: 28px; margin: 0; letter-spacing: -0.01em; }
  header .lead { color: var(--muted); font-size: 15px; margin: 8px 0 0; max-width: 64ch; }
  label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); display: block; margin: 0 0 6px; }
  textarea, input, select { width: 100%; font-family: var(--font-mono); font-size: 13px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
  textarea { min-height: 120px; resize: vertical; }
  .out { display: flex; flex-direction: column; gap: 12px; }
</style>
<link rel="stylesheet" href="/assets/lab-theme.css">
<script src="/assets/lab-nav.js" defer></script>
</head>
<body>
  <a class="back" href="/">&larr; lab.</a>
  <div class="wrap">
    <header>
      <p class="kicker">${esc(name)}</p>
      <h1>${esc(name)}</h1>
      <p class="lead">${esc(description)}</p>
    </header>

    <!-- TODO(builder): inputs go here -->

    <div class="out" id="out"></div>
  </div>
<script>
(function () {
  var out = document.getElementById('out');
  // TODO(builder): replace with the real render. Seeds a default so the smoke
  // harness (no fetch, no getComputedStyle) sees rendered content on load.
  function render() {
    out.innerHTML = '<div class="lab-card" style="padding:16px">Scaffold ready &mdash; build me.</div>';
  }
  render();
})();
</script>
<script>
  // PWA: register the shared service worker so this app is installable/offline
  // even when opened directly. Guarded, so it's inert under the smoke harness.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
</script>
</body>
</html>
`;

writeFileSync(file, html);
console.log('scaffolded ' + file);
