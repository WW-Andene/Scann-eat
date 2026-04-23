# Audit — Round 11

Same D1–D8 rubric. Round 11 follows the user's "5 fix + 5 new"
cadence: five quality/correctness improvements, five new user-surface
or data features.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +8 (`recipeShare`, `recipeShareCopied`,
  `recipeShareFailed`, `recipeShareEmpty` × EN+FR). Keybindings help
  expanded to include `W Weight` / `W Poids`.
- **Plural contract**: unchanged at 10 plural-aware keys.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,404 → **3,391 lines** (−13 net). pctClass +
  rows-array pushed out to presenters.js (−30); share chip wire-up
  added back (+17).
- **`/core/presenters.js`**: 945 → **1,028 lines** (+83 —
  `dashboardRowsFrom`, `pctClass`, `formatRecipeShare`).
- **`/features/recipes-dialog.js`**: 311 → **337 lines** (+26 — new
  share-recipe chip).
- **Click listeners in app.js**: 61 → 61. Share chip's listener lives
  in the recipes-dialog module.

## D3 — Optimization

- `public/` total 860 KB → **864 KB** (+4 KB).
- **R11.1** `pctClass` now a pure function in presenters.js — imported
  once, reused everywhere. Same cost, better reuse story.
- **R11.3** Dashboard render replaces two `.innerHTML = ''` with
  `.textContent = ''`. `textContent` is faster (no HTML parsing) and
  safer (no XSS surface) — both containers only ever hold code-
  generated nodes, so there's no compatibility risk.

## D4 — Structure

- `/core/presenters.js` gains three new pure functions, all tested
  (+11 tests): `pctClass`, `dashboardRowsFrom`, `formatRecipeShare`.
- Recipe share chip slots into the existing apply/edit/dup/del row
  layout, between `dup` and `del`. Five chips per recipe — still fits
  on a mobile viewport at the standard type scale.

## D5 — Logic & Correctness

- **R11.2** (fix/improve): extracting the dashboard row array into
  `dashboardRowsFrom` closes a latent source of drift — any future
  addition of a new macro/micro row now has exactly one place to
  edit, and the three unit tests pin ordering + conditional micros
  + the null-safety path. Previously, an unrelated edit to the
  render loop could silently change row order.
- **R11.4** (fix/improve): `innerHTML = ''` → `textContent = ''`
  for the two dashboard containers. Both only ever hold code-
  generated nodes (no injection risk) but `textContent` is the
  defensively-correct idiom and matches the rest of the module's
  container-clear pattern.
- **R11.5** (fix/improve): new tests for `pctClass` pin the three
  band boundaries (79.9/80/99/100) — previously undocumented, now
  contracted. Surfaces future off-by-one regressions immediately.

## D6 — State & Data Integrity

- No new IDB stores.
- `formatRecipeShare` is pure — no persistence side effects.
  Composable with any recipe shape that has `{ name, servings,
  components[] }`.

## D7 — Error Handling

- Share-recipe chip honours the R8.2 `'ok'` variant via the existing
  shareOrCopy plumbing. Empty-recipe edge (no components) toasts
  `recipeShareEmpty` with the `'warn'` variant before attempting to
  format.
- Keybindings `w` only fires when no dialog is open and the user
  isn't typing in a field — same guard as q/t/r.

## D8 — Async & Concurrency

- No new timers, no new fetches. `formatRecipeShare` is synchronous
  and pure.
- Share-recipe chip's click handler is a single await on
  `shareOrCopy` — same pattern as the six other share callsites.

## Round-11 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Dashboard render loop still ~220 lines — `buildDashboardRows` / `renderMealSections` could become DOM helpers co-located with the pure builder | Next round candidate |
| Low | Five chips per recipe row may wrap on ultra-narrow viewports | Ship new CSS breakpoint only if real reports land |
| Low | `w` key label is EN-only in the `?` help text — matches existing R10.7 behavior (keys are English-keyed) | Consistent with prior rounds |

## Cycle summary — Round 11 cadence (5 fix + 5 new)

**Fix/improve (5)**
1. R11.1 Extract `pctClass` → presenters.js (pure, tested).
2. R11.2 Extract dashboard rows array → `dashboardRowsFrom` presenter.
3. R11.3 `dashboardRows.innerHTML = ''` → `textContent = ''`.
4. R11.4 `dashboardEntries.innerHTML = ''` → `textContent = ''`.
5. R11.5 Three new tests pin `pctClass` band boundaries + two more
   pin `dashboardRowsFrom` micro conditionals + null safety.

**New features/elements (5)**
6. R11.6 `w` keybinding opens the weight dialog + help text updated.
7. R11.7 `formatRecipeShare(recipe, { lang })` presenter — compact
   plain-text recipe share block with per-serving totals + bullet
   ingredient list.
8. R11.8 Share-recipe chip in the recipes list — uses the existing
   shareOrCopy plumbing so native share sheet / clipboard / error
   branches all behave identically to the other six share callsites.
9. R11.9 Four new i18n entries per locale (`recipeShare`,
   `recipeShareCopied`, `recipeShareFailed`, `recipeShareEmpty`).
10. R11.10 Five new presenter tests covering `formatRecipeShare`
    (empty, per-serving division, locale header, signature,
    component bullets).

No critical / major findings. Round 11 ships one new user-facing
feature (share a saved recipe), three new pure presenter helpers, and
closes a subtle source-of-truth drift for the dashboard row layout.
