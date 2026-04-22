# Audit — Round 4

Same D1–D8 rubric, after Round 4.

## D1 — Format & Conventions

- **TODO/FIXME count**: still 0 across `public/`.
- **i18n keys**: +13 (daily-share × 5, life-stage chips × 2, fasting-history
  confirm × 3 incl. plural variants, streakDays / fastingStreak plural
  variants). All added in both FR and EN.
- **Plural helper uptake**: three keys (`clearTodayConfirm`,
  `pendingScans`, new `streakDays` + `fastingStreak` +
  `fastingHistoryClearConfirm`) now declare `_one` / `_other`. Pattern
  is stable.

## D2 — Health & Hygiene

- **`public/app.js`**: 4,100 → **4,073 lines** (–27 net; fasting +
  appearance extractions remove more than the new share button / chip /
  view-toggle persistence add).
- **Feature folder**: **1,577 lines across 16 modules**
  (+fasting.js 163, +appearance.js 53). All modules ≤ 165 lines.
- **Click listeners in app.js**: 88 → **86**.
- Dead code: none.

## D3 — Optimization

- `public/` total 779 KB → **789 KB** (+10 KB) — two new feature files +
  NOVA lexicon expansion + daily-share presenter.
- No render-loop regressions.

## D4 — Structure

- Remaining inline app.js surfaces: profile dialog (~200), Quick Add
  (~400), recipes (~200), settings dialog (~100), history search (~50),
  dashboard render loops (~250). Profile dialog is the next highest-
  value extraction target.

## D5 — Logic & Correctness

- **R4.1** fixes a UX leak: `life_stage=pregnancy` could stick on a
  profile after the user flipped sex to male. The select now auto-
  clears + hides when `sex !== 'female'`.
- **R4.2** extends the R3.2 fresh-produce lexicon with ~40 more entries
  (lime, myrtille, patate douce, ail, fenouil, nuts, etc.). Each extra
  entry is a potential NOVA-4 false-positive caught.
- **R4.6** pins `dailyTargets.life_stage` echo so the R4.5 dashboard
  chip can't silently stop appearing after a future refactor.
- Remaining untested modules: the IDB data modules (same intentional
  gap).

## D6 — State & Data Integrity

- `LS_DASHBOARD_VIEW` (`'scanneat.dashboard.view'`) joins the
  `scanneat.*` prefix family, so backup + multi-profile round-trips
  pick it up automatically.
- No new IDB stores.

## D7 — Error Handling

- Tier-2 destructive gate now covers both clear-today (R3.9) and
  clear-fasting-history (R4.8), with no-op-friendly + count-aware
  confirm messages.
- daily-share Web Share fall-through → clipboard → toast mirrors the
  weekly-share shape exactly.

## D8 — Async & Concurrency

- `await` count in app.js: 142 → 134 (fasting extraction moved its
  share).
- No new timer shapes introduced in app.js.

## Round-4 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Profile dialog still large inline | Extract next round |
| Low | Quick Add photo-identify paths have three near-copies (qa-photo, qa-photo-multi, qa-photo-menu) | Dedupe via a shared `identifyFoodWith(endpoint)` helper |
| Low | Share-button triad (pairings / weekly / daily) duplicates "share or clipboard" logic | Extract a `shareOrCopy(title, text, i18n)` helper in a future restructure pass |

No critical / major findings. Round 4 closes a UX-integrity gap
(R4.1 life-stage leak), adds the daily-share surface users had asked
about implicitly (no easy way to copy today's totals before), and
preserves the dashboard-view choice across reloads.
