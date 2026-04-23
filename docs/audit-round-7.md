# Audit — Round 7

Same D1–D8 rubric. Round 7 centralises Intl.DateTimeFormat construction,
catches a real toast signature bug, and closes the month-view feature
loop (on-goal chip).

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +9 (monthly on-goal × 1, telemetry export × 5,
  telemetryClearConfirm, telemetryCopyFailed, telemetryTitle).
- **Plural contract**: still 8 keys; no new plural-aware adds this
  round. Contract still enforced by the R6.5 test.

## D2 — Health & Hygiene

- **`public/app.js`**: 3,769 → **3,776 lines** (+7 net). R7 extracted
  menu-scan (~55 lines out) but also landed toast sig + commentary +
  onLangChange dialog-close + monthly on-goal chip + telemetry export
  wiring. Code-weight trade is net-neutral — the extractions stay
  ahead of the feature adds.
- **Feature folder**: 2,177 → **2,250 lines across 22 modules**
  (+menu-scan.js 73).
- **Click listeners in app.js**: 80 → **79**.
- Dead code: none.

## D3 — Optimization

- `public/` total 806 KB → **815 KB** (+9 KB) — menu-scan + date-format
  + expanded telemetry tests + i18n keys.
- New: `dateFormatter` cache (R7.4) eliminates ~5-10 Intl.DateTimeFormat
  allocations per render. Not a bottleneck in practice, but paying
  down future cost for free.
- New: fasting tick pauses when the tab is hidden (R7.6) — small but
  real battery win for users who keep the PWA open in a background
  tab.

## D4 — Structure

- `/core/` gained `date-format.js` alongside the earlier `dateutil.js`
  and `share.js`. Three shared-helper modules now.
- Remaining inline surfaces in `app.js`: Quick Add save + autocomplete
  (~300), recipes dialog (~200), dashboard render loops (~250 —
  tightly coupled to DOM; could split into renderDay / renderMicros),
  history search (~50), explain + pillar dialogs (~50 combined; small
  enough to stay inline).

## D5 — Logic & Correctness

- **R7.1** fixes a silent data bug: OFF scans of "pommes" or
  "courgettes" (FR plural forms) were still falling through to NOVA 4
  because the lexicon only matched singular forms with `\b`. Trailing
  `s?` rescue the common case. +1 engine test pins 5 plural names.
- **R7.3** fixes a latent runtime bug: `setBackupStatus()` was a
  dangling reference after the R3.6 backup-io extraction. Any click on
  `#telemetry-copy` would have thrown `ReferenceError`. Caught only
  because I re-read the handler during the export-button add.
- **R7.8** fixes a real i18n issue: the explain + pillar dialogs show
  `t()`-snapshotted body text. When the user switched locale while one
  was open, the text stayed stale. onLangChange now closes both so
  the user re-opens and sees the correct locale.
- **R7.9** fixes a real toast signature bug: callers pass `'error'` /
  `'warn'` / `'ok'` as the second arg, but the function signature was
  `toast(text, ms=2600)`. `setTimeout('error')` silently NaN-coerces
  in most browsers. New signature takes either; variant drives
  `data-variant` + CSS stripe. ~10 callsites now have visible
  distinction between info / warn / error toasts.

## D6 — State & Data Integrity

- No new IDB stores. Telemetry export produces a transient Blob — no
  persistence side-effect.
- `scanneat.telemetry.*` keys unchanged.

## D7 — Error Handling

- Telemetry clear now gated by `window.confirm()` — the third
  Tier-2-destructive gate (alongside clear-today + clear-fast-history).
- Share callsites: 7 unified on `shareOrCopy` (pairings / daily /
  weekly / monthly / grocery / scan / telemetry).
- csv-import edge tests cover CRLF, BOM, quoted-with-comma — all real-
  world Windows / MFP exports.

## D8 — Async & Concurrency

- Fasting tick now pauses on tab-hidden via `visibilitychange`.
- No new timer shapes. `dateFormatter` cache + telemetry Blob export
  are synchronous.

## Round-7 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | date-format.js migrated only 1 callsite | Sweep other toLocaleDateString() uses opportunistically |
| Low | Toast variants now stylable but no caller uses `'ok'` yet | Decide on a UX rule (e.g. shareOrCopy copied → 'ok') |
| Low | Quick Add save + autocomplete still ~300 lines inline | Next extraction target (audit carryover) |
| Low | `monthlyOnGoal` label is descriptive but unbounded — could include the target kcal inline | Defer, cosmetic |

No critical / major findings. Round 7 closes two real silent bugs
(telemetry-copy `ReferenceError`, toast variant coercion) and adds two
pure-helper modules (date-format, expanded telemetry tests).
