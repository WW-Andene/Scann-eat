# Audit — Round 5

Same D1–D8 rubric from `code-audit-SKILL.md`, after Round 5. This round
starts to stabilise the post-extraction shape of `app.js` and begins
consolidating shared helpers (shareOrCopy, identifyViaModePath).

## D1 — Format & Conventions

- **TODO/FIXME count**: still 0 across `public/`.
- **i18n keys**: +6 (daily-share × 3 for shareCopied/Failed + groceryShareFailed;
  weeklyStreakLabel; weeklyDaysLogged plural variants).
- **Plural helper adoption**: now 6 keys declare `_one` / `_other` —
  clearTodayConfirm, pendingScans, streakDays, fastingStreak,
  fastingHistoryClearConfirm, weeklyDaysLogged.

## D2 — Health & Hygiene

- **`public/app.js`**: 4,073 → **3,872 lines** (−201 net).
- **Feature folder**: 1,577 → **1,937 lines across 20 modules**
  (+recipe-ideas 150, +settings-dialog 114, +keybindings 31, +backup-io
  already existed). All new modules ≤ 150 lines.
- **Click listeners in app.js**: 86 → **82**.
- Dead code: none.

## D3 — Optimization

- `public/` total 789 KB → **797 KB** (+8 KB) — three new feature files
  net of extractions shrinking app.js.
- Intl.PluralRules cache + Intl.DateTimeFormat cache still hit once per
  locale per session.

## D4 — Structure

- Remaining `app.js` hot zones: profile dialog (~200), Quick Add save
  logic + photo-identify (~300 after R5.5 dedupe), recipes (~200),
  dashboard render loops (~250), history search (~50). Profile dialog
  is the cleanest next extraction target.
- `core/share.js` + `core/dateutil.js` now host two of the three
  shared helpers (plural helper lives inside i18n.js). Together they
  form a stable `/core` base for cross-feature use.

## D5 — Logic & Correctness

- **R5.7** fixes a real i18n-refresh bug: the life-stage chip (R4.5) +
  per-meal "% of day" label (R2.9) were rendered dynamically via `t()`
  and didn't re-localise when the user switched language in Settings
  until a full reload. onLangChange callback now nudges
  renderDashboard() exactly when language changes.
- **R5.5** dedupes three near-copies of the direct/server identify
  branch (identify / identify-multi / identify-menu). The 429 path is
  now consistent across all three — previously only identify had the
  errRateLimit translation.
- **R5.6** adds monthlyRollup as a tested presenter — building block
  for the upcoming month dashboard view.
- Untested modules: IDB data modules (intentional); profile dialog
  state machine (hard without a full DOM shim).

## D6 — State & Data Integrity

- No new IDB stores. `scanneat.dashboard.view` (R4.10) flows through
  the backup snapshot automatically.
- `life_stage` field round-trip via localStorage backup was validated
  in R4.6.

## D7 — Error Handling

- All five user-visible share buttons (pairings, daily, weekly,
  grocery, scan-result) now run through `shareOrCopy` — consistent
  AbortError-silence, consistent clipboard fallback, consistent
  copied/failed toast labels.
- Clear-destructive flow gates (clear-today, clear-fast-history) stable.

## D8 — Async & Concurrency

- `await` count in app.js: 134 → 120 (three extractions).
- No new scheduling shapes.

## Round-5 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Month view UI is still stubbed (only presenter + tests) | Wire a 'month' tab in the Day/Week toggle |
| Low | profile dialog (~200 lines) remains inline | Extract into features/profile-dialog.js next round |
| Low | 6 i18n keys now use _one/_other plural variants; ~80 others still use raw {n} | Convert high-traffic keys (dashEmpty, macroSumOk, etc.) opportunistically |
| Low | CSS file hasn't been refreshed to match new chip additions | design-aesthetic-audit-SKILL pass in R5.R |

No critical / major findings. Round 5 completes the shareOrCopy rollout
(5 callsites consolidated), finishes the identify-path dedupe, and
adds the monthlyRollup building block.
