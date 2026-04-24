# Audit — Round 14

Same D1–D8 rubric. Round 14 hunts and kills another silent French-
text-in-English-UI bug — this one persisted to IDB at template /
recipe save time. Three layers needed coordinated changes (data,
UI, presenter) to keep both new and historical rows correct.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +4 (`untitledTemplate`, `untitledRecipe` × EN+FR).
- **Plural contract**: unchanged at 11 plural-aware keys.

## D2 — Health & Hygiene

- **`public/data/meal-templates.js`**: `'Sans nom'` literal removed.
- **`public/data/recipes.js`**: two `'Sans nom'` literals removed
  (one in `aggregateRecipe`, one in `saveRecipe`).
- **`public/core/presenters.js`**: locale-aware fallback added in
  both `formatRecipeShare` and `formatTemplateShare`. +12 lines.
- **`public/styles.css`**: +6 lines for the `.untitled` muted-italic
  rule.
- **`public/features/templates-dialog.js`** + `.../recipes-dialog.js`:
  display-time `t('untitledX')` substitution with `.untitled` class.

## D3 — Optimization

- `public/` total 875 KB → **876 KB** (+1 KB; mostly i18n entries).
- No new allocations, no new DOM nodes per render.

## D4 — Structure

- Three-layer split is now explicit: data layer stays locale-neutral,
  presenters render based on `{ lang }`, UI dialogs render based on
  the current locale via `t()`. The legacy 'Sans nom' sentinel is
  detected in the presenter so historical rows still display
  correctly under the new contract.

## D5 — Logic & Correctness

- **R14.1 (real i18n bug, multi-locale)**: `saveTemplate` and
  `saveRecipe` were storing `'Sans nom'` (French) into the user's
  IndexedDB whenever a name was missing. English-locale users with
  unnamed templates / recipes saw a French word in their list, in
  the share output, and in any export — for the lifetime of those
  rows. Fix moves the substitution to the UI/presenter layer so
  storage stays locale-neutral.
- **R14.2 (UI fallback)**: templates + recipes list rows now
  substitute `t('untitledTemplate')` / `t('untitledRecipe')` at
  render time. New rows save as `''`, render as locale string.
- **R14.3 (legacy data compat)**: presenters detect the legacy
  `'Sans nom'` sentinel from pre-R14 IDB rows and render it through
  the locale-aware fallback. EN users opening a French-locale
  Sans-nom recipe via the share button now see "Untitled" instead
  of leaking "Sans nom" into the share text.
- **R14.4 (a11y / visual)**: `.untitled` CSS class adds muted italic
  to the placeholder name so users can visually distinguish a
  fallback from a real name.
- **R14.5 (test contract)**: `recipe-tests.ts` updated to assert
  the new empty-name contract; four new presenter tests pin both
  the empty and the legacy-sentinel paths in EN + FR.

## D6 — State & Data Integrity

- New rows: `name: ''` in IDB. Renders correctly in both locales.
- Legacy rows: `name: 'Sans nom'` still in IDB. Read-time fallback
  catches the sentinel; no migration script needed.
- Backup / restore round-trip: empty names round-trip as empty;
  legacy 'Sans nom' rows survive as-is until the user re-saves
  them (at which point they get the new empty contract).

## D7 — Error Handling

- No new error paths. `t('untitledX')` falls back to EN if a future
  locale doesn't define the key (existing i18n behavior).

## D8 — Async & Concurrency

- No new timers, no new fetches, no new awaits.

## Cycle summary — Round 14 cadence (real wins only)

**Fix/improve (real, user-visible):**
1. R14.1 Data layer no longer bakes 'Sans nom' into IDB.
2. R14.2 Templates list renders empty-name rows as `t('untitledTemplate')`.
3. R14.3 Recipes list renders empty-name rows as `t('untitledRecipe')`.
4. R14.4 Both presenters detect legacy 'Sans nom' sentinel and
   substitute the locale string for EN users.
5. R14.5 Updated recipe-tests.ts contract; +4 presenter tests pin
   the new empty-name + legacy-sentinel behavior.

**New features/elements (real, user-visible):**
6. R14.6 `t('untitledTemplate')` / `t('untitledRecipe')` i18n keys
   in EN + FR (4 new entries).
7. R14.7 `.untitled` CSS class — muted italic so untitled rows are
   visually distinguishable from a real name.

(R14 is heavier on fixes than new features by design — the core
work is one real bug split across three layers.)

## Round-14 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Existing IDB rows with 'Sans nom' won't update until the user re-saves | Acceptable; presenter detects the sentinel |
| Low | Other data-layer modules might have similar locale leaks | Audit callers of t() and `saveX` symmetrically next round |

No critical / major findings. Round 14 closes a real cross-locale
data-leakage bug that had been silent for the lifetime of the
templates + recipes features.

## Arc state — R1 → R14

- `public/app.js`: 4,500+ → **3,419 lines**.
- `/features/`: 0 → **25 modules**.
- Tests: initial baseline → **567 passing** (+4 this round).
- Real silent bugs fixed: R2 cache-staleness, R3 NOVA edge, R5 share
  regression, R6 zero-gram macro erasure, R7.1 FR plural lexicon,
  R7.3 telemetry ReferenceError, R7.9 toast signature, R8.4 UTC
  filename, R9.4 servings display mismatch, R9.7 duplicate meal
  default, R13.1 hard-coded paquet, **R14.1 hard-coded 'Sans nom'**.
