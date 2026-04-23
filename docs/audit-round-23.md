# Audit — Round 23

Dashboard per-meal + accessibility pass. Every delete button that
previously carried a generic "Delete X" aria-label now includes the
target entry's identifying field (name / date / weight / etc.) so
screen-reader users can disambiguate.

## Fix/improve (real, a11y)
- **R23.1** Consumption-entry delete button's aria-label now includes
  the product name (e.g. "Delete entry — Yaourt nature"). Previously
  a screen-reader user heard "Delete entry" twelve times for a full
  day's log with no way to tell which row would be deleted.
- **R23.2** Weight-history delete: aria-label now `"Delete weight
  entry — 2026-04-23, 72.5 kg"`.
- **R23.3** Template delete: aria-label includes the template name
  (falls back to generic when name is missing).
- **R23.4** Recipe delete: aria-label includes the recipe name.

## Arc state
- Tests: 567 passing.
- All delete buttons across the app now carry identifying aria-labels
  (dashboard entries, weight history, templates, recipes, scan
  history — R13.4).
