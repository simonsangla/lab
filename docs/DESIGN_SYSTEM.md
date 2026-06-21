# Design System — audit, migration plan & recommendation

_Audit date: 2026-06-21 · scope: `simonsangla/lab` (homepage + 15 apps)._

## The system (single source of truth)

The lab already has a centralized design system. **Do not build a parallel one — improve this:**

| Module | Role |
|---|---|
| `assets/lab-theme.css` | The canonical sheet. `:root` tokens (surfaces, ink, border, status scale) mirror **`@simon/tokens`** (simon-platform `packages/@simon/tokens/.../themes/lab.css`); the lab keeps the Basque-green accent. Plus reusable components `.lab-kicker .lab-btn .lab-btn-quiet .lab-card .lab-chip .lab-good/-warn/-mid/-bad`, the `.lab-nav` bar, and the IBM Plex font `@import`. Linked **after** each page's inline `<style>` so it overrides the inline dark fallback with the live white-editorial identity. |
| `assets/lab-nav.js` | Injects the fixed top bar; inherits the inline `<a class="back">` href. |
| `.claude/skills/lab-brand-polish/` | The playbook that routes a page onto the system. |

**The contract** (per `lab-brand-polish`): link `lab-theme.css` after inline `<style>`; keep the inline dark `:root` as the `file://` fallback; route all color through tokens; use `.lab-*` components instead of bespoke ones; type from `--font-display` / `--font-mono`.

## Audit — current adoption

Every page links `lab-theme.css`; every app links `lab-nav.js` and uses `.lab-*` components. Adoption is **high**, not absent. Counts (`.lab-*` component uses / raw `#rrggbb` literals):

| File | lab-uses | rawhex | Notes |
|---|---|---|---|
| `index.html` (homepage) | 23 | 14 | No `lab-nav.js` by design (it's the home). **Fixed this pass:** adopted `.lab-kicker` (was bespoke `.kicker`/`.section-kicker`). rawhex = inline `:root` dark fallback. |
| `2026-06-13-mercor-portfolio.html` | 18 | 8 | ⚠️ Separately-built 642 KB file with its own palette (`#2563eb` blue); loosest token-contract follower. Heaviest migration item. |
| other 14 apps | 3–18 | 8–27 | Contract-following. Most `rawhex` is the by-design inline `:root` fallback; the migration surface is **JS color literals** + any bespoke button/card that should adopt a `.lab-*` class. |

### Loop result (2026-06-21) — already compliant

A deep app-by-app audit (the `lab-brand-polish` loop) found **no genuine
migration work left**. Every app already routes color through the shared tokens:
JS ramps use `var(--token, #hex)` or the canvas `token('--x', #hex)` helper; the
only two *raw* literals are intentional — cohort-grid's `#ffffff` contrast ink
(theme-agnostic) and chart-forge's `PALETTE_FALLBACK` (a categorical multi-series
palette that requires distinct colors). Every non-`.lab-*` `<button>` is a
stepper / tab / segmented toggle (correctly not a CTA). `mercor-portfolio` routes
through `var(--lab-green-tint/--accent/--text)`; its blue is only the inline
`:root` `file://` fallback. The homepage kicker (the one real reinvention) was
fixed this pass. **Net: 0 per-app commits needed; the system is unified.**

### Gaps (originally suspected — now closed)
1. **Bespoke re-implementations of existing components** — the homepage kicker was the clearest (now fixed). Audit each app for bespoke buttons/cards/chips/kickers that duplicate a `.lab-*` component instead of adopting it (technique 2).
2. **Off-brand raw hex in JS** — color literals injected via inline `style`/canvas that bypass tokens stay off-brand on live (technique 1: `var(--token, #hex)`).
3. **`mercor-portfolio`** — its own palette/structure; needs the most work to route through tokens (or an explicit decision to exempt it as an embedded artifact).
4. **Structural duplication (by design, low priority)** — every page repeats the inline `:root` dark fallback. Required for `file://`, so it's a scaffold/generator concern, not runtime drift. Leave unless a scaffold step is added.
5. **Font double-load (repo-wide, cosmetic)** — pages load IBM Plex via `<link>` *and* `lab-theme.css` `@import`s it. Pre-existing; out of scope.

## Migration cost

| Item | Effort | Status |
|---|---|---|
| Homepage `.lab-kicker` + gallery masthead adoption | done this pass | ✅ done |
| Per app: adopt components + tokenize JS color literals | audited 15/15 | ✅ already compliant (loop found 0 gaps) |
| `mercor-portfolio` | audited | ✅ already token-routed (blue is `file://` fallback only) |
| Automated drift guard (extend `scripts/lint-app.mjs`) | ~1–2 h once | ⬜ recommended (prevention, not migration) |
| **Total remaining** | **~1–2 h** (the optional drift lint) | low |

No new architecture, and — as it turns out — no migration backlog either. The
only forward item is the optional drift-lint that keeps it this way.

## Recommendation

1. **Keep `lab-theme.css` as the single source** (it already mirrors `@simon/tokens`). Never fork it per page; when a recurring visual is missing, add it **once** to `lab-theme.css`, then consume it.
2. **Homepage**: done — uses `.lab-kicker`; keep its page-specific *layout* CSS (`.service/.work/.steps/.stats/.contact/.topbar`) since those are genuinely unique and have no shared equivalent.
3. **Apps**: ✅ done — the app-by-app `lab-brand-polish` loop audited all 15 and found them already compliant (see "Loop result" above). Re-run the loop only when new apps land.
4. **Automate the audit** so drift can't return: extend `scripts/lint-app.mjs` to warn on (a) a `<style>` block redefining a `.lab-*` class, and (b) raw hex inside `<script>` not wrapped in `var(--token, …)`. This turns the manual audit above into a gate.
5. **Decide on `mercor-portfolio`**: migrate to tokens, or formally exempt it (embedded portfolio artifact) and document the exception.

## Verification (per migrated page)
```bash
node scripts/lint-app.mjs apps/<file>   # meta/theme-link + JS syntax; 0 errors
node scripts/smoke.mjs apps/<file>      # loads/renders; 0 failures
node scripts/gen-index.mjs && git diff --exit-code gallery.html   # gallery idempotent
```
Then confirm on a Vercel preview that tokens resolve to brand colors (white surface, Basque-green accent) with no console errors.
