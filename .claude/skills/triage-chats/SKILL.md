---
name: triage-chats
description: Scan local Claude Code and Cowork session logs (plus an optional claude.ai data export), triage them into backlog-to-develop vs WIP-to-follow-up with a concrete next step each, and publish data/chat-triage.json so the Chat Triage app updates automatically. Use when the user wants to rescan, refresh, or triage their recent AI sessions.
---

# triage-chats

Refresh the feed behind `apps/2026-06-10-chat-triage.html`. The board on
lab.simonsangla.com renders whatever this skill publishes to
`data/chat-triage.json` — no manual entry in the app.

## 1. Scan

```bash
node scripts/scan-sessions.mjs --dry
```

This prints the merged feed as JSON (stderr shows source counts). It reads:

- `~/.claude/projects/**/*.jsonl` — Claude Code sessions; sessions whose
  `entrypoint` mentions cowork are tagged surface `cowork`.
- A claude.ai data export, if present at `data/inbox/conversations.json` or
  passed with `--claude-export <path>`. There is no API for live claude.ai
  chat history, so the export is the only way to cover that surface — if the
  user asks why Claude-surface chats are missing, tell them to download a
  data export (claude.ai → Settings → Privacy → Export data) and drop
  `conversations.json` into `data/inbox/` (that folder is gitignored), or
  upload it directly in the app's Connect & data panel.

Claude cloud sessions (Claude Code on the web) are NOT scanned here — the app
itself streams them live as `claude/*` PRs from the public GitHub API for the
repo configured in its Connect & data panel. Don't duplicate them in the feed;
if a local session has an associated PR, set the item's `link` to the PR URL
and the app will dedupe the cloud entry against it.

The scanner only assigns heuristic statuses (recent → `followup`, old →
`monitor`) and preserves any status/next/notes/snoozedOn already in the feed.
Your job is the judgment layer on top.

## 2. Triage (the judgment layer)

For each item, decide which bucket it belongs in. When the title and notes
(project dir, branch, prompt count) aren't enough, open the session log under
`~/.claude/projects/<project>/<session-id>.jsonl` and read the first user
message and the last assistant message — that is usually enough to tell
whether work finished.

| status     | meaning                                                        |
|------------|----------------------------------------------------------------|
| `followup` | WIP — work in flight: open PR, unfinished build, awaiting reply |
| `backlog`  | An idea or app discussed but not started — worth developing     |
| `monitor`  | Shipped/finished but being watched (deploy, CI, subscription)   |
| `done`     | Complete, nothing pending — keep for the record                 |

Rules:

- Every non-`done` item gets a one-line `next` — a single concrete action
  ("Merge PR #7", "Scaffold the cohort export as a new day app"), not a vague
  "continue".
- Chats that are pure idea exploration are `backlog`, even if recent.
- Trivial/empty sessions (1–2 prompts, no outcome) → mark `done` so they sink.
- Never put chat content in the feed: `title` and `next` should be short and
  safe to publish. Rewrite any title that contains something private.

## 3. Write, review, publish

1. Run the scanner without `--dry` to write `data/chat-triage.json`, then edit
   that file to apply your statuses and `next` lines (keep ids and the
   `{ app, v, scannedAt, items }` shape — the app merges on `id`).
2. Validate: `node -e "JSON.parse(require('fs').readFileSync('data/chat-triage.json','utf8'))"`.
3. **Privacy gate — required.** Show the user the final title list and remind
   them the feed deploys to the public site. Get an explicit OK before
   committing. If anything looks sensitive, retitle it first.
4. Commit as `chore(chat-triage): refresh scan feed` and push. Vercel
   redeploys and the board picks the feed up on next load.
