import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = 'apps';
const OUT = 'index.html';
const META_KEYS = ['app-name', 'app-description', 'app-tags'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GRADIENT_COUNT = 7; // .g1 ... .g7 in the stylesheet below

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

function monogram(name) {
  const words = name.split(/\s+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}

const files = readdirSync(APPS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort((a, b) => b.localeCompare(a));

// Unlisted apps opt out of the gallery with <meta name="app-visibility" content="private">.
// The file still deploys (reachable by direct URL); it's just excluded from the index.
function isPrivate(html) {
  return /<meta\s+name=["']app-visibility["']\s+content=["']private["']/i.test(html);
}

const apps = files
  .map((filename) => {
    const raw = readFileSync(join(APPS_DIR, filename), 'utf8');
    return { filename, raw };
  })
  .filter(({ raw }) => !isPrivate(raw))
  .map(({ filename, raw }) => {
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
const featured = N ? apps[0] : null;

function rowHtml(app, i) {
  const grad = 'g' + ((i % GRADIENT_COUNT) + 1);
  const category = app.tags.length ? titleCase(app.tags[0].replace(/-/g, ' ')) : 'App';
  return (
    '<a class="row" href="apps/' + escapeHtml(app.filename) + '">\n' +
    '          <div class="icon ' + grad + '">' + escapeHtml(monogram(app.name)) + '</div>\n' +
    '          <div class="info">\n' +
    '            <p class="name">' + escapeHtml(app.name) + '</p>\n' +
    '            <p class="desc">' + escapeHtml(app.description) + '</p>\n' +
    '            <p class="cat">' + escapeHtml(category) + '</p>\n' +
    '          </div>\n' +
    '          <span class="open" aria-hidden="true">OPEN</span>\n' +
    '        </a>'
  );
}

const heroHtml = featured
  ? '<a class="hero" href="apps/' + escapeHtml(featured.filename) + '">\n' +
    '      <div class="kicker">Latest ship &middot; ' + escapeHtml(formatDate(featured.date)) + '</div>\n' +
    '      <h2>' + escapeHtml(featured.name) + '</h2>\n' +
    '      <p>' + escapeHtml(featured.description) + '</p>\n' +
    '      <div class="bar">\n' +
    '        <div class="mini-icon">' + escapeHtml(monogram(featured.name)) + '</div>\n' +
    '        <div class="meta">\n' +
    '          <div class="n">' + escapeHtml(featured.name) + '</div>\n' +
    '          <div class="d">' + escapeHtml(featured.tags.slice(0, 3).join(' \u00B7 ')) + '</div>\n' +
    '        </div>\n' +
    '        <span class="get" aria-hidden="true">OPEN</span>\n' +
    '      </div>\n' +
    '    </a>'
  : '';

const half = Math.ceil(N / 2);
const columns = [apps.slice(0, half), apps.slice(half)].filter((c) => c.length);
const listsHtml = columns
  .map(
    (col, c) =>
      '<div class="list">\n        ' +
      col.map((app, i) => rowHtml(app, c * half + i)).join('\n        ') +
      '\n      </div>'
  )
  .join('\n      ');

const emptyHtml =
  '<div class="empty"><p>Nothing yet. Day 1 starts now.</p></div>';

const body =
  N === 0
    ? '    ' + emptyHtml
    : '    ' + heroHtml + '\n' +
      '    <div class="section-head">\n' +
      '      <h3>All apps</h3>\n' +
      '      <span class="count">' + N + ' shipped</span>\n' +
      '    </div>\n' +
      '    <div class="lists">\n      ' + listsHtml + '\n    </div>';

const html =
  '<!doctype html>\n' +
  '<html lang="en">\n' +
  '<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">\n' +
  '<title>lab. &mdash; Simon Sangla</title>\n' +
  '<meta name="description" content="One day. One app. No excuses.">\n' +
  '<meta property="og:type" content="website">\n' +
  '<meta property="og:url" content="https://lab.simonsangla.com/">\n' +
  '<meta property="og:title" content="lab. \u2014 One day. One app. No excuses.">\n' +
  '<meta property="og:description" content="' + N + ' micro-apps shipped, one per day, by Simon Sangla \u2014 Snowflake analytics consultant.">\n' +
  '<meta property="og:image" content="https://lab.simonsangla.com/og.png">\n' +
  '<meta property="og:image:width" content="1200">\n' +
  '<meta property="og:image:height" content="630">\n' +
  '<meta name="twitter:card" content="summary_large_image">\n' +
  '<link rel="manifest" href="/manifest.webmanifest">\n' +
  '<meta name="theme-color" content="#009A44">\n' +
  '<link rel="icon" type="image/png" href="/icons/icon-192.png">\n' +
  '<link rel="apple-touch-icon" href="/icons/icon-192.png">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n' +
  '<meta name="apple-mobile-web-app-title" content="lab.">\n' +
  '<script defer src="https://cdn.vercel-insights.com/v1/script.js"></script>\n' +
  '<style>\n' +
  '  :root {\n' +
  '    --green: #009A44;        /* Basque green - Pantone 348C (ikurrina) */\n' +
  '    --green-hero: #00853B;   /* darkest hero-gradient start that keeps white text AA (4.75:1) */\n' +
  '    --green-dark: #00702F;\n' +
  '    --green-deep: #064E26;\n' +
  '    --green-tint: #E5F5EC;\n' +
  '    --bg: #ffffff;\n' +
  '    --card: #ffffff;\n' +
  '    --text: #1d1d1f;\n' +
  '    --muted: #6e6e73;\n' +
  '    --hairline: rgba(0,0,0,0.10);\n' +
  '    --font: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
  '    --font-mono: "IBM Plex Mono", ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;\n' +
  '  }\n' +
  '  * { box-sizing: border-box; }\n' +
  '  html, body { margin: 0; padding: 0; }\n' +
  '  html { -webkit-text-size-adjust: 100%; }\n' +
  '  body {\n' +
  '    background: var(--bg);\n' +
  '    color: var(--text);\n' +
  '    font-family: var(--font);\n' +
  '    min-height: 100dvh;\n' +
  '    padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(48px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));\n' +
  '    -webkit-font-smoothing: antialiased;\n' +
  '    overscroll-behavior-y: contain;\n' +
  '  }\n' +
  '  a, button { -webkit-tap-highlight-color: transparent; }\n' +
  '  a:focus-visible { outline: 3px solid var(--green-dark); outline-offset: 2px; }\n' +
  '  .wrap { max-width: 980px; margin: 0 auto; }\n' +
  '  .eyebrow {\n' +
  '    font-family: var(--font-mono);\n' +
  '    font-size: 12px; font-weight: 600; letter-spacing: 0.14em;\n' +
  '    text-transform: uppercase; color: var(--green-dark); margin: 8px 0 2px;\n' +
  '  }\n' +
  '  .masthead { display: flex; align-items: center; justify-content: space-between; gap: 16px; }\n' +
  '  .masthead h1 {\n' +
  '    font-size: 34px; font-weight: 800; letter-spacing: -0.02em;\n' +
  '    margin: 0; line-height: 1.1;\n' +
  '  }\n' +
  '  .masthead h1 .dot { color: var(--green); }\n' +
  '  .avatar {\n' +
  '    width: 44px; height: 44px; border-radius: 50%;\n' +
  '    background: linear-gradient(135deg, var(--green), var(--green-dark));\n' +
  '    color: #fff; font-weight: 700; font-size: 16px;\n' +
  '    display: flex; align-items: center; justify-content: center;\n' +
  '    flex-shrink: 0; text-decoration: none;\n' +
  '  }\n' +
  '  .site-nav { display: flex; align-items: center; gap: 12px; }\n' +
  '  .site-link {\n' +
  '    font-family: var(--font-mono); font-size: 12px; font-weight: 600;\n' +
  '    letter-spacing: 0.04em; color: var(--green-dark); text-decoration: none;\n' +
  '  }\n' +
  '  .site-link:hover { text-decoration: underline; }\n' +
  '  @media (max-width: 460px) { .site-link { display: none; } }\n' +
  '  .lede { color: var(--muted); font-size: 15px; line-height: 1.45; margin: 10px 0 0; max-width: 56ch; }\n' +
  '  .stats { display: flex; gap: 8px; margin: 16px 0 24px; flex-wrap: wrap; }\n' +
  '  .chip {\n' +
  '    background: var(--green-tint); color: var(--green-dark);\n' +
  '    font-family: var(--font-mono);\n' +
  '    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;\n' +
  '    padding: 5px 11px; border-radius: 8px;\n' +
  '  }\n' +
  '  .hero {\n' +
  '    display: block; text-decoration: none; color: var(--text);\n' +
  '    background: var(--card);\n' +
  '    background-image: radial-gradient(120% 90% at 90% -20%, var(--green-tint), transparent 60%);\n' +
  '    border: 1px solid var(--hairline); border-radius: 20px; padding: 28px 24px;\n' +
  '    box-shadow: 0 1px 2px rgba(0,0,0,0.04);\n' +
  '    position: relative; overflow: hidden;\n' +
  '    transition: border-color 200ms ease;\n' +
  '    animation: fadeUp 400ms ease both;\n' +
  '  }\n' +
  '  @media (hover: hover) { .hero:hover { border-color: var(--green); } }\n' +
  '  .hero .kicker { font-family: var(--font-mono); color: var(--green-dark); font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }\n' +
  '  .hero h2 { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; margin: 10px 0 8px; line-height: 1.1; }\n' +
  '  .hero p { font-size: 15px; line-height: 1.5; margin: 0; color: var(--muted); max-width: 52ch; }\n' +
  '  .hero .bar { display: flex; align-items: center; gap: 12px; margin-top: 22px; }\n' +
  '  .hero .mini-icon {\n' +
  '    width: 48px; height: 48px; border-radius: 12px;\n' +
  '    background: var(--green-tint); color: var(--green-dark);\n' +
  '    display: flex; align-items: center; justify-content: center;\n' +
  '    font-weight: 700; font-size: 15px; letter-spacing: -0.01em;\n' +
  '  }\n' +
  '  .hero .bar .meta { flex: 1; min-width: 0; }\n' +
  '  .hero .bar .meta .n { font-size: 14px; font-weight: 700; }\n' +
  '  .hero .bar .meta .d { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }\n' +
  '  .hero .get {\n' +
  '    background: var(--green); color: #fff;\n' +
  '    font-size: 14px; font-weight: 600;\n' +
  '    padding: 10px 22px; border-radius: 10px;\n' +
  '  }\n' +
  '  .section-head {\n' +
  '    display: flex; align-items: baseline; justify-content: space-between;\n' +
  '    margin: 32px 0 8px;\n' +
  '  }\n' +
  '  .section-head h3 { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; margin: 0; }\n' +
  '  .section-head .count { font-size: 13px; font-weight: 600; color: var(--green-dark); }\n' +
  '  .list {\n' +
  '    background: var(--card); border: 1px solid var(--hairline); border-radius: 16px;\n' +
  '    padding: 6px 16px;\n' +
  '    box-shadow: 0 1px 2px rgba(0,0,0,0.04);\n' +
  '    animation: fadeUp 400ms ease both;\n' +
  '  }\n' +
  '  .row {\n' +
  '    display: flex; align-items: center; gap: 14px;\n' +
  '    padding: 14px 0; text-decoration: none; color: inherit;\n' +
  '    border-bottom: 1px solid var(--hairline);\n' +
  '  }\n' +
  '  .row:last-child { border-bottom: none; }\n' +
  '  .icon {\n' +
  '    width: 60px; height: 60px; border-radius: 14px; flex-shrink: 0;\n' +
  '    display: flex; align-items: center; justify-content: center;\n' +
  '    color: #fff; font-weight: 800; font-size: 19px; letter-spacing: -0.02em;\n' +
  '    box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.06);\n' +
  '  }\n' +
  '  .row .info { flex: 1; min-width: 0; }\n' +
  '  .row .name { font-size: 16px; font-weight: 600; margin: 0; }\n' +
  '  .row .desc {\n' +
  '    font-size: 13px; color: var(--muted); margin: 3px 0 0; line-height: 1.35;\n' +
  '    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;\n' +
  '  }\n' +
  '  .row .cat { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--green-dark); margin-top: 4px; }\n' +
  '  .open {\n' +
  '    background: var(--green-tint); color: var(--green-dark);\n' +
  '    font-family: var(--font-mono);\n' +
  '    font-size: 12px; font-weight: 600;\n' +
  '    padding: 8px 14px; border-radius: 8px; flex-shrink: 0;\n' +
  '  }\n' +
  '  .g1 { background: linear-gradient(135deg, #00B450, #00803A); }\n' +
  '  .g2 { background: linear-gradient(135deg, #2BC06A, #009A44); }\n' +
  '  .g3 { background: linear-gradient(135deg, #0E5E33, #0B3D22); }\n' +
  '  .g4 { background: linear-gradient(135deg, #00A86B, #006B3C); }\n' +
  '  .g5 { background: linear-gradient(135deg, #4CCB7E, #1B7A45); }\n' +
  '  .g6 { background: linear-gradient(135deg, #007A4D, #00472B); }\n' +
  '  .g7 { background: linear-gradient(135deg, #18A558, #0E6B38); }\n' +
  '  .cta {\n' +
  '    display: flex; align-items: center; justify-content: space-between; gap: 16px;\n' +
  '    background: var(--card); border-radius: 20px; padding: 20px;\n' +
  '    box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 28px;\n' +
  '    text-decoration: none; color: inherit;\n' +
  '  }\n' +
  '  .cta .t { font-size: 16px; font-weight: 700; margin: 0; }\n' +
  '  .cta .s { font-size: 13px; color: var(--muted); margin: 3px 0 0; }\n' +
  '  .cta .btn {\n' +
  '    background: var(--green); color: #fff;\n' +
  '    font-size: 14px; font-weight: 600;\n' +
  '    padding: 10px 22px; border-radius: 10px; flex-shrink: 0;\n' +
  '  }\n' +
  '  .empty { text-align: center; padding: 64px 0; }\n' +
  '  .empty p { color: var(--muted); font-style: italic; }\n' +
  '  footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 36px; line-height: 1.6; }\n' +
  '  footer a { color: var(--green-dark); text-decoration: none; font-weight: 600; }\n' +
  '  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }\n' +
  '  @media (prefers-reduced-motion: reduce) {\n' +
  '    .hero, .list { animation: none; transition: none; }\n' +
  '  }\n' +
  '  @media (min-width: 720px) {\n' +
  '    .masthead h1 { font-size: 40px; }\n' +
  '    .hero { padding: 32px; }\n' +
  '    .hero h2 { font-size: 36px; }\n' +
  '    .list { padding: 6px 24px; }\n' +
  '    .lists { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }\n' +
  '  }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '  <div class="wrap">\n' +
  '    <p class="eyebrow" id="eyebrow">One day. One app.</p>\n' +
  '    <header class="masthead">\n' +
  '      <h1>lab<span class="dot">.</span></h1>\n' +
  '      <div class="site-nav">\n' +
  '        <a class="site-link" href="https://simonsangla.com">simonsangla.com</a>\n' +
  '        <a class="avatar" href="https://simonsangla.com" aria-label="Simon Sangla - main site">SS</a>\n' +
  '      </div>\n' +
  '    </header>\n' +
  '    <p class="lede">One day. One app. No excuses. Daily micro-apps designed, built and shipped solo in under 24 hours &mdash; by Simon Sangla, Snowflake analytics consultant.</p>\n' +
  '    <div class="stats">\n' +
  '      <span class="chip">' + N + ' apps shipped</span>\n' +
  (since ? '      <span class="chip">since ' + escapeHtml(formatDate(since)) + '</span>\n' : '') +
  '    </div>\n' +
  body + '\n' +
  '    <a class="cta" href="mailto:simonsangla@gmail.com">\n' +
  '      <div>\n' +
  '        <p class="t">Work with me</p>\n' +
  '        <p class="s">Snowflake analytics, shipped at lab speed.</p>\n' +
  '      </div>\n' +
  '      <span class="btn">Get in touch</span>\n' +
  '    </a>\n' +
  '    <footer>\n' +
  '      Built by <a href="https://simonsangla.com">Simon Sangla</a> &middot; Snowflake Analytics Consultant<br>\n' +
  '      <a href="mailto:simonsangla@gmail.com">Email</a> &middot; <a href="https://github.com/simonsangla/lab">Source on GitHub</a>\n' +
  '    </footer>\n' +
  '  </div>\n' +
  '  <script>\n' +
  '    (function () {\n' +
  "      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];\n" +
  "      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];\n" +
  '      var now = new Date();\n' +
  "      document.getElementById('eyebrow').textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();\n" +
  '    })();\n' +
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
