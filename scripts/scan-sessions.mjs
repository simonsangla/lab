// scan-sessions.mjs — collect recent Claude Code / Cowork sessions (and an
// optional claude.ai data export) into the Chat Triage feed.
//
//   node scripts/scan-sessions.mjs [--dry] [--claude-export <conversations.json>] [--out <file>]
//
// Sources:
//   ~/.claude/projects/**/*.jsonl   Claude Code + Cowork session logs (local disk).
//                                   Surface "cowork" when the log's entrypoint
//                                   mentions cowork, otherwise "code".
//   conversations.json              claude.ai data export (no API exists for
//                                   live chat history) — pass via --claude-export
//                                   or drop it at data/inbox/conversations.json.
//
// The feed carries titles + dates only, never chat content. New items get a
// heuristic status (recent activity -> followup, else monitor); the
// /triage-chats skill refines statuses (backlog vs WIP) and next steps.
// Existing triage judgments (status, next, notes, snoozedOn) are preserved
// across rescans by stable id.
//
// CAUTION: the feed deploys with the public site. Review titles before pushing.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const OUT = argVal('--out') || 'data/chat-triage.json';
const EXPORT_PATH = argVal('--claude-export') || firstExisting(['data/inbox/conversations.json']);
const CLAUDE_DIR = process.env.CLAUDE_DIR || join(homedir(), '.claude');
const FRESH_DAYS = 7;

function argVal(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
function firstExisting(paths) {
  return paths.find((p) => existsSync(p)) || null;
}
function ymd(iso) {
  return iso && !isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 10) : null;
}
function daysSince(iso) {
  return iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : Infinity;
}
function trimTitle(t) {
  t = String(t).replace(/\s+/g, ' ').trim();
  if (t.length <= 90) return t;
  const cut = t.slice(0, 90);
  return cut.slice(0, cut.lastIndexOf(' ') > 50 ? cut.lastIndexOf(' ') : 90) + '…';
}
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const t = content.find((b) => b && b.type === 'text' && typeof b.text === 'string');
    return t ? t.text : '';
  }
  return '';
}

function scanSessionFile(path) {
  const s = {
    sessionId: null, slug: null, cwd: null, branch: null, entrypoint: null,
    summary: null, firstUser: null, lastTs: null, userMsgs: 0, assistantMsgs: 0
  };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    s.sessionId = s.sessionId || row.sessionId;
    s.slug = s.slug || row.slug;
    s.cwd = s.cwd || row.cwd;
    s.branch = s.branch || row.gitBranch;
    s.entrypoint = s.entrypoint || row.entrypoint;
    if (row.timestamp && (!s.lastTs || row.timestamp > s.lastTs)) s.lastTs = row.timestamp;
    if (row.type === 'summary' && row.summary) s.summary = row.summary;
    if (row.type === 'user' && row.message && !row.isSidechain) {
      const txt = textOf(row.message.content).trim();
      if (txt && !s.firstUser) s.firstUser = txt;
      if (txt) s.userMsgs++;
    }
    if (row.type === 'assistant') s.assistantMsgs++;
  }
  return s;
}

function scanClaudeCode() {
  const root = join(CLAUDE_DIR, 'projects');
  if (!existsSync(root)) return [];
  const items = [];
  for (const proj of readdirSync(root)) {
    const dir = join(root, proj);
    let files;
    try { files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      const path = join(dir, f);
      if (!statSync(path).isFile()) continue;       // subagent logs live in subdirs
      const s = scanSessionFile(path);
      if (!s.sessionId || !s.userMsgs) continue;
      const title = trimTitle(s.summary || s.firstUser || s.slug || basename(f, '.jsonl'));
      items.push({
        id: 'cc-' + s.sessionId.slice(0, 8),
        title,
        surface: /cowork/i.test(s.entrypoint || '') ? 'cowork' : 'code',
        date: ymd(s.lastTs) || ymd(new Date().toISOString()),
        link: '',
        notes: [
          s.cwd ? basename(s.cwd) : null,
          s.branch || null,
          s.userMsgs + ' prompts'
        ].filter(Boolean).join(' · '),
        _lastTs: s.lastTs
      });
    }
  }
  return items;
}

function scanClaudeExport(path) {
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); } catch {
    console.error('[scan] could not parse ' + path);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter((c) => c && (c.name || '').trim())
    .map((c) => ({
      id: 'web-' + String(c.uuid || c.name).slice(0, 8),
      title: trimTitle(c.name),
      surface: 'claude',
      date: ymd(c.updated_at || c.created_at) || ymd(new Date().toISOString()),
      link: c.uuid ? 'https://claude.ai/chat/' + c.uuid : '',
      notes: '',
      _lastTs: c.updated_at || c.created_at || null
    }));
}

// ---- collect ----
const scanned = scanClaudeCode();
if (EXPORT_PATH) scanned.push(...scanClaudeExport(EXPORT_PATH));
scanned.sort((a, b) => String(b._lastTs).localeCompare(String(a._lastTs)));

// ---- merge with existing feed: facts refresh, triage judgments survive ----
let prev = { items: [] };
if (existsSync(OUT)) {
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}
}
const prevById = new Map((prev.items || []).map((it) => [it.id, it]));
const now = new Date().toISOString();

const items = scanned.map((s) => {
  const old = prevById.get(s.id);
  prevById.delete(s.id);
  return {
    id: s.id,
    title: (old && old.title) || s.title,   // triaged titles survive rescans
    surface: s.surface,
    status: old ? old.status : (daysSince(s._lastTs) <= FRESH_DAYS ? 'followup' : 'monitor'),
    date: s.date,
    link: s.link || (old && old.link) || '',
    next: old ? old.next || '' : '',
    notes: s.notes || (old && old.notes) || '',
    snoozedOn: old ? old.snoozedOn || null : null,
    createdAt: old ? old.createdAt : now,
    updatedAt: now
  };
});
items.push(...prevById.values());   // sessions gone from disk keep their entry

const feed = { app: 'chat-triage', v: 2, scannedAt: now, items };
const json = JSON.stringify(feed, null, 2) + '\n';

if (DRY) {
  process.stdout.write(json);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
}
console.error(
  '[scan] ' + scanned.length + ' sessions found (' +
  scanned.filter((s) => s.surface === 'code').length + ' code, ' +
  scanned.filter((s) => s.surface === 'cowork').length + ' cowork, ' +
  scanned.filter((s) => s.surface === 'claude').length + ' claude) -> ' +
  (DRY ? 'stdout (dry run)' : OUT)
);
