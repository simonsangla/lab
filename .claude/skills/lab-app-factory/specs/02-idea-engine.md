# Spec: Idea Engine

- **app-name:** Idea Engine
- **app-description:** Turn one topic and an audience into a batch of content ideas and briefs — angles, formats and hooks, generated in your browser.
- **app-tags:** content,ideas,marketing,generator
- **slug:** idea-engine
- **filename:** apps/2026-06-19-idea-engine.html
- **shortlist pick:** "AI-driven content idea generation & planning" (lab lane)

## Intelligence (deterministic, offline)
Combinatorial generator over embedded template banks (no fetch, no LLM). Banks:
~10 angle frames ("The complete guide to {topic}", "{n} mistakes in {topic}",
"Why {audience} get {topic} wrong"), ~8 formats (listicle, case study, teardown,
checklist, thread, script), ~6 audience lenses, ~8 hook openers. Generate by
seeded sampling: combine topic + audience + angle + format, fill the template,
dedupe, and emit N briefs each with a title, format chip, suggested hook, and a
one-line angle. Seed the RNG from a hash of the input so results are stable and
"Shuffle" re-seeds. Each brief copyable; "Copy all" exports a markdown list.

## Reuse
- Inline template bank pattern — ai-money-map embedded array ~151–356.
- Clipboard + execCommand fallback — hello-lab ~228–254.
- `.lab-chip` for format tags; `.lab-card` per brief; `.lab-btn`/`.lab-btn-quiet`.
- Debounced regenerate on input.

## Acceptance
1. On load, a default topic+audience is seeded and a batch of briefs renders into `#out`.
2. Changing topic/audience regenerates relevant briefs (topic text appears in titles).
3. "Shuffle" produces a different stable batch from the same inputs.
4. "Copy" on a brief and "Copy all" both work (with the no-clipboard fallback).
5. Smoke passes: deterministic, no fetch, default render on load.

## Out of scope
- Real trend data / SEO volumes; saving idea history; image generation; tone training.
