# Audit — Round 8

Same D1–D8 rubric. Round 8 finishes the R7 date-formatter sweep,
lights up the `'ok'` toast variant across every success path, adds a
first-class "duplicate meal" chip, and extracts the meal-templates
dialog (the block that has been on the extraction shortlist since R5).

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +10 (`exportHistoryDone`, `exportHistoryEmpty`,
  `templateDuplicate`, `templateCopySuffix`, `tplItemsCount_one/other`,
  `recipeIngrCount_one/other`, `exportHistoryDone`×EN/FR).
- **Plural contract**: 8 → **10 plural-aware keys** (`tplItemsCount`
  and `recipeIngrCount` added, both with matching EN + FR `_one`/
  `_other`). The R6.5 contract test passes unchanged — new adds
  came in as matched pairs.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,776 → **3,668 lines** (−108 net). Templates
  extraction pulled ~120 out; R8.4 + R8.5 wire-up added back ~12.
- **Feature folder**: 2,250 → **2,434 lines across 23 modules**
  (+templates-dialog.js 174).
- **Click listeners in app.js**: 79 → **72** (−7; all moved into
  templates-dialog.js).

## D3 — Optimization

- `public/` total 815 KB → **832 KB** (+17 KB) — templates-dialog
  module, three new i18n entries × two locales, presenters dateFormatter
  import. Negligible on-the-wire.
- **R8.1** completes the R7 `dateFormatter` sweep: `formatWeeklyShare`
  (2 callsites) + `formatDailySummary` (1 callsite) now reuse cached
  `Intl.DateTimeFormat` instances instead of re-allocating on every
  share. Weekly-share in particular allocates a `{ weekday, day }`
  formatter per rendered day — the cache makes it O(1).

## D4 — Structure

- `/features/` has 23 modules now. Templates-dialog is the 12th
  extracted feature. Remaining inline surfaces in `app.js`: Quick Add
  save + autocomplete (~300 lines), recipes dialog (~200 lines),
  dashboard render loops (~250 lines), history search (~50 lines).
- Templates extraction reuses the deps-shape pattern from backup-io
  and profile-dialog — no new conventions introduced.

## D5 — Logic & Correctness

- **R8.4** fixes a real latent bug: `exportHistoryBtn` stamped the
  download filename with `new Date().toISOString().slice(0, 10)` — UTC,
  not local. A user in western time zones clicking "Export history"
  shortly after midnight would see tomorrow's date in their filename,
  which contradicts every other export flow in the app (all use
  `todayISO()` via `Intl.DateTimeFormat('en-CA')` — local). Now unified.
  Also added a missing success toast (`exportHistoryDone`) + an empty-
  state toast (`exportHistoryEmpty`) — before R8, the user's only
  feedback was the browser-level download notification.
- **R8.7** fixes a silent i18n regression: the recipes list rendered a
  hard-coded `"ingr."` suffix in both locales, and the templates list
  rendered a hard-coded English `"items"` even in French. Both are now
  plural-aware via `tplItemsCount` / `recipeIngrCount`. FR users now
  see `3 éléments` in the templates dialog instead of `3 items`.
- **R8.2** standardises the success stripe: `shareOrCopy`'s clipboard
  path now emits `toast(msg, 'ok')` rather than the variant-less form.
  Seven share callsites (pairings / daily / weekly / monthly / grocery
  / scan / telemetry) inherit the new success accent at once.
- **R8.3** paints the remaining direct success toasts: template saved,
  template applied, recipe applied, custom food saved, meal-plan
  applied, identify-multi plate logged, telemetry cleared / exported.
  Every user action that is unambiguously a success now shows the
  green stripe; warn / error sites keep their colors.

## D6 — State & Data Integrity

- **R8.6** new feature: duplicate-meal chip in the templates list.
  Prompts with "{original} (copie)" / "(copy)" pre-selected so one
  Enter is enough for the common clone-and-tweak flow. Saved as a
  fresh IDB row via the existing `saveTemplate(...)` — no schema
  change, no migration. Deleting either copy leaves the other intact.
- No new IDB stores. Backup / restore shape unchanged.

## D7 — Error Handling

- Export-history empty state now has a user-visible warn toast rather
  than silently producing an empty `[]` JSON file.
- Telemetry export / clear + meal-plan apply + identify-multi all now
  differentiate `'ok'` (success) vs `'warn'` (bounce) vs `'error'` at
  the toast level.

## D8 — Async & Concurrency

- Templates dialog: the `askTemplateName()` promise-based prompt now
  accepts an optional initial value (used by the duplicate chip).
  Close + cancel cleanup order preserved — same fix as R5 ("Cleanup
  BEFORE close" comment retained in the extracted module).
- `await` count in app.js: 116 → **120** net; the dup-chip handler
  introduces one await per iteration of its list row, but those are
  bound to user clicks, not a hot loop.

## Round-8 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Recipes dialog (~200 lines inline) remains the next biggest extraction target | Next round candidate, mirrors the templates extraction shape |
| Low | `recipeIngrCount_one` / `_other` carry the same `"ingr."` string in both locales — a full ingredient word would be nicer | Cosmetic, defer |
| Low | `shareOrCopy` now hard-codes `'ok'` — callers can't opt out | Intentional: the whole point of the unification was that every share-copy reports success the same way |
| Low | Quick Add save + autocomplete still ~300 lines inline | Audit carryover from R6, R7, R8 |

No critical / major findings. Round 8 closes one silent bug
(exportHistory UTC filename), one silent i18n regression (FR users
seeing English `"items"`), extracts a 120-line inline block, and adds
one net-new user feature (duplicate template) that makes variant
creation one tap instead of a full retype.
