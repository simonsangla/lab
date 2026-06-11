---
name: triage-chats
description: Triage everything in flight into the Chat Triage board - FIRST scan all GitHub repos (open PRs, drafts, issues, orphan claude/* branches) and list potential candidates, then scan local Claude Code/Cowork session logs, judge each item, publish data/chat-triage.json and deploy it in one pass. Use when the user wants to rescan, refresh, triage repos/sessions, or "update the board".
---

# triage-chats

One command end-to-end: scan → list candidates → judge → publish →
deploy. The board at lab.simonsangla.com/apps/2026-06-10-chat-triage.html
renders whatever lands in `data/chat-triage.json`. Paths are relative to
the repo root.

## 1. Scan the repos FIRST (all of them)

```bash
node scripts/scan-repos.mjs --dry          # list candidates, touch nothing
node scripts/scan-repos.mjs                # merge candidates into the feed
```

Scans every non-fork, non-archived repo of the user via the public GitHub
API (set `GITHUB_TOKEN` if available — unauthenticated is 60 req/hr and
~2 req/repo). Candidates it emits:

| source                              | status     | next                          |
|-------------------------------------|------------|-------------------------------|
| open PR                             | `followup` | "Review and merge PR #N"      |
| draft PR                            | `followup` | "Finish draft PR #N"          |
| PR idle > 14 days                   | `followup` | "revive or close"             |
| open issue                          | `backlog`  | "Pick up issue #N or close"   |
| `claude/*` branch with no open PR   | `backlog`  | "Open a PR or delete"         |

Merging is id-stable (`gh-<repo>-pr<N>` / `gh-<repo>-issue<N>` /
`gh-<repo>-br-<slug>`): re-running refreshes titles/links but preserves
human-set status/next/notes/snoozedOn, and flips `gh-*` items to `done`
when their PR/issue closes.

**Rate-limited?** (the script throws a clear "rate limit hit" error —
CI polling from the same container often eats the budget). Fall back to
the GitHub MCP search tools, which are authenticated and need only 3
calls for everything:

- `search_repositories` query `user:<user>` → repo list (note archived flags)
- `search_pull_requests` query `user:<user> is:open` → all open PRs
- `search_issues` query `user:<user> is:open` → all open issues

Then write the same `gh-*` items into the feed by hand, following the
table above. **Skip PRs/issues on archived repos** — they are read-only
and unmergeable; collapse them into one summary row instead of N rows of
dead dependabot PRs. Consolidate dependabot herds (5+ PRs on one repo)
into a single row too: the board is for decisions, not inventory.

## 2. Scan local sessions SECOND

```bash
node scripts/scan-sessions.mjs --dry
node scripts/scan-sessions.mjs
```

Reads `~/.claude/projects/**/*.jsonl` (Claude Code; Cowork via
entrypoint) and an optional claude.ai data export at
`data/inbox/conversations.json` (no API exists for claude.ai history —
Settings → Privacy → Export data). Claude cloud sessions are NOT scanned:
the app streams them live as `claude/*` PRs; if a local session has an
associated PR, set the item's `link` to the PR URL and the app dedupes.

## 3. Judge

Statuses: `followup` (WIP, action pending) · `backlog` (named work, not
started) · `monitor` (shipped, being watched) · `done` (sinks).

- Every non-`done` item gets a concrete one-line `next` ("Merge PR #211"),
  never "continue".
- Trivial sessions (1-2 prompts, no outcome) → `done`.
- Repo-scan items are public metadata — safe to publish as-is. Session
  titles are not: rewrite anything private before it ships
  (`title`/`next` deploy to the public site).

## 4. Publish + deploy (the one command's tail)

```bash
node -e "JSON.parse(require('fs').readFileSync('data/chat-triage.json','utf8'))"
npm run lint && npm run smoke && npm run gen
git add data/chat-triage.json && git commit -m "chore(chat-triage): refresh repo+session scan" && git push
```

Then open a PR and merge it once gates + screenshots are green (squash,
`chore: ...` title). Vercel deploys main to production automatically; the
board picks the feed up on next load. Session-sourced titles still get
one privacy look from the user before the commit — repo-scan-only
refreshes don't need it.

## Gotchas

- Unauthenticated GitHub API shares the 60 req/hr budget with anything
  else curling api.github.com from the container (CI watchers!). Scan
  first, poll later — or use the MCP fallback.
- `search_issues`/`search_pull_requests` return PRs on archived repos
  with no `archived` marker on the item — you must cross-reference the
  repo list to know they're dead.
- The app merges on `id`: never rename ids, or the board duplicates.
  Local edits made in the app (localStorage) win over feed values that
  are older — pushing a feed does not clobber the user's in-app triage.
