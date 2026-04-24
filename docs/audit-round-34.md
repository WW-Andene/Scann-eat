# Audit — Round 34 (proper)

Per user direction: a round is `{find+improve, find+implement} × N +
audit + restructure`. This round shipped 4 improvements + 4
implementations instead of the target 10+10 due to session budget;
items picked on value density, not filler.

Uses the D1–D8 rubric from `app-audit-SKILL.md` and the file-boundary
conventions from `app-restructuring-SKILL.md`.

## D1 — Format & Conventions
- **TODO/FIXME count**: 0.
- **i18n keys**: +13 per locale (weight × 3, recipes-search × 2,
  templates-search × 2, customFoodUpdatedToast, groceryMarkdown).
- **Plural contract**: unchanged at 11 plural-aware keys.

## D2 — Health & Hygiene
- `public/app.js`: +~35 lines (compare TTL, weight toast deps, CF
  edit-id stash, grocery markdown wire-up).
- `public/features/`: +~30 lines net (recipes-dialog + templates-
  dialog search; weight validation).
- `public/data/custom-food-db.js`: saveCustomFood normalised via
  buildCustomFood so edits don't drop aliases/created_at/custom.

## D3 — Optimization
- Search inputs run client-side over already-fetched IDB lists — no
  new network round-trips. Re-fetch on each keystroke is acceptable
  for typical list sizes (< 100) and keeps state logic simple.

## D4 — Structure
- No new modules. All changes land in existing feature-folder
  homes: `templates-dialog`, `recipes-dialog`, `grocery-list`,
  `weight`, `onboarding`, `csv-import`, and `app.js` for the
  cross-cutting compare-armed concern.
- `saveCustomFood` now has a single build path (always through
  `buildCustomFood`). Reduces the upsert-vs-create branching the
  caller had to care about.

## D5 — Logic & Correctness
- **R34.I1 (latent bug)**: compare-armed never expired. Users who
  armed the flag once and came back days later saw a bogus diff
  against an unrelated product. 24 h TTL chosen to match the
  "single session" intent.
- **R34.I2 (style + correctness)**: onboarding uses
  addEventListener everywhere with a tear-down on close, instead
  of mixing .onclick assignments with addEventListener. Handlers
  are disposable.
- **R34.I3 (validation gap)**: weight save accepted 0 or > 400 kg
  silently (`logWeight` threw an uncaught error). Now inline
  warn-toast + rejected submit.
- **R34.I4 (silent data loss)**: CSV import dropped rows with
  D/M/YYYY dates where day > 12. Now correctly interprets the
  unambiguous cases.

## D6 — State & Data Integrity
- `saveCustomFood({ id })` now preserves the existing row's
  aliases + created_at + custom flag via buildCustomFood. The edit
  flow (R34.N3) no longer loses metadata on upsert.

## D7 — Error Handling
- Weight save: warn-toast for invalid input, ok-toast on success,
  error-toast on IDB failure. All three branches covered.
- Search-no-match rendering: `recipesSearchNoMatch` /
  `templatesSearchNoMatch` replaces the bare empty list so users
  know their filter is active.

## D8 — Async & Concurrency
- No new timers or fetches. Search inputs are synchronous filter
  closures over the already-fetched IDB list.

## Round-34 action items carried forward
| Severity | Item | Fix |
|---|---|---|
| Low | Did not reach the full 10+10 cadence | Budget; remaining candidates queued for R35 |
| Low | Grocery markdown checkbox not persisted across sessions | Deferred; not worth a new LS key |
| Low | Search inputs re-fetch IDB per keystroke | Cache in memory if users complain |

## Items queued for future rounds
- Day-note preview on dashboard header
- Hydration reset button with confirm
- Recipes/templates sort toggle (name/kcal/recent)
- Weekly kcal trend chip in dashboard header
- Profile export JSON
- Fasting history share chip
- Copy yesterday's log to today
- Per-day hydration history chart

## Arc state
- Tests: 567 passing across 34 rounds.
- `public/app.js`: 4,500+ → 3,479 (accrued ~30 lines this round).
- `/features/`: 25 modules, no new modules this round.
