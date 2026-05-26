import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = 'apps';
const OUT = 'index.html';

function parseMeta(html, name) {
  const re = new RegExp(
    '<meta\\s+name=["\']' + name + '["\']\\s+content=["\']([^"\']*)["\']',
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
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
  const tagsRaw = parseMeta(raw, 'app-tags') || '';
  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  return { filename, name, description, tags, date };
});

const N = apps.length;

const cardsHtml = apps
  .map((app, i) => {
    const tagsHtml = app.tags
      .map((t) => '<span class="tag">' + escapeHtml(t) + '</span>')
      .join('');
    const delay = i * 60;
    return (
      '<a class="card" href="apps/' +
      escapeHtml(app.filename) +
      '" target="_blank" rel="noopener" style="animation-delay: ' +
      delay +
      'ms">\n' +
      '        <div class="date">' +
      escapeHtml(app.date) +
      '</div>\n' +
      '        <h3 class="name">' +
      escapeHtml(app.name) +
      '</h3>\n' +
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
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<title>lab. &mdash; Simon Sangla</title>\n' +
  '<meta name="description" content="One day. One app. No excuses.">\n' +
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
  '    --muted: #5a5a5a;\n' +
  "    --font-display: 'Syne', system-ui, sans-serif;\n" +
  "    --font-mono: 'JetBrains Mono', ui-monospace, monospace;\n" +
  '  }\n' +
  '  * { box-sizing: border-box; }\n' +
  '  html, body { margin: 0; padding: 0; }\n' +
  '  body {\n' +
  '    background: var(--bg);\n' +
  '    color: var(--text);\n' +
  '    font-family: var(--font-display);\n' +
  '    min-height: 100dvh;\n' +
  '    padding: 40px 24px 80px;\n' +
  '    position: relative;\n' +
  '  }\n' +
  '  .grain {\n' +
  '    position: fixed; inset: 0; pointer-events: none;\n' +
  '    width: 100%; height: 100%;\n' +
  '    opacity: 0.03; z-index: 0;\n' +
  '  }\n' +
  '  .wrap { max-width: 1080px; margin: 0 auto; position: relative; z-index: 1; }\n' +
  '  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }\n' +
  '  .brand { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }\n' +
  '  .brand .logo { font-family: var(--font-display); font-weight: 700; font-size: 32px; color: var(--accent); line-height: 1; }\n' +
  '  .brand .tagline { color: var(--muted); font-size: 14px; }\n' +
  '  .pill-link {\n' +
  '    border: 1px solid var(--accent); color: var(--accent);\n' +
  '    padding: 6px 14px; border-radius: 99px; font-size: 13px;\n' +
  '    text-decoration: none; font-family: var(--font-display);\n' +
  '    transition: background 180ms ease, color 180ms ease;\n' +
  '  }\n' +
  '  .pill-link:hover { background: var(--accent); color: var(--bg); }\n' +
  '  .counter {\n' +
  '    display: inline-block; margin: 24px 0 32px;\n' +
  '    background: var(--surface); border: 1px solid var(--border);\n' +
  '    color: var(--muted); font-family: var(--font-mono); font-size: 12px;\n' +
  '    padding: 6px 12px; border-radius: 99px;\n' +
  '  }\n' +
  '  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }\n' +
  '  .card {\n' +
  '    background: var(--surface); border: 1px solid var(--border);\n' +
  '    border-radius: 8px; padding: 20px; cursor: pointer;\n' +
  '    text-decoration: none; color: inherit; display: block;\n' +
  '    transition: border-color 180ms ease, transform 180ms ease;\n' +
  '    animation: fadeUp 400ms ease both;\n' +
  '  }\n' +
  '  .card:hover { border-color: var(--accent); transform: translateY(-2px); }\n' +
  '  .card .date { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }\n' +
  '  .card .name { font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--text); margin: 8px 0 0; }\n' +
  '  .card .desc {\n' +
  '    font-size: 14px; color: var(--muted); margin: 6px 0 0;\n' +
  '    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;\n' +
  '  }\n' +
  '  .card .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }\n' +
  '  .card .tag {\n' +
  '    background: #1a1a2e; color: var(--accent2);\n' +
  '    font-family: var(--font-mono); font-size: 11px;\n' +
  '    padding: 3px 8px; border-radius: 4px;\n' +
  '  }\n' +
  '  .card .arrow { color: var(--accent); font-size: 18px; text-align: right; margin-top: 12px; }\n' +
  '  .empty { text-align: center; padding: 80px 0; }\n' +
  '  .empty p { color: var(--muted); font-style: italic; }\n' +
  '  footer { text-align: center; color: var(--muted); font-size: 13px; margin-top: 64px; }\n' +
  '  footer a { color: var(--text); text-decoration: none; }\n' +
  '  footer a:hover { color: var(--accent); }\n' +
  '  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }\n' +
  '  @media (max-width: 480px) {\n' +
  '    .grid { grid-template-columns: 1fr; }\n' +
  '    body { padding: 24px 16px 64px; }\n' +
  '  }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '  <svg class="grain" xmlns="http://www.w3.org/2000/svg">\n' +
  '    <filter id="grain">\n' +
  '      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>\n' +
  '      <feColorMatrix type="saturate" values="0"/>\n' +
  '    </filter>\n' +
  '    <rect width="100%" height="100%" filter="url(#grain)"/>\n' +
  '  </svg>\n' +
  '  <div class="wrap">\n' +
  '    <header>\n' +
  '      <div class="brand">\n' +
  '        <span class="logo">lab.</span>\n' +
  '        <span class="tagline">One day. One app. No excuses.</span>\n' +
  '      </div>\n' +
  '      <a class="pill-link" href="https://simonsangla.com">simonsangla.com &rarr;</a>\n' +
  '    </header>\n' +
  '    <p class="counter">' + N + ' experiments shipped</p>\n' +
  body + '\n' +
  '    <footer>\n' +
  '      Built by <a href="https://simonsangla.com">Simon Sangla</a> &middot; Snowflake Analytics Consultant\n' +
  '    </footer>\n' +
  '  </div>\n' +
  '</body>\n' +
  '</html>\n';

writeFileSync(OUT, html);
console.log('[gen-index] Generated index.html with ' + N + ' apps.');
