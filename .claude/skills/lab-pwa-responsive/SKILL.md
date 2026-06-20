---
name: lab-pwa-responsive
description: Use when making a lab app (simonsangla/lab) installable/offline-capable as a PWA, fixing responsiveness or mobile layout, or fixing the top-bar "back" navigation. Codifies the PWA contract (manifest, theme-color, apple metas, icons, service-worker registration + cache-version discipline), the responsive contract (viewport-fit, dvh, safe-area, breakpoints, tap targets, no horizontal scroll), and the navigation contract (top-bar back always returns to the lab home). Triggers on "make it a PWA", "installable", "offline", "responsive", "mobile layout broken", "safe area / notch", "stale / previous version", "back button goes to the wrong place", "service worker", "viewport".
---

# Lab PWA + Responsive

Make every lab app installable, offline-capable, fully responsive, and correctly
navigable — without per-app guesswork. This is the standing contract; apply it to
new and existing apps. Pairs with `lab-brand-polish` (visual identity) and
`lab-app-factory` (generation). **No demo/example app** — this is a checklist +
canonical snippets applied in place.

## Source of truth (read first)
- `sw.js` — the service worker: precache list, `CACHE` version, fetch strategy.
- `manifest.webmanifest` — install metadata + icons.
- `assets/lab-nav.js` — injects the fixed top bar; inherits the inline back link.
- `assets/lab-theme.css` — `.lab-nav*`, `body.has-lab-nav` top offset.
- `scripts/scaffold-app.mjs` — already emits the correct head, back link and metas.

---

## 1. Navigation contract (the back button)

The top bar's back affordance MUST return to the **lab home** (the gallery), from
any app, at any host depth.

- Canonical inline link, exactly: `<a class="back" href="/">&larr; lab.</a>`.
  `lab-nav.js` reads this href into the bar (`back.href = old.getAttribute('href')`),
  so the bar inherits whatever the inline link points at.
- **Use the absolute `/`. Never `../`** — relative `../` only happens to work
  because the lab is hosted at root; it is brittle and is the cause of "back goes to
  the previous level/app version". Any in-app "to the lab" link (footer, secondary
  CTA) uses `/` too.
- **Never** `history.back()` / `history.go(-1)` for the back affordance — that
  follows browser history into the *previously viewed app*, not the gallery.
- Audit: `grep -rn 'href="\.\./"' apps/*.html` must return nothing;
  `grep -c 'class="back" href="/"' apps/*.html` should be every app.

---

## 2. PWA contract

Every app's `<head>` (the scaffolder emits all of this):
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#009A44">`
- `<meta name="apple-mobile-web-app-capable" content="yes">` + status-bar-style + title
- icon links: `/icons/icon-192.png` (+ apple-touch-icon).

`manifest.webmanifest` provides `name`/`short_name`/`start_url:"/"`/`scope:"/"`/
`display:"standalone"`/`theme_color`/`background_color` + 192, 512 and **maskable**
icons. Scope `/` means one SW controls the whole lab.

### Service worker registration
Register `/sw.js` from the app so it works installed/offline even when opened
directly (not only via the gallery). Put this at the end of the inline script —
it's smoke-safe (the harness `navigator` has no `serviceWorker`, so the guard is
false and nothing runs):
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
```

### Cache strategy + the staleness rule (why "previous version" happens)
`sw.js` is already tuned:
- **Documents** (`/`, `*.html`) → **network-first**, cache fallback. Keeps HTML
  fresh, so a deploy is visible immediately and the back-to-home view is current.
- **Same-origin assets** → stale-while-revalidate (instant load, refresh in
  background).
- `activate` deletes every cache whose key ≠ `CACHE`, then `clients.claim()`.

**Hard rule:** when you change a *precached* shared asset (`lab-theme.css`,
`lab-nav.js`, icons, manifest — the `PRECACHE` list), **bump `CACHE`** in `sw.js`
(`lab-v2` → `lab-v3` …). The precache is only rebuilt on install of a new SW, and a
new SW only installs when `sw.js` changes byte-for-byte. Skip the bump and clients
keep serving the **previous version** of those assets. App HTML doesn't need a bump
(it's network-first), but the cache name bump is the single discipline that
prevents stale shared chrome.

---

## 3. Responsive contract

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  (the `viewport-fit=cover` is required for safe-area insets to apply).
- `body { min-height: 100dvh; }` (dynamic viewport height — not `100vh`, which jumps
  under mobile browser chrome).
- Safe-area padding on `body`:
  `padding: max(64px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(48px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));`
  When `lab-nav.js` runs it adds `body.has-lab-nav`, whose rule in `lab-theme.css`
  overrides the top padding to clear the fixed bar (`safe-area-inset-top + 62px`).
- Fluid container: `.wrap { max-width: <=860px; margin: 0 auto; }` — never a fixed
  pixel width.
- **Mobile-first**: base styles target the phone; widen with
  `@media (min-width: 720px)` (or 760px) for multi-column grids. Single-column by
  default.
- **No horizontal scroll**: no element wider than the viewport; long content wraps
  or scrolls inside its own box; tables/`pre`/wide SVG get `overflow-x:auto` or
  scale to 100% width. Charts/canvas size to their container, not a fixed px.
- **Tap targets ≥ 44px**: `.lab-btn`/`.lab-btn-quiet` and `.lab-nav-back` already
  satisfy this; custom controls must too.
- `@media (prefers-reduced-motion: reduce)` disables non-essential animation.
- `<html>` keeps `-webkit-text-size-adjust: 100%`; inputs use `font-size ≥ 13px`
  (avoid iOS zoom-on-focus surprises).

---

## Workflow (applying this to an app)
1. Head: confirm the viewport (with `viewport-fit=cover`), manifest, theme-color,
   apple metas, icons.
2. Back link: `<a class="back" href="/">`; kill any `../`.
3. SW: ensure the registration snippet is present.
4. Layout: `100dvh`, safe-area padding, fluid `.wrap`, mobile-first breakpoints, no
   overflow, ≥44px targets.
5. If you touched a precached shared asset, **bump `CACHE` in `sw.js`**.

## Verification
- `npm run lint` (0 errors) · `npm run smoke` (0 failures) — the SW snippet and
  back-href are smoke-safe.
- `grep -rn 'href="\.\./"' apps/*.html` → empty.
- Responsive proof: the CI Playwright pass (`.github/workflows/verify-apps.yml`)
  screenshots each app at **375×812** (mobile) and **1280×800** (desktop) and fails
  on console errors — check the artifacts for overflow/clipping.
- PWA proof: load the preview, confirm install prompt / standalone display and that
  a redeploy of a bumped asset is picked up (no previous-version chrome).
