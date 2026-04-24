# Audit — Round 9

Same D1–D8 rubric. Round 9 delivers the big extraction that has been
on the action-item list since R6 — the Recipes dialog. Also lights up
quick-access keybindings, adds the duplicate-recipe chip, and closes
a latent "meal-not-forwarded" bug in the R8 duplicate-template code.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +4 (`recipeDuplicate`, `recipeDuplicatedToast` × EN+FR).
- **Plural contract**: unchanged at 10 plural-aware keys. R8's
  `tplItemsCount` + `recipeIngrCount` are now consumed by the extracted
  recipes module as well.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,668 → **3,440 lines** (−228 net). Recipes
  extraction pulled ~240 out; the module's init wire-up added back
  ~10.
- **Feature folder**: 2,434 → **2,745 lines across 24 modules**
  (+recipes-dialog.js 311).
- **Click listeners in app.js**: 72 → **61** (−11, all migrated into
  recipes-dialog.js).

## D3 — Optimization

- `public/` total 832 KB → **853 KB** (+21 KB) — recipes-dialog
  module, the new i18n entries, the keybindings enhancement.
- **R9.5** keybindings now early-returns when a `dialog[open]` exists,
  so the new `q` / `t` / `r` shortcuts don't compete with in-dialog
  typing. Cheap guard, saves one wrong keystroke per dialog session.

## D4 — Structure

- `/features/` has 24 modules now. Recipes is the 13th extracted
  feature and the largest single extraction so far (311 lines out,
  matching the templates pattern from R8).
- Remaining inline surfaces in `app.js`: Quick Add save + autocomplete
  (~300), dashboard render loops (~250 — tightly coupled, harder to
  split), history search (~50). The Recipes extraction knocks the
  biggest remaining block off the list.
- Module-owned state pattern: `recipes-dialog.js` keeps
  `editingRecipe` and `lastIdentifiedPlate` inside its IIFE closure,
  exposing a single `setLastIdentifiedPlate(items)` handle. App.js no
  longer mutates a shared let-binding — the qa-photo-multi handler
  now pushes through the setter.

## D5 — Logic & Correctness

- **R9.4** fixes a display/compute mismatch in the recipe editor:
  `recalcRecipeTotals()` previously passed `Number(val) || 1` to
  `aggregateRecipe` (which internally clamps to `max(0.1, n)`), but
  the label rendered `max(1, round(n))`. Users typing `0.5` saw the
  editor say "per 1 serving" while the displayed totals were
  computed at `/0.5`. Now both sides clamp to `max(1, round(n))`.
- **R9.7** fixes a silent regression from R8.6: the duplicate-template
  chip passed only `{ name, items }` to `saveTemplate`, so every
  clone inherited the parameter-default `meal: 'snack'` regardless of
  the source template's actual meal. Forwarding `meal: tpl.meal` now
  lets lunch/dinner/breakfast templates clone into the correct slot.
- **R9.2** new feature: duplicate-recipe chip on the recipes list,
  mirroring the R8.6 template duplicate. Saves the clone immediately
  (no name-prompt round-trip for recipes — the "(copy)" suffix is
  applied inline) so the new row appears in the list without extra
  clicks. Covered by a new `recipe-tests.ts` case that pins the
  aggregator's bit-for-bit stability across name changes.

## D6 — State & Data Integrity

- No new IDB stores. Recipes store already existed (`recipes` store,
  DB v6). Duplicate is a plain `saveRecipe(...)` with a fresh UUID.
- `lastIdentifiedPlate` is no longer a top-level module `let` in
  app.js. Encapsulated inside recipes-dialog.js with explicit reset
  on empty arrays. No persistence — reset on every page reload,
  matches prior behavior.

## D7 — Error Handling

- Recipe duplicate path has its own try/catch + `console.error`
  breadcrumb, same shape as the existing save/apply handlers.
- Keybindings 'q'/'t'/'r' don't fire inside `<input>` / `<textarea>`
  / `<select>`, so typing a recipe name with those letters never
  triggers a surprise dialog. Verified manually via the guard.

## D8 — Async & Concurrency

- **R9.5** new shortcuts are synchronous button-click triggers — no
  new timers, no new fetches. `Escape` still wins over `/` still wins
  over `Enter` still wins over q/t/r (ordering explicit in the
  handler).
- `await` count in app.js: 120 → 107 (−13; every await in the
  extracted recipes block migrated into the module).

## Round-9 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Recipe editor still doesn't expose sat_fat / sugars / salt inputs per component — `saveRecipe` persists zeros for those fields | Matches prior behavior; add columns when we need them |
| Low | Quick Add save + autocomplete (~300 lines) is now the biggest remaining inline block | Next extraction target after three rounds on the list |
| Low | `recipeIngrCount_one/_other` still reads "{n} ingr." in English — idiomatic copy wants "{n} ingredient/ingredients" | Cosmetic, defer |
| Low | Keyboard shortcut hint not discoverable in UI | Consider a "?" keybinding that prints a cheat sheet toast |

No critical / major findings. Round 9 closes the biggest extraction
on the audit carryover list (−228 lines from app.js), lands two new
user-facing features (duplicate-recipe chip + q/t/r shortcuts), and
fixes two silent bugs (R9.4 servings mismatch, R9.7 duplicate-template
meal default).
