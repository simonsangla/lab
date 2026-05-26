# AGENTS.md — `simonsangla/lab`

Static "One Day One App" showcase. Zero build step. GitHub Actions regenerates `index.html` on every push to `apps/**`; Vercel serves the repo root.

## How to ship a new app

1. Create `apps/YYYY-MM-DD-app-name.html` — standalone HTML, all CSS/JS inline.
2. Required meta tags in `<head>`:

   ```html
   <meta name="app-name" content="...">
   <meta name="app-description" content="...">
   <meta name="app-tags" content="tag1,tag2">
   ```

3. Commit on a feature branch → push → open PR → merge. The post-merge push to `main` triggers `.github/workflows/gen-index.yml`, which regenerates `index.html` with the new card.

## Conventions

- Mobile-first, dark design tokens consistent with `index.html` (see `:root` in any existing app).
- No external runtime deps. Google Fonts via `<link>` only.
- App files must be openable standalone (no shared CSS/JS outside the file).
- Filename `YYYY-MM-DD-` prefix is the sort key (newest first).

## Generator

[scripts/gen-index.mjs](scripts/gen-index.mjs) — Node ESM, stdlib only. Run `npm run gen` (or `node scripts/gen-index.mjs`) for a local preview. Idempotent.

## Deploy

- Linked to Vercel project `simonsanglas-projects/lab` (`prj_WCkdgNQ7HEMG3018zfCBuV0oIxzp`).
- Live at https://lab.simonsangla.com and https://lab-simonsanglas-projects.vercel.app.
- Deployment Protection (SSO) is OFF — this is a public showcase.

## Last shipped

- **2026-05-26** — Bootstrap commit `0651fe7` `feat: scaffold One Day One App lab + Day 001 SQL Pulse`. Day 001: `apps/2026-05-26-hello-lab.html` (SQL Pulse — Snowflake query complexity scorer). Index, generator, Action workflow, vercel.json, README all in place. Vercel project + custom domain live.
