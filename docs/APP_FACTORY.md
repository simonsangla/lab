# APP_FACTORY.md — idea → deployed PWA, repeatably

> STATUS: **PROPOSED — not implemented.** This documents the target pipeline and
> its gates. Per the mission brief, no pipeline code is built until this design
> is approved. Everything marked ✅ already exists in the repo today; everything
> marked 🔧 is the gap to build.

## 0. The loop in one line

Chat Triage backlog item → optimized spec → generated single-file app →
validation gates → draft PR + preview → CI screenshot/smoke verification →
squash merge → prod verify → evidence on PR → backlog item marked done.

## 1. Required inputs (the spec contract)

An app enters the factory only as a completed spec. Template:

```yaml
idea:            one line, from data/chat-triage.json backlog or the ideas list
app-name:        ≤24 chars, no quotes
app-description: ONE sentence, ≤140 chars, no quotes   # gen-index clamp + share copy
app-tags:        ≤3, domain-first (e.g. snowflake,analytics)
filename:        apps/YYYY-MM-DD-<slug>.html           # date = ship date, sort key
data-sources:    none | public-api(<url, CORS, no auth>) | published-feed | localStorage-only
privacy-class:   localStorage-only | titles-only-feed | public-api-reads
                 # HARD RULE (PR #4): no credential ever ships to the public origin
patterns:        which REUSE.md patterns apply (head block, tokens, live+demo fallback,
                 parse→preview→confirm, render/wire loop)
acceptance:      3–7 testable checks, each phrased as a harness assertion
                 ("add → reload → persists", "bad input → friendly error", …)
out-of-scope:    explicit non-goals (kills mid-build scope drift)
```

**Prompt optimization step** 🔧: a `/optimize-app-prompt` skill takes the raw
idea and interrogates it into this template; generation may not start while any
field is empty. Validation evidence for why this gate pays for itself: §7.

## 2. Generation flow

1. Branch `claude/<slug>-<nonce>` from main. ✅ (current convention)
2. Generate `apps/YYYY-MM-DD-<slug>.html`: copy the canonical head
   (`apps/2026-05-31-pomodoro-brutal.html:1–19`), dark tokens, then implement
   against the spec's patterns. Single file, inline CSS/JS, zero deps beyond
   Google Fonts. ✅ (convention; AGENTS.md)
3. If the app needs a published feed, follow the Chat Triage shape:
   scanner script (stdlib) + skill with privacy gate + `data/<name>.json`. ✅
4. Regenerate gallery locally: `npm run gen` (idempotent). ✅

Determinism note: the LLM generation step is inherently non-deterministic, so
the factory pins determinism **at the artifact level** — deterministic
generators (`gen-index`, `gen-icons`, scanners), idempotent re-runs, and gates
that pass/fail on the artifact regardless of how it was produced. Two runs may
produce different HTML; both must clear identical gates.

## 3. Validation gates (all local, all blocking, before push)

