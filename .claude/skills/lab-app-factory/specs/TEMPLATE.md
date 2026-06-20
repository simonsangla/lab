# Spec: <App Name>

- **app-name:** <=24 chars, no quotes
- **app-description:** one sentence, <=140 chars, no quotes
- **app-tags:** <=4, domain-first, comma-separated
- **slug:** lowercase-hyphen
- **filename:** apps/YYYY-MM-DD-<slug>.html

## Intelligence (deterministic, offline)
Describe the exact in-browser algorithm — the heuristic / regex / combinatorial
logic that produces the output. No runtime LLM/API on the happy path.

## Reuse
List donor utilities to lift, with file refs (see SKILL.md cheat-sheet).

## Acceptance (3–7 testable checks)
1. ...
2. ...

## Out of scope
- ...
