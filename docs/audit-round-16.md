# Audit — Round 16

Same D1–D8 rubric. Round 16 hunts and kills two more silent French
leaks in the weight-summary chip and normalises the toast-variant
contract across every remaining bare `toast(t(...))` callsite.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +4 (`weightDelta30d`, `weightTrendLine` × EN+FR).
- **Plural contract**: unchanged at 11 plural-aware keys.

## D2 — Health & Hygiene

- **`public/features/weight.js`**: −2 lines, +4 lines (two hard-coded
  string literals replaced with `t()` calls).
- **`public/features/activity.js`**, **`templates-dialog.js`**,
  **`public/app.js`**: +6 lines net (variant annotations + comments).
- **Click listeners in app.js**: 61 → 61.

## D3 — Optimization

- `public/` total 879 KB → **880 KB** (+1 KB).
- No new allocations, no new render paths.

## D4 — Structure

- All `toast(t(...))` callsites now express semantic intent via the
  variant arg (`'ok'` | `'warn'` | `'error'`). Bare calls (no second
  arg) remain only for the keybindings help toast which uses the
  legacy ms-number signature.

## D5 — Logic & Correctness

- **R16.1 (real i18n bug × 2)**: `weight.js` rendered the weight
  summary chip with two hard-coded French literals: `Δ 30 j :` (j =
  jours) and `kg/sem` (sem = semaine). EN users saw French
  abbreviations on every dashboard render that included a weight
  log entry. Fixed via `t('weightDelta30d')` / `t('weightTrendLine')`
  with proper EN copy ("Δ 30 d:" + "kg/wk").
- **R16.2 (UX consistency)**: activity success toast now `'ok'`
  variant — green stripe, matching every other "thing succeeded"
  feedback (R8.3 normalisation extended to the activity feature).
- **R16.3 (UX consistency)**: templates' "nothing logged today"
  bounce-toast now `'warn'` variant — the message tells the user
  why the action couldn't proceed, not that it succeeded.
- **R16.4 (UX consistency)**: blurry-photo + duplicate-barcode
  toasts now `'warn'` variant — both communicate "the operation
  partially worked but here's what got skipped".
- **R16.5 (UX consistency)**: pairings + grocery clipboard-copy
  toasts now `'ok'` variant. Combined with the R8.2 shareOrCopy
  rollout, every copy/share success in the app now stripes green.

## D6 — State & Data Integrity

- No new IDB stores, no schema change.

## D7 — Error Handling

- The toast-variant audit means error/warn/ok toasts now stripe
  consistently across the app. Failed copies still emit `'error'`
  (already done since R8.2) — no regressions.

## D8 — Async & Concurrency

- No new timers, no new fetches.

## Cycle summary — Round 16

**Fix/improve (real, user-visible):**
1. R16.1 Weight summary `Δ 30 j` + `kg/sem` → t() — two real EN
   i18n bugs killed in one chip.
2. R16.2 Activity toast → `'ok'` variant.
3. R16.3 Templates "nothing logged" → `'warn'` variant.
4. R16.4 Blurry / duplicate-barcode toasts → `'warn'` variant.
5. R16.5 Pairings + grocery copy success → `'ok'` variant.

**New features/elements (real):**
6. R16.6 Two new i18n entries per locale (`weightDelta30d`,
   `weightTrendLine`) with proper EN units (`Δ 30 d`, `kg/wk`).
7. R16.7 App-wide toast variant audit complete — every callsite
   expresses semantic intent, stripe colour matches meaning.

## Round-16 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Custom-foods list label hard-codes `P` for protein | Universal short, defer |
| Low | Activity dialog `weightKg` deps fall through silently when profile is empty | Existing branch already handles via `activityEstimateNeedWeight` |

No critical / major findings. Round 16 closes two real EN i18n
leaks and finishes the toast-variant normalisation pass that
started in R8.

## Arc state — R1 → R16

- `public/app.js`: 4,500+ → **3,446 lines**.
- `/features/`: 0 → **25 modules**.
- Tests: initial baseline → **567 passing**.
- Real silent bugs fixed since R8: 12 (now adding R16.1 ×2 = 14
  total in the R8–R16 arc).