| Gate | Check | Tool | Status |
|---|---|---|---|
| G1 syntax | inline `<script>` extracted → `node --check` | sed + node | ✅ pattern (PR #7) |
| G2 meta lint | 3 meta tags present, match gen-index regex, desc ≤140, no quotes, filename pattern, date not in future | 🔧 `scripts/lint-app.mjs` | gap |
| G3 gallery | `npm run gen` → exactly one new card; second run = no diff | ✅ exists | |
| G4 behavior | DOM-stub Node harness runs the app's real script with stubbed document/localStorage/fetch; every `acceptance:` line is an assertion; fallback paths (source down) covered | 🔧 `scripts/smoke.mjs` (pattern proven: PR #7, 15/15, caught a real fetch-race bug) | gap |
| G5 safety | no requests beyond fonts + spec'd public APIs; no tokens/credentials; gitleaks + semgrep clean | ✅ practice (PRs #1/#4) → 🔧 scripted | |

## 4. Deployment flow & verification

1. Push branch → **draft PR** with the evidence block (§6). ✅
2. Vercel builds the preview automatically; gate: deployment `READY`. ✅
3. **CI verification Action** 🔧 (the only new infra): on PR, after preview is
   READY, Playwright hits `<preview>/apps/<file>`:
   - zero console errors;
   - app-specific smoke selector visible (from spec acceptance);
   - screenshots at 375×812 and 1280×800 → uploaded as artifacts.
   The remote agent sandbox cannot reach vercel.app or run a browser — this
   check **must** live in GitHub Actions.
4. Triage bot review comments (apply or decline with reason). ✅ practice.
5. Squash-merge. gen-index Action on main is an idempotent no-op when the PR
   carried the regenerated index. ✅
6. Prod verify: Vercel API — newest deployment has `target=production`,
   `state=READY`, `githubCommitSha == merge sha`. ✅ (done by hand for PR #7;
   🔧 script it)
7. Close the loop: mark the backlog item `done` in `data/chat-triage.json`
   (next factory commit or `/triage-chats` rescan). ✅ mechanism exists.

**Rollback strategy** (static site, no migrations → rollback is total):
- Normal: `git revert <merge sha>` on main → Vercel auto-redeploys (~40 s).
- Instant: promote the previous production deployment in Vercel
  (`isRollbackCandidate: true` on the prior prod deploy).
- A bad app file cannot break other apps (standalone files); worst blast
  radius is the gallery card + that one URL.

## 5. Failure points (identified before implementation)

| # | Failure | Detected by | Recovery |
|---|---|---|---|
| F1 | Vague idea → wrong deliverable built | spec contract gate (§1) | re-interrogate idea; no generation until complete — see §7 for measured cost |
| F2 | Invalid JS / runtime error | G1; G4; CI console check | fix before push; gates are blocking |
| F3 | Meta regex mismatch → app missing from gallery | G2 + G3 (card-count diff) | fix meta; G3 re-run |
| F4 | Description/quotes break card or share copy | G2 length/charset lint | rewrite description |
| F5 | Behavior bug syntax checks can't see (e.g. PR #7 fetch race) | G4 harness incl. adversarial timing + fallback scenarios | fix; add regression assertion |
| F6 | Credential or private data on public origin | G5 + skill privacy gates | block push; retitle/strip |
| F7 | Vercel build/deploy failure | preview status gate; prod verify | fix or abandon branch; prod unaffected until merge |
| F8 | Looks broken despite passing logic gates | CI screenshots (human glance at 2 artifacts) | fix CSS; re-run |
| F9 | Bad merge reaches prod | prod verify + smoke vs prod URL (CI) | revert / promote previous deploy (§4) |
| F10 | gen-index Action race / loop | `[skip ci]` + idempotent generator | already solved ✅ |
| F11 | Client-side GitHub API rate limit (60/h unauth) | provenance line shows source off; demo fallback | acceptable degradation by design |
| F12 | Duplicate filename / date collision | G2 filename check | rename slug |
| F13 | Stale SW serves old static asset | docs are network-first ✅; bump `CACHE` version on icon/manifest changes | manual bump (rare) |

## 6. Evidence requirements (per shipped app)

The PR is the evidence record. Required in the PR body before merge:
- harness output (G4): N/N assertions, scenarios listed;
- G3 proof: one-card diff, idempotent re-run;
- G5: gitleaks/semgrep result lines;
- CI run link with screenshot artifacts (375px + desktop);
- prod verification: production deployment id + state + commit sha;
- spec block (the §1 YAML) — so the prompt that built the app is auditable.

## 7. Validation evidence — prompt optimization, measured on a real case

Case: this repo's Chat Triage app (PR #7, merged 2026-06-10). Git-verifiable.

**Original prompt (verbatim):**
> "Create artifact for triage of recent Claude / coworker/ Claude code chats for triage and monitoring and propose next step"

**What it cost** (from the PR #7 commit log and session):
| Metric | Value |
|---|---|
| Corrective user redirections | 3 ("no manual, auto-scan + skill", "connect cloud + claude.ai", "test with real data") |
| Commit cycles on the PR | 4 (266e547 → 8b18f26 → ba21b5b → cb67343) |
| First-commit UI logic later reworked | ~60% (manual-first board → feed-first board) |
| Idea → merged | ~2h10m |

**Optimized prompt (what the §1 contract would have produced):**
> Build `apps/2026-06-10-chat-triage.html` — a triage board that **fills itself, no manual entry**, sorting recent AI sessions into *backlog to develop* vs *WIP to follow up*, each with a one-line next step and a "one action now" hero. **Sources:** Claude Code + Cowork via a stdlib scanner over `~/.claude/projects/**/*.jsonl` published as `data/chat-triage.json` by a `/triage-chats` skill (privacy gate: titles only, explicit OK before publish); Claude cloud live via public GitHub API `claude/*` PRs (no token, dedupe by PR link, local edits win merges); claude.ai via data-export upload (no API exists — parse in-browser). **Patterns:** canonical head, dark tokens, live+demo fallback, parse→preview→confirm. **Acceptance:** feed merge idempotent; triage edits survive rescans; cloud/feed race cannot duplicate items; demo mode persists nothing; works file:// offline. **Out of scope:** reading chat content; any credential on the public origin.

**Measured improvement:** every clause above maps 1:1 to a correction that was
actually needed — the three redirections and the race bug were all *absent
spec lines*, not generation failures. Under the contract, the same app is one
commit cycle: the 4-cycle history **is** the controlled "before"; commit
cb67343's 15/15-assertion harness run is the "after" quality bar that G4 makes
mandatory. Residual risk honestly stated: an optimized prompt does not prevent
new requirements discovered later (e.g. "connect cloud" was scope growth, not
just vagueness) — the contract's `out-of-scope:` field forces that conversation
to happen at intake, where it costs a sentence instead of a rework commit.

## 8. Quality checklist (gate summary, per app)

- [ ] Spec contract complete (§1), out-of-scope stated
- [ ] G1 syntax · G2 meta lint · G3 one-card idempotent gen · G4 harness green (all acceptance lines) · G5 safety clean
- [ ] Draft PR with evidence block; preview READY; CI screenshots + zero console errors
- [ ] Bot review triaged (applied or declined with reason)
- [ ] Squash-merged; prod deployment READY @ merge sha
- [ ] Backlog item marked done in the Chat Triage feed
- [ ] AGENTS.md "Last shipped" updated

## Appendix: landing page review (Phase 2 findings)

The landing (generated `index.html`; all fixes belong in `scripts/gen-index.mjs`)
was reviewed for positioning, conversion, hierarchy, mobile UX, performance, CTAs.

**P0 — hurts conversion now**
1. No conversion path: only outbound links are two `simonsangla.com` links; no
   email/LinkedIn/GitHub/"work with me" anywhere → pill becomes "Work with me →",
   footer gains Email · LinkedIn · Source on GitHub (also fixes "credibility not
   provable": zero source links on a page whose point is proof of work).
2. Positioning only in the footer: add one subhead under the brand ("Daily
   micro-apps, designed, built and shipped solo in under 24 hours — by Simon
   Sangla, Snowflake analytics consultant.").
3. Zero `og:*`/`twitter:*` share meta — LinkedIn/X shares render bare; generator
   already knows app count N for self-updating share copy; needs one static
   `/og.png` (1200×630).

**P1 — meaningful**
4. Animation stagger grows with app count (card N invisible N×60 ms; 3 s at 50
   apps) → cap `Math.min(i, 8) * 60`.
5. `--muted: #5a5a5a` ≈2.6:1 contrast (fails AA) on tagline/dates/descriptions →
   `#8a8a8a` (≈5.4:1), one token.
6. Counter → velocity proof: "8 apps shipped · since 2026-05-26" (dates are what
   a consultant-shopper checks; also defuses the tagline-vs-10-day-gap
   contradiction).
7. Render-blocking Google Fonts link → preload + `media="print"` swap pattern
   (fallback stack already declared).

**P2 — polish**
8. Grain SVG (`feTurbulence`, full-viewport fixed, opacity 0.03) costs re-raster
   on every resize for an invisible effect → tiny tiled PNG data-URI or delete.
9. Generator-enforced description ≤140 chars (Chat Triage's 280-char description
   currently truncates mid-sentence on the newest card).
10. Heading semantics (page has no h1/h2): logo span → h1, card h3 → h2.
11. Tags: cap 3, domain-first; not interactive today.
12. Pill tap target 36px → 44px (it's about to be the primary CTA).
13. SW `CACHE='lab-v1'` never rotates — bump on static-asset changes only.
