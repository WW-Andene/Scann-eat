# Audit — Round 6

Rubric unchanged (D1–D8). Round 6 delivers the month view, completes
the profile-dialog extraction, and fixes a silent data bug in
`reconcileWithFoodDB`.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +13 (month view × 5, monthly share × 5, viewMonth,
  monthlyDaysLogged × 3). Total plural-aware keys: 8.
- **Plural contract**: new i18n-tests.ts check verifies every `_one`
  key has a matching `_other` across FR + EN. Fail-safe for future
  one-sided adds.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,872 → **3,769 lines** (−103 net; profile
  extraction removes ~190, month view + share + voice meal add ~90).
- **Feature folder**: **2,177 lines across 21 modules** (profile-dialog
  263 lines — the largest extraction yet, which fits the audit-round-5
  note that it's a "hot zone").
- **Click listeners in app.js**: 82 → **80**.

## D3 — Optimization

- `public/` total 797 KB → **806 KB** (+9 KB) — profile-dialog +
  monthly-share presenter + new i18n keys.
- `monthlyRollup` + `formatMonthlyShare` are pure O(n) one-pass
  reducers; same shape as the weekly variants.

## D4 — Structure

- Profile dialog is now the 11th extracted feature. Remaining inline
  surfaces in `app.js`: Quick Add save + identify (~300 after R5.5
  dedupe), recipes dialog (~200), dashboard render loops (~250),
  history search (~50). The path to a sub-3000-line `app.js` is
  maintenance work on these four zones.

## D5 — Logic & Correctness

- **R6.8** fixes a real silent data bug: `reconcileWithFoodDB({
  estimated_grams: 0 })` used to zero out the LLM's kcal estimate
  because the scaling factor `grams / 100 = 0` multiplies every macro
  by 0. Now the reconcile is a no-op when grams ≤ 0; the LLM's own
  estimate survives with `source='llm'`.
- **R6.3** extends voice-dictate: users can say "petit-déjeuner
  bananes" or "dinner steak 400 kcal" and the qa-meal slot auto-snaps.
- **R6.2 onAfterSave** re-renders both the scan-result AND the
  dashboard — the life-stage chip now flips immediately on profile
  save, not on next reload.

## D6 — State & Data Integrity

- No new IDB stores. Month-view choice already in `scanneat.dashboard.
  view` — backup-friendly.
- `life_stage` round-trip through the profile dialog preserved by the
  existing localStorage write, verified by the R4.6 contract test.

## D7 — Error Handling

- `identifyViaModePath` (R5.5) path still owns 429 translation for all
  three qa-photo-* flows. No new endpoints → no divergence.
- monthly-share + daily-share + weekly-share + grocery-share + scan-
  share + pairings-share all route through shareOrCopy — six callsites
  on the unified path now.

## D8 — Async & Concurrency

- `await` count in app.js: 120 → 116.
- Per-minute fasting tick still the only setInterval.

## Round-6 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Quick Add save + autocomplete (~250 lines) is the biggest remaining inline block | Next extraction target |
| Low | `--accent-warm` token only used by one rule so far | Apply to pairings count badge + other info chips over time |
| Low | profile-dialog.js has 200+ lines including the derived preview — could split off a `renderProfileDerived()` if it keeps growing | Defer until the dialog grows again |

No critical / major findings. Round 6 lands the month view that was
stubbed in R5.6, closes the profile-dialog inlining flagged in R5
audit, and fixes a zero-gram data-erasure bug that's been silent for
the lifetime of the LLM identify path.
