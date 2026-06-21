---
name: lab-brand-polish
description: Use when polishing, restyling, or brand-checking the lab PWA (simonsangla/lab) - the homepage (index.html) and every app - against the ONE centralized design system (assets/lab-theme.css tokens-from-@simon/tokens + reusable .lab-* components + lab-nav.js), unifying to the shared white-editorial identity (IBM Plex Sans/Mono, mono UPPERCASE green kicker labels, Basque green #009A44 accent) by consuming the shared modules instead of reinventing them, or auditing for brand drift / design-system migration. Triggers on "polish the lab app", "make it on-brand", "brand unity", "unified design system", "centralized/reusable components", "apply simonsangla.com design", "use the shared component", "lab-theme", "lab-nav", "audit brand drift", or before shipping any new lab app.
---

# Lab Brand Polish

Bring any lab page onto the one shared brand identity by routing it through the
reusable components, without homogenizing the pages. Unify the **system**, keep
each page's **character**. Applies to **every page**: the homepage
(`index.html`) and all `apps/*.html`.

**Never reinvent the wheel.** Before writing any visual CSS, search
`assets/lab-theme.css` for an existing token/component and consume it. Bespoke
re-implementations of something the sheet already provides (a kicker, a button,
a card) are the #1 source of drift. The full audit + migration plan + cost is
in [docs/DESIGN_SYSTEM.md](../../../docs/DESIGN_SYSTEM.md).

## Source of truth (read these first)

- `assets/lab-theme.css` - tokens + reusable components (`.lab-kicker`, `.lab-btn`, `.lab-btn-quiet`, `.lab-card`, `.lab-chip`, status scale, `.lab-nav`) + the IBM Plex font `@import`. Linked AFTER each app's inline `<style>`; it OVERRIDES the inline dark `:root` to the live identity: **white editorial surface, IBM Plex Sans (display/body) + IBM Plex Mono (labels), mono UPPERCASE green kicker labels, Basque green `#009A44` accent, ~10px buttons, hairline-bordered cards** (ported from simonsangla.com).
- `assets/lab-nav.js` - injects the fixed top bar; needs an inline `<a class="back" href="/">` and a top-level `<h1>`.
- `AGENTS.md` / `REUSE.md` - shipping conventions + reuse map.

## The contract every app must keep

1. Links `/assets/lab-theme.css` after its inline `<style>`, and `/assets/lab-nav.js` deferred.
2. Keeps its inline dark `:root` tokens as the standalone `file://` fallback - do NOT remove them.
3. Has `<a class="back" href="/">` + a top-level `<h1>` (the nav bar hooks both).
4. Routes ALL colors through shared tokens so the override reaches them:
   `--bg(white) --surface --border --accent(green) --text --muted --green --yellow --orange --red`.
   Any raw hex that bypasses a token stays off-brand on the live theme.
5. Type comes from the shared tokens too: `--font-display` (IBM Plex Sans) for body/headings, `--font-mono` (IBM Plex Mono) for labels/kickers/code. The fonts load via `@import` in lab-theme.css, so apps need no font `<link>` of their own on live.

**Homepage exception (`index.html`):** the landing page follows items 1, 2, 4, 5
but **not** 3 — it IS the lab home, so it has no `lab-nav.js` / `<a class="back">`
(it links *out* to `/gallery.html`). Everything else (tokens, `.lab-*`
components, `.lab-kicker` labels) applies identically.

## Reusable components (use instead of bespoke)

| Need | Class | Notes |
|---|---|---|
| Section / label | `.lab-kicker` | mono UPPERCASE green label - the simonsangla.com signature; use for eyebrows, section headers, category tags |
| Primary action | `.lab-btn` | solid green, ~10px radius, 44px min touch target |
| Secondary action | `.lab-btn-quiet` | white + hairline border + dark text (the "See offers" style), 44px |
| Surface / panel | `.lab-card` | white, hairline border, 16px radius, minimal shadow |
| Tag / pill | `.lab-chip` | mono green-tint pill |
| Status badge / heat | `.lab-good` `.lab-warn` `.lab-mid` `.lab-bad` | green / yellow / amber / red, white text |

Leave genuinely-semantic NON-CTA elements alone (status verdict displays,
steppers). A button is a CTA; a colored result label is not.

## Two techniques that make it work

### 1. Tokenize JS color literals -> `var(--token, originalHex)`

When JS injects a color as an inline `style`, replace the raw hex with a
token-with-fallback. On live the token resolves to the brand color; on `file://`
the original hex renders. No behavior change.

```js
// before
if (n > 9) return '#ef4444';
// after
if (n > 9) return 'var(--red, #ef4444)';
```

Exception: a `<canvas>` / PNG export cannot read CSS vars. Read the value once:

```js
function token(name, fallbackHex) {
  try {
    if (typeof getComputedStyle !== 'function') return fallbackHex; // smoke sandbox / file://
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallbackHex;
  } catch (e) { return fallbackHex; }
}
ctx.fillStyle = token('--surface', '#ffffff');
```

### 2. Adopt a component, keep a single-class fallback

Add the `.lab-*` class to the element. Keep a slim inline fallback for `file://`,
but its selector MUST be a single class (specificity `0,1,0`) so the later-loaded
`lab-theme.css` component WINS on live. Do NOT use a higher-specificity selector
(e.g. `.wrap button`, `0,1,1`) for the fallback - it will override the component.

```html
<button class="copy-fallback lab-btn-quiet" id="copy">Copy</button>
```
```css
/* file:// fallback only; .lab-btn-quiet (loaded later, equal specificity) wins on live */
.copy-fallback { min-height: 44px; background: transparent; color: var(--accent);
  border: 1px solid var(--accent); border-radius: 99px; padding: 8px 20px; }
```

## Workflow

1. **Audit** the page against the contract + the table above. List every bespoke button/card/chip/kicker that should adopt a `.lab-*` class, and every raw hex injected in JS. Quick coverage scan across all pages:
   ```bash
   for f in index.html apps/*.html; do
     printf '%-44s theme=%s nav=%s lab-uses=%s rawhex=%s\n' "$(basename "$f")" \
       "$(grep -c lab-theme.css "$f")" "$(grep -c lab-nav.js "$f")" \
       "$(grep -oE 'lab-(btn|btn-quiet|card|chip|kicker|good|warn|mid|bad)\b' "$f" | wc -l)" \
       "$(grep -oE '#[0-9a-fA-F]{6}\b' "$f" | wc -l)"
   done
   ```
   `lab-uses=0` or a `<style>` redefining a `.lab-*` class ⇒ reinvention; high `rawhex` outside the inline `:root` fallback ⇒ untokenized color.
2. **Adopt components** (technique 2) for buttons, surfaces, pills.
3. **Tokenize JS color ramps** (technique 1); for canvas, read computed tokens.
4. **Light polish within brand** only: empty-state hint, a card surface, `>=44px` targets, a `prefers-reduced-motion`-gated transition. NO redesign; preserve layout + character.
5. **Gate** locally from the repo root and fix until clean:
   ```bash
   node scripts/lint-app.mjs apps/<file>   # meta/filename/theme-link + inline-JS syntax (0 errors) + G6 brand-drift (warnings)
   node scripts/smoke.mjs apps/<file>      # loads/renders, no errors; 0 failures
   node scripts/gen-index.mjs && git diff --exit-code gallery.html   # gallery idempotent
   ```
   **G6 brand-drift** warns (never fails CI) when an inline `<style>` redefines a
   bare `.lab-*` component or a `<script>` injects raw hex not routed through
   `var(--token,#hex)`/`token()`. Theme-agnostic `#ffffff`/`#000000` are
   auto-allowed; mark any other deliberate literal (e.g. a categorical chart
   palette) with a `lab-allow-hex` comment on the line. Keep the warning count at
   **0** — a warning means drift to fix (adopt the component / tokenize the color).
6. **Verify on the live theme** in a preview (see gotcha below), confirming tokens resolve to brand colors and there are no console errors.

## Hard rules

- Do NOT edit the `<meta>` tags, `<title>`, filename, or the inline `:root` dark-token fallback block.
- Do NOT change app behavior/logic - this is restyling.
- ASCII only. Use HTML entities (`&#8249;` `&mdash;`) for glyphs in markup; for glyphs inside JS strings use `\uXXXX` (entities do not render there).
- Do NOT redefine the shared tokens/components inside an app - use them from `lab-theme.css`.

## Gotchas

- **Stale preview cache:** the apps register a service worker that caches the HTML and `/assets/*`. After editing, a preview navigation may serve the OLD file/CSS. To verify the real change, in the page: unregister service workers, `caches.delete(...)` all caches, reload with a cache-buster, and (if a token still won't resolve) inject a fresh `<link href="/assets/lab-theme.css?v=...">`.
- **`--green` resolves but a new token does not:** the cached `lab-theme.css` predates your token edit. Same fix - force a fresh stylesheet.
- **Canvas vars:** `getComputedStyle().getPropertyValue('--x')` returns `''` in the smoke sandbox and on `file://` - always pass a fallback hex.

## Extending the system

When several apps need the same new visual (e.g. a status color), add it ONCE to
`assets/lab-theme.css` (a token + optional utility class), then have the apps use
it. That keeps "one reusable component, used everywhere" true. Harden shared
components in place (e.g. touch targets) rather than per app.
