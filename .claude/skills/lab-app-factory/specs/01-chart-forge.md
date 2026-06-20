# Spec: Chart Forge

- **app-name:** Chart Forge
- **app-description:** Paste a CSV and get an instant bar, line or area chart you can export as a PNG — no signup, no backend.
- **app-tags:** data,visualization,charts,tools
- **slug:** chart-forge
- **filename:** apps/2026-06-19-chart-forge.html
- **shortlist pick:** "AI-enhanced data visualization & reporting tools" (lab lane)

## Intelligence (deterministic, offline)
Pure rendering + light stats — no model. Parse CSV (label column + 1..N numeric
series). User picks chart type (bar / line / area) via a `<select>`. Render to an
inline SVG (crisp, theme-tokened) and recompute on input (debounced). Auto-derive:
min/max/sum/avg per series shown as a caption; nice axis ticks via a
round-to-1/2/5·10^n algorithm. "Insight" line is deterministic: largest series,
biggest week-over-week jump, and peak label.

## Reuse
- `parseCsv()` — cohort-grid ~158–180 (lift as-is; supports multi-series).
- `token()` / `parseColor()` — cohort-grid 207–227 (brand color for canvas export).
- Color ramp `lerp`/`rgbToCss` — cohort-grid 234–246 (series colors).
- Canvas → PNG export handler — cohort-grid ~377–432 (adapt to redraw the chart).
- Debounced render — cohort-grid `clearTimeout(timer)…`.
- Clipboard fallback (for "copy insight") — hello-lab ~228–254.

## Acceptance
1. On load, a default CSV is seeded and a bar chart + stats render into `#out`.
2. Switching the type `<select>` to line/area re-renders without reload.
3. Pasting a malformed CSV shows a friendly inline error, not a thrown exception.
4. "Export PNG" downloads a brand-colored image of the current chart.
5. Smoke passes: no fetch, canvas/getContext only on the export click, default render on load.

## Out of scope
- Multiple chart types on screen at once; pie/scatter; CSV file upload (paste only);
  any persistence.
