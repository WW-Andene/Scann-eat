# Audit — Round 26

Final polish of the date-integrity sweep.

## Fix/improve (real)
- **R26.1 (real data-integrity bug, progress charts)**: the 30-day
  series builder in `renderProgressCharts` mixed local `Date`
  arithmetic (`setDate(-i)`) with UTC-based `toISOString().slice(0, 10)`.
  For users outside UTC, this could offset the series by one day at
  time-zone edges — silently misaligning weight entries with kcal
  columns in the progress chart. Since R25.1 the entries themselves
  are stamped with `localDateISO`, which made the chart rendering
  strictly inconsistent with the stored data until this fix.
  Replaced with a clean `localDateISO(nowMs − i · 86_400_000)` loop.

## Audit of remaining UTC-ish callsites (low-priority, flagged)
- `meal-plan.js:74` — `pruneOld` uses UTC cutoff day. A plan row can
  survive one extra day or get pruned one day early in tz offsets.
  Defer.
- `meal-plan.js:51` — `weekDates` intentionally anchors on UTC
  midnight of the provided local date. The UTC iteration keeps the
  output ISO strings consistent with the input local date. Correct.
- `weight-log.js:138` — weekly-trend cutoff uses UTC day. ± 1 day
  drift absorbed by regression slope; low impact. Defer.
- `presenters.js:995` — daily CSV export's `ymd` closure. Low
  frequency, export-only. Defer.

## Arc state
- Tests: 567 passing.
- Real silent bugs killed in the R8 → R26 arc:
  - R8.4 export-history UTC filename
  - R9.4 servings display mismatch
  - R9.7 duplicate-template default meal
  - R13.1 hard-coded French `(paquet)`
  - R14.1 hard-coded `'Sans nom'` leaked to EN users (×3 sites)
  - R15.1 hard-coded `'Source :'` in additive dialog
  - R16.1 hard-coded `'Δ 30 j'` + `'kg/sem'` in weight summary
  - R20.1 saveTemplate regenerated id, breaking meal-plan refs
  - R20.2 activity excluded from import count
  - R22.1 recipesDialog.close() silent no-op since R9.1
  - **R25.1 consumption + quickAdd entries stamped with UTC date
    (both paths)** ← biggest silent data-integrity bug
  - **R26.1 progress charts tz-offset misaligning weight & kcal**
