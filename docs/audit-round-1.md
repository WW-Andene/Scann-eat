# Audit — Round 1

Abbreviated pass per `code-audit-SKILL.md` dimensions D1–D8, run after
the 10-improvement batch. Focused on actual findings in the current
codebase rather than rehearsing the whole 2,261-line framework.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0 across `public/`. Clean.
- **i18n key sprawl**: 900+ string keys in one flat map. Functional but
  harder to audit than a namespaced structure. Not a priority —
  toolchain friction is nil.
- **Commit-message discipline**: every commit on this branch has a
  multi-paragraph body explaining "why". Good.

## D2 — Health & Hygiene

- **`public/app.js` still 4,382 lines** after 8 feature extractions.
  Remaining inline: recipes dialog (~200 lines), camera scanner (~70),
  Quick Add flow (~150), profile dialog (~200), reminder scheduler
  (~100). Extraction is ongoing; no urgent fix.
- **93 click listeners in `app.js`**. Not a bug per se, but a signal
  that interaction wiring sprawls. Feature-folder migration is the
  correction.
- Dead code: none found.

## D3 — Optimization

- `public/engine.bundle.js` 91 KB. Within target.
- `public/` total 757 KB. Fine for a PWA shell.
- No obvious render-loop hot-paths.

## D4 — Structure

- `features/` now 924 lines across 8 modules. Shape is healthy; the
  weight extraction just-landed confirms the pattern is maintainable.
- `data/` and `core/` folder boundaries are clean.
- **app.js remains the orchestration monolith**. Continued extraction
  is the right move; no architectural rethink needed.

## D5 — Logic & Correctness

- Untested pure modules (after filename-convention check):
  - `public/core/i18n.js` — `t()` fallback chain has no tests.
  - `public/core/telemetry.js` — opt-in + cap behaviour untested.
  - `public/core/explanations.js` — 40+ regex rules untested.
  - All IDB data modules (intentional — IDB tests need a shim).
- **Recommendation**: add `i18n-tests.ts` for the fallback chain at
  minimum. Explanations has real regex rules that could regress
  silently.

## D6 — State & Data Integrity

- 7 IDB stores coordinated across 7 data modules via a defensive
  `ensureStores` convention. DB_VERSION=6. No drift today.
- localStorage keys follow `scanneat.*` prefix uniformly. Backup +
  multi-profile both rely on this; enforced by visual inspection, not
  by a linter.

## D7 — Error Handling

- 63 try/catch blocks in `app.js`. Good coverage of IDB + fetch paths.
- Every API endpoint returns structured JSON errors, not HTML.
- Known gap: Groq 429 doesn't have a first-class path — logged in
  `ASSUMPTIONS.md`.

## D8 — Async & Concurrency

- 149 `await` usages. No `.then()` chains.
- `parseVoiceQuickAdd` infinite-regex-loop was fixed in B6.1; the
  pattern that caused it (`while regex.exec without g flag`) is now
  documented in the source comment as a trap.
- No other similar shapes found.

## Action items emerging from the audit

| Severity | Item | Fix |
|----------|------|-----|
| Low | i18n `t()` has no fallback-chain test | Add `i18n-tests.ts` |
| Low | explanations.js regex rules untested | Add `explanations-tests.ts` |
| Low-medium | app.js still 4.4k lines | Restructure pass (next section) |

No critical / major findings. The 10 improvements preserved integrity.
