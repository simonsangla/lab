# Spec: Insight Deck

- **app-name:** Insight Deck
- **app-description:** Paste a metrics CSV and get auto-generated insights, KPI cards and a copyable executive readout.
- **app-tags:** analytics,kpi,insights,reporting
- **slug:** insight-deck
- **filename:** apps/2026-06-19-insight-deck.html
- **shortlist pick:** "AI-driven data analytics & insights as a service" (Mercor lane)

## Intelligence (deterministic, offline)
Productize the KPI deliverable in-browser — plays to a Snowflake analytics
background. Parse a metrics CSV (period column + 1..N metric series). Per metric
compute: latest value, period-over-period % change, trend direction, simple
linear-fit slope, min/max, and a z-score outlier flag on the latest point.
Generate a deterministic narrative: one ranked insight sentence per metric
("Revenue rose 14% MoM to 1.2M — fastest in the series", "Churn flagged: latest
point 2.3σ above mean") using templates keyed by the computed signals. Render KPI
cards (value + delta arrow, green up / red down via tokens) + a sparkline bar per
metric. "Copy executive readout" exports the ranked insights as markdown.

## Reuse
- `parseCsv()` — cohort-grid ~158–180.
- Bar/sparkline render + tokened colors — cohort-grid color utils 207–246.
- Multi-axis scoring/ranking shape — ai-money-map `score()` ~364–395 (adapt to signal ranking).
- Clipboard fallback — hello-lab ~228–254.
- `.lab-card` KPI cards; status classes for up/down.

## Acceptance
1. On load, a default metrics CSV is seeded; KPI cards + ranked insights render into `#out`.
2. Up vs down deltas are colored via tokens (green/red), with arrow glyphs.
3. An obvious outlier row produces a flagged insight sentence.
4. Malformed CSV → friendly inline error, no throw.
5. "Copy readout" works; smoke passes (deterministic, no fetch, default render).

## Out of scope
- Real data connectors; forecasting beyond a linear fit; XLSX/PPTX export; saving.
