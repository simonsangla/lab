# REUSE.md — repository audit & reuse map

Audit date: 2026-06-21 · 15 apps in `apps/` (14 in the public gallery; `ai-money-map` hidden) · scope: everything in `simonsangla/lab`.
Verdict up front: **the factory already half-exists.** The repo has a working
metadata→gallery generator, an auto-regen CI workflow, a zero-config deploy, and
a proven test-harness pattern. The homepage is now the hand-authored **Hire
Simon** landing page (`index.html`); the generated gallery moved to
`gallery.html`. What's missing is a written spec contract and screenshot
verification — not new architecture.

## Inventory

| Asset | What it is | Verdict |
|---|---|---|
| `apps/*.html` (15) | Standalone single-file PWA apps, 10–48 KB | **KEEP** — the product |
| `index.html` | Hand-authored **Hire Simon** freelance landing page (sell-Simon home + curated 3 apps) | **KEEP** — edit directly; this is the homepage, not generated |
| `apps/2026-05-31-pomodoro-brutal.html` | Canonical app shell: head/meta lines 1–19, dark tokens + layout CSS 20–42 (app-specific styles begin after `.wrap`) | **KEEP** — de-facto app template; every new app copies it |
| `apps/2026-05-30-meeting-cost-clock.html` | Live-source + demo-fallback patterns | **KEEP** — pattern donor |
| `gallery.html` | Generated full app gallery (the archived previous homepage) | **KEEP (generated)** — never hand-edit; fixes go in gen-index.mjs |
| `scripts/gen-index.mjs` | Meta-tags → gallery generator, stdlib, idempotent; outputs `gallery.html`, honours a `HIDDEN` set | **KEEP / IMPROVE** — gallery P0/P1 fixes land here; harden `parseMeta` quote handling so the spec contract can drop its no-quotes rule |
| `scripts/gen-icons.mjs` | Deterministic stdlib PNG icon generator | **IMPROVE** — artwork still the placeholder deferred in PR #1 |
| ~~`scripts/scan-repos.mjs`, `scripts/scan-sessions.mjs`~~ | Repo/session scanners that built the Chat Triage feed | **REMOVED** — regenerated `data/chat-triage.json` (real internal state); deleted with the app in PR #15 follow-up |
| ~~`.claude/skills/triage-chats/`~~ | Skill orchestrating scan → publish `data/chat-triage.json` → deploy | **REMOVED** — public one-command re-leak procedure for the removed Chat Triage feed |
| `.claude/skills/lab-brand-polish/` | Skill: unify any app to the shared identity via `.lab-*` components (token-with-fallback, single-class fallback, status scale, gates) | **KEEP** — the brand-unity playbook; use before shipping/polishing an app |
| `.github/workflows/gen-index.yml` | Auto-regen `gallery.html` on push to main, `[skip ci]` commit | **KEEP** — `verify-apps.yml` (gates + screenshots) sits beside it |
| `vercel.json` / Vercel project | Zero-build static deploy, PR previews, prod on main | **KEEP** — deployment is solved |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA plumbing; network-first docs, cache-first static | **KEEP** — note: `CACHE='lab-v1'` never rotates (only bites immutable assets) |
| `AGENTS.md` / `README.md` | Shipping conventions | **KEEP** — "Last shipped" + homepage/gallery architecture current as of 2026-06-21; add spec contract once approved |
| `.semgrepignore`, `.gitattributes`, `.gitignore` | Hygiene | **KEEP** |
| **REMOVE** | — | Nothing. No dead code found; `HANDOFF.md` already gitignored. |

## Reusable patterns (extract by convention, not by library)

These recur across apps and should be named in the spec contract rather than
turned into shared runtime code (zero-dep rule):

1. **Canonical head block** — meta trio (`app-name`/`app-description`/`app-tags`),
   viewport-fit, manifest/theme/apple metas, Syne + JetBrains Mono. Source:
   Pomodoro lines 1–19.
2. **Dark token set** — `--bg #0a0a0a · --surface #141414 · --accent #29d8c7 ·
   --red/--yellow/--green`, safe-area body padding, `.wrap` ≤460px.
3. **Live source + demo fallback + provenance line** — fetch public API on load,
   labeled demo data when unreachable, never persist demo state. (Meeting Cost
   Clock.)
4. **localStorage privacy posture** — state in one namespaced key, "stored only
   in this browser" copy, no credentials on the public origin (rule established
   in PR #4).
5. **parse → preview → confirm** for any data import; never silent mutation.
6. **Single `render()` + `wire()` loop** with `data-*` dispatch and
   `captureForm()` across re-renders.
7. **DOM-stub Node harness** — run the app's inline script in Node with stubbed
   document/localStorage/fetch and assert on state. Proven in PR #7 (15/15
   assertions, caught a real fetch-race bug). Productized as `scripts/smoke.mjs`
   and run as a CI gate in `verify-apps.yml`.
8. ~~**Skill → scanner → published JSON feed → app**~~ — the Chat Triage pipeline
   shape (agent writes JSON, static app renders). **Removed** (PR #15/#16) for
   re-leaking internal state; kept here only as a pattern record.

## Gaps (what the factory still needs)

- **No spec contract**: app requirements live in chat prompts; nothing enforces
  description length, tag count, data-source class, or acceptance checks before
  generation. (Cost evidence: PR #7 needed 3 corrective rounds — see APP_FACTORY.md §validation-evidence.)
- **Screenshot/browser verification**: the remote sandbox cannot reach
  vercel.app or run a browser; this lives in CI (`verify-apps.yml` Playwright
  job against the preview URL). Done — keep an eye on flakiness.
- **Landing conversion path**: addressed — the homepage is now the **Hire Simon**
  landing with hero, services, contact/email + GitHub links, and og/twitter
  share meta; the gallery carries a "Work with me" CTA + masthead "Hire me".
- **Icon artwork**: still placeholders (PR #1 deferral; was queued as the
  board's top backlog item).

## KEEP / IMPROVE / REMOVE summary

- **KEEP**: Hire Simon homepage, gallery generator pipeline, workflows, Vercel
  setup, PWA plumbing, all apps, `lab-brand-polish` skill, conventions docs.
- **IMPROVE**: gen-index.mjs (gallery P0/P1), gen-icons.mjs (artwork),
  AGENTS.md (add spec contract), keep homepage curated picks fresh as new apps
  ship.
- **REMOVE**: nothing.
