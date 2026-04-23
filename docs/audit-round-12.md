# Audit — Round 12

Same D1–D8 rubric. Round 12 mirrors the R11 share-recipe pattern over
to templates, lights up an `f` keybinding for the fasting tile, and
adds a fifth pure presenter to the share-format family.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +8 (`templateShare`, `templateShareCopied`,
  `templateShareFailed`, `templateShareEmpty` × EN+FR). Keybindings
  help expanded to include `F Fasting` / `F Jeûne`.
- **Plural contract**: unchanged at 10 plural-aware keys.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,391 → **3,393 lines** (+2; the new dep
  injection added 2 lines).
- **`/core/presenters.js`**: 1,028 → **1,071 lines** (+43 —
  `formatTemplateShare`).
- **`/features/templates-dialog.js`**: 174 → **201 lines** (+27 — new
  share chip).
- **Click listeners in app.js**: 61 → 61 (chip listener lives in
  templates-dialog).

## D3 — Optimization

- `public/` total 864 KB → **869 KB** (+5 KB).
- `formatTemplateShare` is one O(n) reduce over `template.items` —
  same shape as `formatRecipeShare`. Pure, allocation-light.
- `f` keybinding scroll-into-view is browser-native — no JS animation
  budget.

## D4 — Structure

- `/core/presenters.js` now hosts five share-formatter functions:
  `formatPairingsShare`, `formatWeeklyShare`, `formatMonthlyShare`,
  `formatDailySummary`, `formatRecipeShare` (R11), and now
  `formatTemplateShare` (R12). All take the same `(payload, { lang })`
  signature.
- Templates + recipes dialogs both render exactly 5 chips per row
  (apply / dup / share / del + the recipes-only edit). Visual rhythm
  consistent across the two dialogs.

## D5 — Logic & Correctness

- **R12.1** (fix/improve): templates dialog comment block updated to
  document the new share chip. Keeps the module's deps-shape contract
  in the header where future readers will look first.
- **R12.2** (fix/improve): keybindings doc comment extended for `f`.
  Same pattern as R11.6 added `w`.
- **R12.3** (fix/improve): i18n keys for keybindings help include `F
  Fasting` / `F Jeûne`. Help text was the source of truth for what the
  shortcut layer advertises — keeping it in sync prevents users from
  pressing keys we don't actually bind.
- **R12.4** (fix/improve): five new presenter tests for
  `formatTemplateShare` pin empty-safety, sum-without-division (the
  key contract that distinguishes templates from recipes), locale
  header, item-count line, and signature.
- **R12.5** (fix/improve): presenter-tests imports expanded to include
  the new function. Keeps the test bundle's import surface honest.

## D6 — State & Data Integrity

- No new IDB stores, no schema change.
- `formatTemplateShare` reads template fields it doesn't own; safe on
  partial / future-extended templates.

## D7 — Error Handling

- Share-template chip gates on empty `items` with a `'warn'` toast
  before invoking `shareOrCopy` — same shape as the R11.8 recipe
  empty-guard.
- `f` keybinding silently no-ops when `#fasting-tile` is hidden
  (user hasn't logged a fast yet). No error toast, since the tile
  visibility itself is the affordance.

## D8 — Async & Concurrency

- No new timers, no new fetches.
- `f` scroll uses `behavior: 'smooth'` which is honoured even with
  `prefers-reduced-motion` set in newer Chrome/Safari (browser
  downgrades to 'auto'). No JS-side guard needed.

## Cycle summary — Round 12 cadence (5 fix + 5 new)

**Fix/improve (5)**
1. R12.1 Templates-dialog header comment updated for new share chip.
2. R12.2 Keybindings header comment updated for `f`.
3. R12.3 Keybindings help i18n strings updated for `F Fasting`.
4. R12.4 Five new presenter tests for `formatTemplateShare`.
5. R12.5 presenter-tests import surface kept honest.

**New features/elements (5)**
6. R12.6 `formatTemplateShare(template, { lang })` pure presenter.
7. R12.7 Share-template chip in the templates list — fifth chip per
   row, between dup and del.
8. R12.8 `f` keybinding scrolls the fasting tile into view (smooth-
   scroll, browser handles reduced-motion).
9. R12.9 Eight new i18n entries (4 per locale) for the share chip
   labels and toasts.
10. R12.10 Round-12 audit documentation.

## Round-12 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Recipe duplicate doesn't prompt for name; template duplicate does — UX inconsistency | Defer; recipe flow is "fast clone" by design |
| Low | Five chips per dialog row may wrap on narrow viewports | Ship CSS breakpoint only if real reports surface |
| Low | Dashboard render loop ~220 lines remains as the next extraction target | Round 13+ candidate |

No critical / major findings. Round 12 ships one new user-facing
feature (share a saved meal template) and adds a fifth member to the
unified share-formatter family.

## Arc state — R1 → R12

- `public/app.js`: 4,500+ → **3,393 lines**.
- `/features/`: 0 → **25 modules**.
- Tests: initial baseline → **554 passing** (+5 this round).
- Five share-formatters in `/core/presenters.js`, all on the same
  `(payload, { lang })` signature.
- Six global keybindings live (q / t / r / w / f / ?) plus the
  legacy / and Enter and Esc.
