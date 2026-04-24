# Audit — Round 13

Same D1–D8 rubric. Round 13 takes the user's "real and meaningful only"
direction: dropped a planned `s` keyboard shortcut mid-round, refocused
on user-visible bugs and chip-level UX. The two real wins are a
silent-French-text fix in the portion logger and a "history at a
glance" summary chip on the recent-scans panel.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +8 (`portionPack`, `portionHalfPack`,
  `recentSummaryTotal_one`, `recentSummaryTotal_other` × EN+FR).
- **Plural contract**: 10 → **11 plural-aware keys**
  (`recentSummaryTotal` added; both `_one` and `_other` defined in
  EN + FR — passes the contract test).

## D2 — Health & Hygiene

- **`public/app.js`**: 3,393 → **3,419 lines** (+26 — half-pack chip
  setup + summary chip render).
- **`/core/presenters.js`**: 1,071 → **1,113 lines** (+42 —
  `filterScanHistory` + `summarizeScanHistory`).
- **`public/index.html`**: +2 lines (new `#portion-preset-half-pack`
  chip, new `#recent-summary` paragraph).
- **`public/styles.css`**: +9 lines (new `.recent-summary` rule).
- **Click listeners in app.js**: 61 → 61 (half-pack chip rides the
  existing `.chip-btn[data-portion]` delegated listener).

## D3 — Optimization

- `public/` total 869 KB → **875 KB** (+6 KB).
- Summary chip uses the unfiltered `all` array so it stays stable
  while the user filters the visible list. Pre-existing `listScans()`
  call already returned `all`; no extra IDB read.

## D4 — Structure

- `/core/presenters.js` now hosts seven pure helpers around the
  scan-history surface (5 share-formatters + filter + summary).
- HTML gained two genuinely-used new elements
  (`#portion-preset-half-pack`, `#recent-summary`) — no dead markup.

## D5 — Logic & Correctness

- **R13.1 (real i18n bug)**: `setupPortionPanel` was setting the
  package-weight chip text to `${weight} g (paquet)` — a hard-coded
  French word. EN users were seeing French in an otherwise-translated
  UI. Now resolved through `t('portionPack', { g })`. Same fix on
  the index.html initial placeholder.
- **R13.2 (real a11y win)**: scan-history "×" delete buttons now
  carry an `aria-label` that includes the scan name (falls back to
  the generic label when name is missing). Screen-reader users
  can disambiguate the row's delete from the dozen other "×"
  buttons in the list.
- **R13.3 (refactor)**: extracted the inline filter loop in
  `renderRecentScans` to `filterScanHistory(items, { query,
  gradeFilter })`. Pure, six tests pin behavior including
  case-insensitive substring, exact-grade match, combined
  filters, missing-name handling, and non-array safety.
- **R13.4 (consistency)**: `recentListEl.innerHTML = ''` →
  `.textContent = ''`. Same one-line safety upgrade as R11.3 / R11.4
  applied to the third inline `innerHTML` clear in the file.
- **R13.5 (test contract)**: nine new presenter tests
  (`filterScanHistory` × 6, `summarizeScanHistory` × 3) pin both
  helpers' edge behaviors so future changes to the recent-scans
  panel can't quietly regress them.

## D6 — State & Data Integrity

- No new IDB stores, no schema change.
- Summary chip is a pure read view — no persistence side effects.

## D7 — Error Handling

- `summarizeScanHistory` and `filterScanHistory` both safe-default
  on `null` / `undefined` / non-array input (covered by tests).
- Half-pack chip auto-hides when package weight < 40 g (so we
  don't show "8 g (½ pack)" for a single chocolate square).

## D8 — Async & Concurrency

- No new timers, no new fetches.
- Both new presenters are O(n) over the input list. The summary
  chip iterates `all` once via the existing `listScans()` cached
  read.

## Cycle summary — Round 13 cadence (5 fix + 5 new)

**Fix/improve (real, user-visible):**
1. R13.1 Hard-coded French `(paquet)` → `t('portionPack')` — EN bug.
2. R13.2 Scan-history delete `aria-label` includes scan name — a11y.
3. R13.3 Filter loop → pure `filterScanHistory` presenter.
4. R13.4 `recentListEl.innerHTML = ''` → `textContent = ''`.
5. R13.5 Nine new presenter tests pin contract.

**New features/elements (real, user-visible):**
6. R13.6 `summarizeScanHistory(items)` — pure grade-distribution
   helper aligned to the actual `A+ / A / B / C / D / F` grades the
   `<select id="history-grade">` exposes.
7. R13.7 Recent-scans summary chip ("12 scans · 4A · 3B · 2C · 2D
   · 1F") under the header. Stable while the user filters.
8. R13.8 Half-pack portion chip — appears alongside the full-pack
   chip when the scanned product has a package weight ≥ 40 g.
   Single-tap to log half a package.
9. R13.9 Eight new i18n entries (4 per locale) + plural contract
   bumped to 11 keys.
10. R13.10 New `.recent-summary` CSS rule with tabular-nums for
    aligned digits, sized at the muted text scale.

## What was dropped mid-round

- A planned `s` (share current scan) keyboard shortcut — keyboard
  shortcuts add no value on a phone-first PWA. Reverted before
  commit so they never shipped.

## Round-13 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Half-pack chip uses `Math.round(weight / 2)` — odd-gram packages lose 0.5 g | Acceptable; portion entry takes integer g |
| Low | Summary chip aggregates `A+` and `A` separately even though the underlying engine emits both — UI shows them split | Intentional — surface the engine's distinction |
| Low | Recipes / templates duplicate UX still inconsistent (recipe auto-saves, template prompts) | Defer; both ship and work |

No critical / major findings. Round 13 ships two real user-visible
improvements (FR/EN i18n bug, scan-history summary chip), one new
mobile-relevant chip (half-pack), and one accessibility win
(disambiguated delete labels) — without adding any keyboard
shortcuts.
