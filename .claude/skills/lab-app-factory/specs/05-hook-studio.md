# Spec: Hook Studio

- **app-name:** Hook Studio
- **app-description:** Generate scroll-stopping hooks, titles and a script outline for YouTube, TikTok or Reels from one topic.
- **app-tags:** content,video,social,generator
- **slug:** hook-studio
- **filename:** apps/2026-06-19-hook-studio.html
- **shortlist pick:** "AI-assisted content creator (YouTube, TikTok, Instagram)" (ROI lane)

## Intelligence (deterministic, offline)
Combinatorial generator + a heuristic "hook strength" scorer (no LLM). Inputs:
topic, platform (`<select>`: YouTube / TikTok / Reels), tone. Embedded hook-frame
bank (curiosity gap, contrarian, number, transformation, mistake, question) and a
title bank; fill from topic + tone. Score each hook 0–100 deterministically:
+power words (regex bank), +specific number, +brevity bonus (platform-tuned ideal
length), +curiosity/second-person cues, − filler words; show the score and the
strongest variant. Also emit a platform-aware script outline (hook → setup →
payoff → CTA) with a per-section read-time estimate (words ÷ 2.5 words/sec) and a
live character counter against the platform caption cap.

## Reuse
- Inline template bank — ai-money-map embedded array ~151–356.
- Heuristic scorer (regex counts → score) — hello-lab `score()` ~148–157 + ai-money-map clamp.
- Char/count + read-time counters — counter math like snowflake-cost-clock ~195–219.
- Clipboard fallback — hello-lab ~228–254.
- `.lab-chip` for platform/score; `.lab-card` per hook.

## Acceptance
1. On load, a default topic+platform is seeded; scored hooks + outline render into `#out`.
2. Switching platform changes the ideal-length bonus and the caption-cap counter.
3. Each hook shows a 0–100 strength score; the top one is highlighted.
4. The script outline shows per-section read-time totals.
5. "Copy" works; smoke passes (deterministic, no fetch, default render).

## Out of scope
- Real trend/algorithm data; thumbnail generation; video editing; saving drafts.
