# Spec: Copy Forge

- **app-name:** Copy Forge
- **app-description:** Generate and score ad and product-copy variants for any product and audience, right in the browser.
- **app-tags:** copywriting,marketing,ads,generator
- **slug:** copy-forge
- **filename:** apps/2026-06-19-copy-forge.html
- **shortlist pick:** "AI writing services (blogs, articles, ads, product copy)" (ROI lane)

## Intelligence (deterministic, offline)
Variant generator + a power/clarity scorer (no LLM). Inputs: product, audience,
key benefit, format (`<select>`: product description / Google ad / social ad /
email subject line). Embedded copy-frame banks per format (benefit-led, problem-
agitate-solve, social proof, urgency, how-it-works) fill from the inputs to
produce 4–6 variants. Score each deterministically on three axes shown as chips:
Punch (power-word density + verbs), Clarity (reading-ease + sentence length vs
format ideal), Fit (benefit/audience keyword presence) — each 0–100, plus a
combined badge. Sort variants by combined score, highlight the winner. Respect
format length caps (e.g. Google ad headline ≤30 chars) with a live counter and a
warn state when over. Each variant copyable; "Copy winner" one-click.

## Reuse
- Inline template/frame bank — ai-money-map embedded array ~151–356.
- Multi-axis clamped 0–100 scoring — ai-money-map `score()` ~364–395.
- Heuristic regex counts (power words, filler) — hello-lab `score()` ~148–157.
- Clipboard fallback — hello-lab ~228–254.
- `.lab-chip` per axis; `.lab-card` per variant; status classes for over-cap warn.

## Acceptance
1. On load, a default product+audience is seeded; scored variants render into `#out`.
2. Switching format changes the frames and the length-cap counter/warn.
3. Each variant shows Punch/Clarity/Fit chips + a combined badge; variants sort by score.
4. Over-cap copy shows a warn state, not a thrown error.
5. "Copy" / "Copy winner" work; smoke passes (deterministic, no fetch, default render).

## Out of scope
- Brand-voice training; A/B test tracking; image/banner generation; saving campaigns.
