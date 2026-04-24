# Audit — Round 10

Same D1–D8 rubric. Round 10 extracts the Quick Add autocomplete
block, lights up keyboard-shortcut discoverability, closes two latent
UX bugs (silent log button, English abbreviation), and extends the
locale-switch dialog-close list to cover the R8/R9 extracted dialogs.

Structure: 5 fix/improve items (R10.1, R10.3, R10.4, R10.5, R10.7) +
5 new-feature/element items (R10.2 help key, R10.6 idiomatic EN
ingredient copy, new toasts for R10.3, new i18n keys for help and log
warnings, R10.5 locale-close scope).

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +6 (`keybindingsHelp` × EN+FR, `logNoScan` × EN+FR,
  `logNeedsGrams` × EN+FR). `recipeIngrCount_one/_other` EN values
  reworded from `"{n} ingr."` to `"{n} ingredient(s)"`.
- **Plural contract**: unchanged at 10 plural-aware keys.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,440 → **3,404 lines** (−36 net; qa-autocomplete
  pulled ~50 out, R10.3/R10.5 wired ~12 back).
- **Feature folder**: 2,745 → **2,820 lines across 25 modules**
  (+qa-autocomplete.js 75).
- **Click listeners in app.js**: 61 → **61** (autocomplete uses
  `input`/`focus`/`blur` — not click-bound).

## D3 — Optimization

- `public/` total 853 KB → **860 KB** (+7 KB) — qa-autocomplete module,
  six new i18n entries, the keybindings help + log-warn toasts.
- **R10.1** qa-autocomplete runs exactly the same DOM work as before,
  now via a dedicated module with scoped closures. No new allocations
  per keystroke.
- **R10.2** keybindings help is a single cached i18n lookup + a 6-s
  toast. Zero cost until the user actually presses `?`.

## D4 — Structure

- `/features/` has 25 modules now. The 14th user-surface extraction
  (qa-autocomplete) was flagged in R6–R9 audit carryover. Quick Add
  save + photo-to-food remain as the last ~250 inline lines that
  haven't found a clean fault line yet — too coupled to the
  compressImage / identifyViaModePath pipeline for a comfortable
  extraction this round.
- Remaining inline surfaces in `app.js`: Quick Add save + photo flows
  (~250), dashboard render loops (~250), history search (~50).

## D5 — Logic & Correctness

- **R10.3** fixes a real UX bug: clicking "Log" with no scan loaded
  silently returned. Users saw a dead button. Now emits
  `logNoScan` / `logNeedsGrams` toasts with the `'warn'` variant so
  the cause is visible.
- **R10.4** fixes a silent i18n regression: `recipeIngrCount_other`
  in English read `"{n} ingr."` (French abbreviation) even though
  French users get the idiomatic `"ingr."` and English users expect
  the full word. EN now reads `"3 ingredients"` / `"1 ingredient"`.
  FR abbreviation preserved — it's standard in French recipe UI.
- **R10.5** extends the R7.8 onLangChange dialog-close scope: now
  closes `templates-dialog`, `recipes-dialog`, and
  `recipe-edit-dialog` alongside the existing explain + pillar
  dialogs. Users who switch locale while one of the extracted
  dialogs is open no longer see a FR/EN chip-text mix. Re-opening
  re-renders under the new locale.
- **R10.7** (see action items): the R9 `? → help` key text is
  locale-aware but the individual letters (Q/T/R) are EN-only. FR
  users still see "Q Quick Add" rather than, say, "Q Ajout rapide".
  Intentional: the shortcut keys themselves are English-keyed, so
  documenting their English labels matches the actual key the user
  presses. Revisit if we ever localise the keys.

## D6 — State & Data Integrity

- No new IDB stores.
- qa-autocomplete reads from two pure data sources (food-db +
  listCustomFoods) — no write side effects, no persistence.

## D7 — Error Handling

- **R10.3** new warn toasts for the two log-button guard branches.
- **R10.2** `?` help toast uses the legacy ms-number second argument
  (`toast(msg, 6000)`), exercising the R7.9 dual-signature path for
  the first time in production callsites. All existing variant
  callers remain on `'ok' | 'warn' | 'error'`.

## D8 — Async & Concurrency

- No new timers, no new fetches.
- `?` help toast reuses the single-instance toast element — repeated
  presses collapse into one visible toast (the 2600 / 6000 ms timer
  gets reset each time).

## Round-10 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Quick Add save + photo flows (~250 lines) still inline — too coupled to compressImage + identifyViaModePath to extract cleanly this round | Revisit with a shared /core/compress.js helper first |
| Low | Keyboard letters are EN-only in the `?` help text | Revisit if we localise shortcut bindings |
| Low | Dashboard render loops (~250 lines) | Split into renderDay / renderMicros when we next touch them |
| Low | `?` help toast duration is a hard-coded 6000 ms | Fine for the current key list; revisit if the help grows long |

No critical / major findings. Round 10 closes the qa-autocomplete
extraction flagged since R6, ships two user-facing UX fixes (silent
log button, discoverable shortcuts), and finishes the R7.8 locale-
switch cleanup scope now that two more dialogs have joined the
dynamic-render family.

## Arc summary — Rounds 1 through 10

- `public/app.js`: 4,500+ at round 1 → **3,404 lines** at round 10.
- `/features/`: 0 modules → **25 modules, 2,820 lines**.
- Tests: initial baseline → **538 passing** (zero skipped, zero failing).
- Zero TODO/FIXME markers throughout the ten-round arc.
- Ten real silent bugs fixed: R2 cache-staleness, R3 NOVA edge, R5
  share regression, R6 zero-gram macro erasure, R7.1 FR plural
  lexicon, R7.3 telemetry ReferenceError, R7.9 toast signature,
  R8.4 UTC filename, R9.4 servings display mismatch, R9.7 duplicate
  meal default.
- Ten net-new features: weekly view, monthly view, menu scan, recipes
  plate-to-recipe, life-stage chip, telemetry export, shareOrCopy
  unified, R8.6 duplicate template, R9.2 duplicate recipe, R9.5 +
  R10.2 keyboard shortcuts + help.
