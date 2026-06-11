// scan-repos.mjs — scan ALL of a GitHub user's public repos and list triage
// candidates for the Chat Triage board (apps/2026-06-10-chat-triage.html).
//
//   node scripts/scan-repos.mjs [--user simonsangla] [--dry] [--json]
//
// Sources (public GitHub API, no token needed; ~2 requests per repo):
//   - open PRs       -> followup ("Review and merge PR #N"); claude/* heads
//                       are Claude cloud sessions, surface "cloud"
//   - open issues    -> backlog (an issue is a named, undone piece of work)
//   - claude/* branches with no open PR -> backlog ("Open a PR or delete")
//
// Without --dry it merges candidates into data/chat-triage.json on stable
// ids (gh-<repo>-pr<N> / gh-<repo>-issue<N> / gh-<repo>-br-<slug>), keeping
// any status/next/notes/snoozedOn a human (or agent) already set, and prunes
// repo-scan items whose PR/issue has since closed (unless hand-edited).
// All scanned facts are public repo metadata - safe for the public feed.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ARGS = process.argv.slice(2);
const flag = (n) => ARGS.includes(n);
const opt = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };

const USER = opt('--user', 'simonsangla');
const FEED = 'data/chat-triage.json';
const API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const HDRS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'lab-triage-scan',
  ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {})
};

async function gh(path) {
  const res = await fetch(API + path, { headers: HDRS });
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub API rate limit hit on ' + path + ' - wait an hour or set up a token-based scan');
  }
  if (!res.ok) throw new Error('GET ' + path + ' -> ' + res.status);
  return res.json();
}

const today = new Date().toISOString();
const day = (iso) => (iso || today).slice(0, 10);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function candidate(id, fields) {
  return {
    id, snoozedOn: null,
    createdAt: today, updatedAt: today,
    notes: '', link: '', ...fields
  };
}

const repos = (await gh(`/users/${USER}/repos?per_page=100&sort=pushed`))
  .filter((r) => !r.fork && !r.archived);
console.error(`[scan-repos] ${repos.length} repos for ${USER}: ${repos.map((r) => r.name).join(', ')}`);

const items = [];
for (const r of repos) {
  try {
  const prs = await gh(`/repos/${r.full_name}/pulls?state=open&per_page=50`);
  const prHeads = new Set(prs.map((p) => p.head.ref));
  for (const p of prs) {
    const cloud = p.head.ref.startsWith('claude/');
    const stale = (Date.now() - new Date(p.updated_at)) / 864e5 > 14;
    items.push(candidate(`gh-${r.name}-pr${p.number}`, {
      title: `${r.name}: ${p.title}`.slice(0, 90),
      surface: cloud ? 'cloud' : 'code',
      status: 'followup',
      date: day(p.updated_at),
      link: p.html_url,
      next: p.draft
        ? `Finish draft PR #${p.number} and mark it ready`
        : stale
          ? `PR #${p.number} idle >14d - revive or close it`
          : `Review and merge PR #${p.number}`,
      notes: `${r.name} · ${p.head.ref}${p.draft ? ' · draft' : ''}`
    }));
  }

  // issues endpoint also returns PRs; keep real issues only
  const issues = (await gh(`/repos/${r.full_name}/issues?state=open&per_page=50`))
    .filter((i) => !i.pull_request);
  for (const i of issues) {
    items.push(candidate(`gh-${r.name}-issue${i.number}`, {
      title: `${r.name}: ${i.title}`.slice(0, 90),
      surface: 'code',
      status: 'backlog',
      date: day(i.updated_at),
      link: i.html_url,
      next: `Pick up issue #${i.number} or close it with a reason`,
      notes: `${r.name} · issue · ${(i.labels || []).map((l) => l.name).join(',') || 'unlabelled'}`
    }));
  }

  // orphan claude/* branches = cloud sessions that never opened/kept a PR
  const branches = await gh(`/repos/${r.full_name}/branches?per_page=100`);
  for (const b of branches) {
    if (!b.name.startsWith('claude/') || prHeads.has(b.name)) continue;
    items.push(candidate(`gh-${r.name}-br-${slug(b.name.slice(7))}`, {
      title: `${r.name}: orphan cloud branch ${b.name.slice(7).slice(0, 50)}`,
      surface: 'cloud',
      status: 'backlog',
      date: day(),
      link: `https://github.com/${r.full_name}/tree/${b.name}`,
      next: 'Open a PR for this branch or delete it',
      notes: `${r.name} · branch with no open PR`
    }));
  }
  } catch (err) {
    // one broken/empty repo must not kill the whole scan - but a rate
    // limit guarantees every later request fails too, so abort on it
    if (String(err.message).includes('rate limit')) throw err;
    console.error(`[scan-repos] skipping ${r.full_name}: ${err.message}`);
  }
}

console.error(`[scan-repos] ${items.length} candidates`);

if (flag('--dry') || flag('--json')) {
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}

// merge into the feed: new ids appended, existing repo-scan ids refreshed but
// human judgment (status/next/notes/snoozedOn) preserved; gh-* items whose
// source vanished (PR/issue closed) flip to done unless hand-edited.
const feed = existsSync(FEED)
  ? JSON.parse(readFileSync(FEED, 'utf8'))
  : { app: 'chat-triage', v: 2, scannedAt: today, items: [] };
const byId = new Map(feed.items.map((it) => [it.id, it]));
const liveIds = new Set(items.map((it) => it.id));

for (const it of items) {
  const prev = byId.get(it.id);
  if (prev) {
    prev.title = it.title; prev.date = it.date; prev.link = it.link;
    prev.updatedAt = today;          // keep prev.status/next/notes/snoozedOn
  } else {
    byId.set(it.id, it);
  }
}
for (const it of byId.values()) {
  if (it.id.startsWith('gh-') && !liveIds.has(it.id) && it.status !== 'done') {
    it.status = 'done';
    it.next = '';
    it.updatedAt = today;
  }
}

feed.items = [...byId.values()];
feed.scannedAt = today;
writeFileSync(FEED, JSON.stringify(feed, null, 1) + '\n');
console.error(`[scan-repos] wrote ${FEED} (${feed.items.length} items total)`);
