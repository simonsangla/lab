import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = 'apps';
const OUT = 'index.html';
const META_KEYS = ['app-name', 'app-description', 'app-tags'];

function parseMeta(html, name) {
  if (!META_KEYS.includes(name)) return null;
  // Quote-aware: content may contain the other quote character.
  const re = new RegExp(
    '<meta\\s+name=["\']' + name + '["\']\\s+content=(?:"([^"]*)"|\'([^\']*)\')',
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const files = readdirSync(APPS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort((a, b) => b.localeCompare(a));

const apps = files.map((filename) => {
  const raw = readFileSync(join(APPS_DIR, filename), 'utf8');
  const date = filename.slice(0, 10);
  const stem = filename.replace(/\.html$/i, '');
  const rest = stem.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const fallbackName = titleCase(rest.replace(/-/g, ' '));
  const name = parseMeta(raw, 'app-name') || fallbackName;
  const description = parseMeta(raw, 'app-description') || '';
  if (description.length > 140) {
    console.warn('[gen-index] WARN ' + filename + ': description is ' + description.length + ' chars (>140) and will clamp on the card');
  }
  const tagsRaw = parseMeta(raw, 'app-tags') || '';
  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  return { filename, name, description, tags, date };
});

const N = apps.length;
const since = N ? apps[N - 1].date : '';

const cardsHtml = apps
  .map((app, i) => {
    const tagsHtml = app.tags
      .map((t) => '<span class="tag">' + escapeHtml(t) + '</span>')
      .join('');
    const delay = Math.min(i, 8) * 60;   // cap the stagger so late cards never hide as the count grows
    return (
      '<a class="card" href="apps/' +
      escapeHtml(app.filename) +
      '" style="animation-delay: ' +
      delay +
      'ms">\n' +
      '        <div class="date">' +
      escapeHtml(app.date) +
      '</div>\n' +
      '        <h2 class="name">' +
      escapeHtml(app.name) +
      '</h2>\n' +
      '        <p class="desc">' +
      escapeHtml(app.description) +
      '</p>\n' +
      '        <div class="tags">' +
      tagsHtml +
      '</div>\n' +
      '        <div class="arrow">&rarr;</div>\n' +
      '      </a>'
    );
  })
  .join('\n      ');

const emptyHtml =
  '<div class="empty"><p>Nothing yet. Day 1 starts now.</p></div>';

const body =
  N === 0
    ? '    ' + emptyHtml
    : '    <section class="grid">\n      ' + cardsHtml + '\n    </section>';

const html =
  '<!doctype html>\n' +
  '<html lang="en">\n' +
  '<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<title>lab. &mdash; Simon Sangla</title>\n' +
  '<meta name="description" content="One day. One app. No excuses.">\n' +
  '<meta property="og:type" content="website">\n' +
  '<meta property="og:url" content="https://lab.simonsangla.com/">\n' +
  '<meta property="og:title" content="lab. — One day. One app. No excuses.">\n' +
  '<meta property="og:description" content="' + N + ' micro-apps shipped, one per day, by Simon Sangla — Snowflake analytics consultant.">\n' +
  '<meta property="og:image" content="https://lab.simonsangla.com/og.png">\n' +
  '<meta property="og:image:width" content="1200">\n' +
  '<meta property="og:image:height" content="630">\n' +
  '<meta name="twitter:card" content="summary_large_image">\n' +
  '<link rel="manifest" href="/manifest.webmanifest">\n' +
  '<meta name="theme-color" content="#29d8c7">\n' +
  '<link rel="icon" type="image/png" href="/icons/icon-192.png">\n' +
  '<link rel="apple-touch-icon" href="/icons/icon-192.png">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
  '<meta name="apple-mobile-web-app-title" content="lab.">\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">\n' +
  '<style>\n' +
  '  :root {\n' +
  '    --bg: #0a0a0a;\n' +
  '    --surface: #141414;\n' +
  '    --border: #1e1e1e;\n' +
  '    --accent: #29d8c7;\n' +
  '    --accent2: #6366f1;\n' +
  '    --text: #e8e8e8;\n' +
  '    --muted: #8a8a8a;\n' +
  "    --font-display: 'Syne', system-ui, sans-serif;\n" +
  "    --font-mono: 'JetBrains Mono', ui-monospace, monospace;\n" +
  '  }\n' +
  '  * { box-sizing: border-box; }\n' +
  '  html, body { margin: 0; padding: 0; }\n' +
  '  html { -webkit-text-size-adjust: 100%; }\n' +
  '  body {\n' +
  '    background: var(--bg);\n' +
  '    color: var(--text);\n' +
  '    font-family: var(--font-display);\n' +
  '    min-height: 100dvh;\n' +
  '    padding: max(24px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(48px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));\n' +
  '    position: relative;\n' +
  '    overscroll-behavior-y: contain;\n' +
  '  }\n' +
  '  a, button { -webkit-tap-highlight-color: transparent; }\n' +
  '  .grain {\n' +
  '    position: fixed; inset: 0; pointer-events: none;\n' +
  '    width: 100%; height: 100%;\n' +
  '    opacity: 0.03; z-index: 0;\n' +
  '  }\n' +
  '  .wrap { max-width: 1080px; margin: 0 auto; position: relative; z-index: 1; }\n' +
  '  header { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }\n' +
  '  .brand { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }\n' +
  '  .brand .logo { font-family: var(--font-display); font-weight: 700; font-size: 28px; color: var(--accent); line-height: 1; margin: 0; }\n' +
  '  .brand .tagline { color: var(--muted); font-size: 13px; }\n' +
  '  .sub { color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 52ch; margin: 0; }\n' +
  '  .pill-link {\n' +
  '    display: inline-block; min-height: 44px; line-height: 30px;\n' +
  '    border: 1px solid var(--accent); color: var(--accent);\n' +
  '    padding: 6px 14px; border-radius: 99px; font-size: 13px;\n' +
  '    text-decoration: none; font-family: var(--font-display);\n' +
  '    transition: background 180ms ease, color 180ms ease;\n' +
  '  }\n' +
  '  .pill-link:hover, .pill-link:active { background: var(--accent); color: var(--bg); }\n' +
  '  .counter {\n' +
  '    display: inline-block; margin: 20px 0 24px;\n' +
  '    background: var(--surface); border: 1px solid var(--border);\n' +
  '    color: var(--muted); font-family: var(--font-mono); font-size: 12px;\n' +
  '    padding: 6px 12px; border-radius: 99px;\n' +
  '  }\n' +
  '  .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }\n' +
  '  .card {\n' +
  '    background: var(--surface); border: 1px solid var(--border);\n' +
  '    border-radius: 10px; padding: 18px;\n' +
  '    text-decoration: none; color: inherit; display: block;\n' +
  '    transition: border-color 180ms ease, transform 180ms ease;\n' +
  '    animation: fadeUp 400ms ease both;\n' +
  '  }\n' +
  '  .card:hover, .card:active { border-color: var(--accent); }\n' +
  '  @media (hover: hover) { .card:hover { transform: translateY(-2px); } }\n' +
  '  .card .date { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }\n' +
  '  .card .name { font-family: var(--font-display); font-weight: 600; font-size: 17px; color: var(--text); margin: 8px 0 0; }\n' +
  '  .card .desc {\n' +
  '    font-size: 14px; color: var(--muted); margin: 6px 0 0; line-height: 1.45;\n' +
  '    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;\n' +
  '  }\n' +
  '  .card .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }\n' +
  '  .card .tag {\n' +
  '    background: #1a1a2e; color: var(--accent2);\n' +
  '    font-family: var(--font-mono); font-size: 11px;\n' +
  '    padding: 3px 8px; border-radius: 4px;\n' +
  '  }\n' +
  '  .card .arrow { color: var(--accent); font-size: 18px; text-align: right; margin-top: 12px; }\n' +
  '  .empty { text-align: center; padding: 64px 0; }\n' +
  '  .empty p { color: var(--muted); font-style: italic; }\n' +
  '  footer { text-align: center; color: var(--muted); font-size: 13px; margin-top: 56px; line-height: 1.5; }\n' +
  '  footer a { color: var(--text); text-decoration: none; }\n' +
  '  footer a:hover, footer a:active { color: var(--accent); }\n' +
  '  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }\n' +
  '  @media (prefers-reduced-motion: reduce) {\n' +
  '    .card { animation: none; transition: none; }\n' +
  '  }\n' +
  '  @media (min-width: 640px) {\n' +
  '    body { padding-top: max(32px, env(safe-area-inset-top)); padding-left: 20px; padding-right: 20px; }\n' +
  '    header { flex-direction: row; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }\n' +
  '    .brand .logo { font-size: 32px; }\n' +
  '    .brand .tagline { font-size: 14px; }\n' +
  '    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }\n' +
  '    .card { padding: 20px; }\n' +
  '    .card .name { font-size: 18px; }\n' +
  '  }\n' +
  '  @media (min-width: 960px) {\n' +
  '    body { padding-left: 24px; padding-right: 24px; padding-top: 40px; padding-bottom: 80px; }\n' +
  '    .grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }\n' +
  '  }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '  <svg class="grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n' +
  '    <filter id="grain">\n' +
  '      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>\n' +
  '      <feColorMatrix type="saturate" values="0"/>\n' +
  '    </filter>\n' +
  '    <rect width="100%" height="100%" filter="url(#grain)"/>\n' +
  '  </svg>\n' +
  '  <div class="wrap">\n' +
  '    <header>\n' +
  '      <div class="brand">\n' +
  '        <h1 class="logo">lab.</h1>\n' +
  '        <span class="tagline">One day. One app. No excuses.</span>\n' +
  '      </div>\n' +
  '      <a class="pill-link" href="mailto:simonsangla@gmail.com">Work with me &rarr;</a>\n' +
  '    </header>\n' +
  '    <p class="sub">Daily micro-apps, each designed, built and shipped solo in under 24 hours &mdash; by Simon Sangla, Snowflake analytics consultant.</p>\n' +
  '    <p class="counter">' + N + ' apps shipped' + (since ? ' &middot; since ' + since : '') + '</p>\n' +
  body + '\n' +
  '    <footer>\n' +
  '      Built by <a href="https://simonsangla.com">Simon Sangla</a> &middot; Snowflake Analytics Consultant<br>\n' +
  '      <a href="mailto:simonsangla@gmail.com">Email</a> &middot; <a href="https://github.com/simonsangla/lab">Source on GitHub</a>\n' +
  '    </footer>\n' +
  '  </div>\n' +
  '  <script>\n' +
  "    if ('serviceWorker' in navigator) {\n" +
  "      window.addEventListener('load', function () {\n" +
  "        navigator.serviceWorker.register('/sw.js').catch(function () {});\n" +
  '      });\n' +
  '    }\n' +
  '  </script>\n' +
  '</body>\n' +
  '</html>\n';

writeFileSync(OUT, html);
console.log('[gen-index] Generated index.html with ' + N + ' apps.');
