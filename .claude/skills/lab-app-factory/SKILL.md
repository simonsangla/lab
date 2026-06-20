---
name: lab-app-factory
description: Use to mass-produce on-brand single-file lab apps (simonsangla/lab) from specs using nested builder sub-agents - the industrialized "spec -> scaffold -> build -> gate -> ship" pipeline. Triggers on "app factory", "build the lab apps", "ship the shortlist", "industrialize", "nested agents", "batch build apps", "build N apps", or turning a list of ideas into shipped lab tools.
---

# Lab App Factory

Turn a queue of specs into shipped, on-brand, gate-green single-file apps — at
scale, with **nested builder sub-agents** doing the per-app work and a lead agent
orchestrating. This is the industrial version of "ship a new app": instead of one
hand-built file, the lead fans out one builder per spec, then serializes the gate
+ commit. Pairs with `lab-brand-polish` (the brand contract) and reuses the
existing gates — it adds orchestration, not new infra.

## Hard constraints (non-negotiable)

- **Single file, zero deps, fully client-side.** No build step, no framework, no
  external JS. Everything inline in `apps/YYYY-MM-DD-slug.html`.
- **Deterministic / offline "AI".** Lab apps have **no backend and no credentials**
  (the smoke harness stubs `fetch` to fail). Any "AI" is in-browser and
  deterministic: heuristic scorers, regex analysis, combinatorial template banks.
  See the donor patterns below. Never ship a runtime LLM/API call as the happy path.
- **Privacy.** No credential ever reaches the public origin. State in one
  namespaced `localStorage` key, "stored only in this browser" copy if persisted.
- **Brand.** Obey `lab-brand-polish`: link `/assets/lab-theme.css` after the inline
  `<style>`, link `/assets/lab-nav.js` deferred, keep an `<a class="back">` + `<h1>`,
  route colors through tokens, use `.lab-*` components.

## The spec contract (intake gate — no build without it)

Each app is one spec file under `specs/` (see `specs/TEMPLATE.md`). Required:

- `app-name` — ≤24 chars, no quotes
- `app-description` — ONE sentence, ≤140 chars, no quotes (gen-index clamps + shares it)
- `app-tags` — ≤4, domain-first (e.g. `data,visualization,charts`)
- `slug` / `filename` — `apps/YYYY-MM-DD-<slug>.html` (date = ship date, lowercase slug)
- `intelligence` — exactly how the deterministic "AI" works (the algorithm)
- `reuse` — which donor utilities to lift (with file refs)
- `acceptance` — 3–7 testable checks ("paste CSV → bars render", "bad input → friendly error")
- `out-of-scope` — explicit non-goals (kills mid-build scope drift)

## Reuse cheat-sheet (lift, don't re-derive)

| Need | Donor | Where |
| --- | --- | --- |
| Canonical head + brand boilerplate | `scripts/scaffold-app.mjs` | generates it |
| CSV parse | `apps/2026-05-29-cohort-grid.html` | `parseCsv()` ~158–180 |
| Brand-token reader + hex fallback (for canvas) | cohort-grid | `token()` / `parseColor()` 207–227 |
| Color ramp + WCAG luminance/ink | cohort-grid | `lerp`/`colorFor`/`luminance`/`inkFor` 234–263 |
| Canvas → PNG export | cohort-grid | `dlEl` click handler ~377–432 |
| Debounced live render | cohort-grid | `clearTimeout(timer); timer=setTimeout(render,300)` |
| Heuristic scorer (regex counts → tiers) | `apps/2026-05-26-hello-lab.html` | `score()` ~148–157 |
| Multi-axis clamped 0–100 scoring | `apps/2026-06-19-ai-money-map.html` | `score()` ~364–395 |
| Copy-to-clipboard + execCommand fallback | hello-lab | ~228–254 |
| Real-time counter / interval | `apps/2026-05-27-snowflake-cost-clock.html` | start/pause/elapsed ~195–219 |
| Inline data/template bank (no fetch) | ai-money-map | embedded array ~151–356 |
| Modern head + `.lab-*` usage | `apps/2026-06-19-ai-build-shortlist.html` | whole file |

## Smoke-safety rules (so G4 passes every time)

The harness (`scripts/smoke.mjs`) runs the inline script with `document`,
`localStorage` and `fetch` stubbed (`fetch` resolves `!ok`), no real
`getComputedStyle`, timers capped. To pass:

1. **Seed a default render on load** into a `getElementById(...)` element's
   `innerHTML`/`textContent` (the scaffold does this). Don't rely on interaction.
2. **No `fetch` on the happy path**; if you fetch, the `!ok`/throw fallback must
   render fine (deterministic apps simply never fetch).
3. **Guard `getComputedStyle`** (`if (typeof getComputedStyle === 'function')`) and
   never call `getBBox`/canvas-measure at load — defer to a user action.
4. **Clean up timers** (`clearTimeout`/`clearInterval`); apps must work if a timer
   never fires.
5. Canvas work happens on click, not on load (the stub `getContext` returns no-ops).

## Gates (run before declaring an app done)

One command, scoped to the file:

```
node scripts/factory-gate.mjs apps/YYYY-MM-DD-<slug>.html
```

It runs G1+G2 (`lint-app`), G4 (`smoke`), and G3 (`gen-index` + `git diff
--exit-code index.html`). All three must say PASS. CI (`.github/workflows/
verify-apps.yml`) re-runs these on the PR plus a Playwright console-error +
screenshot pass on the Vercel preview.

## Orchestration protocol (nested agents)

The lead agent runs this loop; builders are sub-agents (`general-purpose`).

1. **Scaffold** each app up front (distinct files, safe to parallelize):
   `node scripts/scaffold-app.mjs <slug> "<Name>" "<desc>" "<tags>"`.
2. **Fan out builders.** Spawn one builder sub-agent per spec. Give each: its spec
   file, the scaffolded path, this cheat-sheet, the smoke-safety rules. Each
   builder **edits only its own `apps/...html`**, lifts the named donor utilities,
   implements the `intelligence` + `acceptance`, and self-verifies with
   `node scripts/lint-app.mjs <file>` + `node scripts/smoke.mjs <file>`.
   **Builders must NOT run `npm run gen`** (it writes the shared `index.html` —
   the lead owns that to avoid write races). Builder returns the final path.
3. **Serialize finalize + commit (one app at a time, "1 by 1").** For each
   returned app: `node scripts/factory-gate.mjs <file>` → if green,
   `npm run gen`, `git add apps/<file> index.html`, commit, push. Each commit is
   thus self-consistent (app + regenerated gallery) and independently shippable.
4. **Wire-up** any hub/links (e.g. the shortlist page) after all apps land.
5. **One PR.** Keep it draft; share preview URLs; address review + CI; merge on the
   user's go.

### Why builders skip `gen` and commits serialize
`index.html` is a single generated file. Parallel builders regenerating it would
race and conflict. So building parallelizes (distinct files) but the lead
regenerates + commits sequentially. This also gives the user clean "one app per
commit" history.

## Pruning (gallery management)

To unlist (not delete) an app — keep the file reachable by URL, drop it from the
gallery — add to its `<head>`:

```html
<meta name="app-visibility" content="private">
<meta name="robots" content="noindex,nofollow">
```

`scripts/gen-index.mjs` `isPrivate()` filters it out (any meta attribute order).
Re-run `npm run gen` and commit the index.

## Definition of done (per app)

`factory-gate.mjs` green · every `acceptance:` line verified · brand contract kept
· deterministic/offline (no live API on happy path) · one commit (app + index).
