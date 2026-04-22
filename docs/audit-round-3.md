# Audit — Round 3

Same rubric (D1–D8 per code-audit-SKILL.md), after the Round 3
10-improvement batch.

## D1 — Format & Conventions

- **TODO/FIXME count**: still 0.
- **i18n keys**: +12 (life-stage, save-as-template, duplicate-barcode,
  plural variants for clearTodayConfirm, mealOfDayShort). All added in
  both FR and EN.
- **Plural contract**: `t(key, { n })` now picks `<key>_one` / `<key>_other`
  variants via Intl.PluralRules. Backward-compat: the bare key still
  works when no variants are declared.

## D2 — Health & Hygiene

- **`public/app.js`**: 4,259 → **4,100 lines** (–159 net after three
  more extractions: onboarding, install-banner, backup-io).
- **Feature folder**: **1,414 lines across 14 modules**. All new
  modules ≤ 130 lines and conform to `initX(deps)` DI.
- **Click listeners in app.js**: 92 → **88**. Extraction trend
  continues.
- Dead code: none introduced.

## D3 — Optimization

- `public/` total 771 KB → **779 KB** (+8 KB) — small net bump from the
  three new feature files offset by extraction removing bytes from
  app.js.
- `Intl.PluralRules` is cached per locale — the constructor is not free
  but we only instantiate once per user session per language.

## D4 — Structure

- The feature-folder split is mature enough that the remaining inline
  surface inside `app.js` is: profile dialog (~200), Quick Add
  (~400 — big because of autocomplete + photo-identify), recipes
  (~200), pantry + grocery dialogs (~50 each), weekly / dashboard
  render loops (~250), history search (~50). Next extraction target
  is the profile dialog (less coupled than Quick Add).

## D5 — Logic & Correctness

- **R3.2 fixes a real mislabel**: raw banana / apple / vegetable
  scanned by barcode used to collapse to NOVA 4 because
  `inferNovaClass({ ingredients: [] })` returned 4 unconditionally. Now
  a 30-entry FR+EN lexicon catches the common case and returns NOVA 1.
  The existing NOVA-fallback-to-4 path stays in place for unfamiliar
  empty-ingredient products (conservative). +3 engine tests.
- **R3.4 extends R2.5 life-stage coverage**: iron baseline across
  sex+age brackets, stage overrides composing correctly with TDEE, AMDR
  targets scaling with stage kcal delta. +6 personal-score tests.
- **R3.5 closes a CSV gap**: daily CSV export was missing fiber + four
  micronutrients (iron, calcium, vit D, B12) even though the totals
  were being tracked and displayed in the dashboard.
- Remaining untested modules: the IDB data modules (same intentional
  gap — needs fake-indexeddb or similar shim).

## D6 — State & Data Integrity

- No new IDB stores; DB_VERSION=6 holds.
- Save-as-template (R3.7) uses the existing saveTemplate shape so it
  flows through the same upgrade guard as legacy templates.
- Duplicate-barcode skip (R3.8) doesn't touch persisted state — it's
  purely queue-local.

## D7 — Error Handling

- clear-today now distinguishes "empty day" from "user wants to wipe"
  (R3.9) — toast instead of silent no-op, confirm instead of instant
  delete. Tier-2 destructive action now gated.
- try/catch count in app.js: 81 → **76** (three extractions carried
  their own catches out with them).

## D8 — Async & Concurrency

- 148 `await` usages → 142 (backup-io + install-banner extractions).
- No new setTimeout scheduling outside extracted features.

## Round-3 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Profile dialog is ~200 lines inline | Extract next |
| Low | app.js still imports ~40 symbols from presenters | Batch by feature when adding next extraction |
| Low | i18n plural helper only used in one key (canary) | Adopt in pendingScansN, mealPlanDays, etc. over time |

No critical / major findings. Round 3 closes the NOVA-fresh-produce
mislabel (real data-quality bug), the CSV-export micronutrient gap, and
adds Intl-based plural support for future keys.
