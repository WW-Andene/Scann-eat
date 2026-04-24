# Audit — Round 2

Same rubric as `audit-round-1.md` (D1–D8 per code-audit-SKILL.md), run
after the Round 2 10-improvement batch.

## D1 — Format & Conventions

- **TODO/FIXME count**: still 0 across `public/`. Clean.
- **i18n keys**: +11 new (life-stage, pairings-share, rate-limit, meal-
  of-day). All present in both `fr` and `en` blocks.
- **Commit messages**: Round 2 lands as one commit with a numbered body
  matching the Round 1 pattern.

## D2 — Health & Hygiene

- **`public/app.js`**: 4,382 → **4,259 lines** (–123 from R1.6 scanner
  extraction, plus voice + reminder extractions offset by R2.7/R2.9
  additions). Net extraction direction: healthy.
- **Feature folder**: 924 → **1,180 lines** across 11 modules (adds
  `reminders.js`, `scanner.js`, `voice-dictate.js`). Each new module is
  < 120 lines and follows the `initX(deps) + renderX()` DI contract.
- **Click listeners in app.js**: 93 → **92**. Mild reduction; further
  extractions (recipes dialog, Quick Add, profile dialog) would move
  more.
- Dead code: none introduced.

## D3 — Optimization

- `public/` total 757 KB → **771 KB** (+14 KB). Drivers: 67 new SYNONYMS
  entries in pairings.js (≈4 KB), three new feature files (≈10 KB), all
  remaining micro-additions. Still well under PWA-shell targets.
- No render-loop hot paths regressed.

## D4 — Structure

- Feature-folder pattern is now paying clear dividends: **voice-dictate
  + scanner + reminders** were self-contained and took one extract each
  without touching shared state.
- Remaining app.js inline surfaces: recipes dialog (~200), Quick Add
  flow (~400 after inspection — larger than R1 estimate because of the
  autocomplete + photo-identify flows), profile dialog (~200), onboarding
  (~80). Quick Add extraction is the next high-value target, but the
  DOM coupling is notable; we'd need to split it across 2–3 PRs.

## D5 — Logic & Correctness

- **R2.4** closes the telemetry gap identified in R1: opt-in gate, FIFO
  cap, and formatEvents are now covered.
- **R2.10 fixes a real TZ bug**: `todayISO()` used `toISOString()`
  (UTC), so users in UTC+3 or greater saw late-evening meals bucketed on
  the next calendar day. Four call sites fixed; `consumption.todayISO`,
  `activity.todayISO`, `weight-log.todayISO`, `meal-plan.isoToday`.
- **R2.5 life-stage** closes a silent underestimation gap in
  `dailyTargets`: pregnancy / lactation recommendations now match EFSA
  DRVs (protein, iron, calcium, B12, kcal).
- Untested pure modules remaining: the IDB data modules (intentional, need
  an IDB shim or fake-indexeddb).

## D6 — State & Data Integrity

- No new IDB stores; DB_VERSION=6 holds.
- `life_stage` is an additive optional field on the profile; absent
  values yield the previous baseline targets — backwards-compat clean.
- localStorage `scanneat.*` prefix preserved; no new keys.

## D7 — Error Handling

- **R2.2** closes the Groq 429 gap identified in `ASSUMPTIONS.md`.
  ocr-parser tags the thrown Error with `.status`; server surfaces it as
  HTTP 429 + `{ error: 'rate_limit' }`; client translates to the new
  `errRateLimit` i18n key with recovery guidance.
- Try/catch count in `app.js`: 63 → **81**. Increase is mostly local
  try/catch inside the new direct-mode 429 handler; still acceptable
  coverage.

## D8 — Async & Concurrency

- 149 `await` usages → 148 (scheduler extraction removed one await).
- No `.then()` chains. No new setTimeout-as-scheduler shapes outside
  the already-extracted reminder loop (which self-re-schedules
  intentionally after fire).

## Round-2 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Quick Add is the remaining large surface inside app.js | Split into feature + autocomplete + photo-identify sub-modules across 2–3 PRs |
| Low | 67 new SYNONYMS entries are unsorted & ungrouped | Defer — they group by comment anyway |
| Low | `isoToday()` now mirrors `todayISO()` exactly | Consolidate after meal-plan stabilises on the new shape |

No critical / major findings. Round 2 preserves integrity and actively
closes three of the four R1 audit items (telemetry tested, 429 path,
life-stage) plus one previously-silent TZ bug.
