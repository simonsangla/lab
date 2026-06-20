# Spec: Rubric Scorer

- **app-name:** Rubric Scorer
- **app-description:** Paste student writing and score it against weighted criteria with readability metrics and an exportable graded report.
- **app-tags:** education,writing,evaluation,scoring
- **slug:** rubric-scorer
- **filename:** apps/2026-06-19-rubric-scorer.html
- **shortlist pick:** "AI writing evaluation & scoring for educators" (Mercor lane)

## Intelligence (deterministic, offline)
Transparent rubric engine — same shape as AI-training eval work. Paste text;
compute readability heuristics: word/sentence/paragraph counts, avg sentence
length, a Flesch-style reading-ease (syllable estimate via vowel-group regex),
lexical variety (unique/total), transition-word density, passive-voice proxy
("was/were/been + past participle" regex). Map each metric to a weighted rubric
criterion (Clarity, Structure, Evidence/Development, Mechanics) on 0–4, weights
editable via number inputs. Weighted total → letter band + per-criterion feedback
lines chosen from templates keyed by the scoring tier. Export the graded report
(copy as markdown). All scoring shown with its inputs (auditable).

## Reuse
- Heuristic scorer (regex counts → tiers + templated diagnosis) — hello-lab `score()` ~148–157.
- Multi-axis clamped 0–100 scoring shape — ai-money-map `score()` ~364–395.
- Numeric input handling — ab-verdict.
- Clipboard fallback — hello-lab ~228–254.
- `.lab-card` per criterion, status classes (`.lab-good`/`.lab-warn`/`.lab-bad`) for bands.

## Acceptance
1. On load, sample writing is seeded and a full scored report renders into `#out`.
2. Editing a criterion weight re-computes the weighted total live.
3. Empty/very short input shows a friendly "paste more text" message, no throw.
4. Each criterion shows its metric inputs (auditable) + a feedback line.
5. "Copy report" exports markdown; smoke passes (deterministic, no fetch).

## Out of scope
- Grammar correction; per-sentence suggestions; storing submissions; comparing students.
