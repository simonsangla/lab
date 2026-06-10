# REUSE.md — repository audit & reuse map

Audit date: 2026-06-10 · 8 apps shipped · scope: everything in `simonsangla/lab`.
Verdict up front: **the factory already half-exists.** The repo has a working
metadata→gallery generator, an auto-regen CI workflow, a zero-config deploy, a
backlog intake (Chat Triage feed + `/triage-chats` skill), and a proven
test-harness pattern. What's missing is a written spec contract, validation
gates, and screenshot verification — not new architecture.

## Inventory

| Asset | What it is | Verdict |
|---|---|---|
| `apps/*.html` (8) | Standalone single-file PWA apps, 12–48 KB | **KEEP** — the product |
| `apps/2026-05-31-pomodoro-brutal.html` | Canonical dark-token head/CSS shell (lines 1–60) | **KEEP** — de-facto app template; every new app copies it |
| `apps/2026-05-30-at-risk-today.html` | Live-source + demo-fallback + connection-wizard patterns | **KEEP** — pattern donor |
| `apps/2026-06-10-chat-triage.html` | Feed-driven triage board (scan feed + GitHub live source) | **KEEP** — the factory's intake UI |
| `index.html` | Generated landing/gallery | **KEEP (generated)** — never hand-edit; fixes go in gen-index.mjs |
| `scripts/gen-index.mjs` | Meta-tags → gallery generator, stdlib, idempotent | **KEEP / IMPROVE** — landing P0/P1 fixes land here (see below) |
| `scripts/gen-icons.mjs` | Deterministic stdlib PNG icon generator | **IMPROVE** — artwork still the placeholder deferred in PR #1 |
| `scripts/scan-sessions.mjs` | Session-log scanner feeding the Chat Triage backlog | **KEEP** — factory intake |
| `.claude/skills/triage-chats/` | Skill: scan → classify backlog/WIP → publish feed (privacy gate) | **KEEP** — factory intake; template for further skills |
| `.github/workflows/gen-index.yml` | Auto-regen index on push to main, `[skip ci]` commit | **KEEP** — only CI; the factory's verification Action would sit beside it |
| `vercel.json` / Vercel project | Zero-build static deploy, PR previews, prod on main | **KEEP** — deployment is solved |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA plumbing; network-first docs, cache-first static | **KEEP** — note: `CACHE='lab-v1'` never rotates (only bites immutable assets) |
| `data/chat-triage.json` | Published triage feed (titles only) | **KEEP** — the factory's job queue |
| `AGENTS.md` / `README.md` | Shipping conventions | **IMPROVE** — "Last shipped" stale (still says 2026-05-26); add spec contract once approved |
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
   labeled demo data when unreachable, never persist demo state. (At Risk Today,
   Chat Triage.)
4. **localStorage privacy posture** — state in one namespaced key, "stored only
   in this browser" copy, no credentials on the public origin (rule established
   in PR #4).
5. **parse → preview → confirm** for any data import; never silent mutation.
6. **Single `render()` + `wire()` loop** with `data-*` dispatch and
   `captureForm()` across re-renders.
7. **DOM-stub Node harness** — run the app's inline script in Node with stubbed
   document/localStorage/fetch and assert on state. Proven in PR #7 (15/15
   assertions, caught a real fetch-race bug). Currently a throwaway in /tmp —
   **the single highest-value thing to productize** (`scripts/smoke.mjs`).
8. **Skill → scanner → published JSON feed → app** — the Chat Triage pipeline
   shape generalizes to any "agent writes, static app renders" feature.

## Gaps (what the factory still needs)

- **No spec contract**: app requirements live in chat prompts; nothing enforces
  description length, tag count, data-source class, or acceptance checks before
  generation. (Cost evidence: PR #7 needed 3 corrective rounds — see APP_FACTORY.md §validation-evidence.)
- **No validation gates in CI**: syntax/meta/harness checks ran ad-hoc in
  sessions, not as a workflow.
- **No screenshot/browser verification**: the remote sandbox cannot reach
  vercel.app or run a browser; only CI can do this (Playwright Action against
  the preview URL).
- **No landing conversion path**: full review with P0/P1/P2 fixes is in
  `docs/APP_FACTORY.md` §appendix-landing; headline P0s: no contact/GitHub
  links anywhere, positioning only in the footer, zero og/twitter share meta.
- **Icon artwork**: still placeholders (PR #1 deferral; was queued as the
  board's top backlog item).

## KEEP / IMPROVE / REMOVE summary

- **KEEP**: generator pipeline, workflow, Vercel setup, PWA plumbing, all apps,
  skill + scanner + feed, conventions docs.
- **IMPROVE**: gen-index.mjs (landing P0/P1), gen-icons.mjs (artwork),
  AGENTS.md (stale + add spec contract), harness (promote /tmp pattern to
  `scripts/smoke.mjs`), CI (add validation/screenshot workflow).
- **REMOVE**: nothing.
