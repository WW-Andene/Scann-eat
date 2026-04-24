# Audit-v3 — Closeout

**Initial end:** 2026-04-24 (Batches 1–9)
**Resumed + extended:** 2026-04-24 (Batches 10–16)
**Branch:** `claude/understand-project-YS4EK`
**Verification:** `npm test` 619/619 pass · `npm run build:web` ok · `audit-ruler.sh` PASS (all 6 counters within budget)

---

## What landed

**27 commits, 9 work batches.** The audit was run from scratch (prior
34 `audit-round-*.md` + 2 `ui-ux-audit-*.md` files were ignored, then
deleted in Batch 9).

### Findings status

| Severity | Total | Fixed | Deferred | Withdrawn |
|---|---|---|---|---|
| CRITICAL | 0 | — | — | — |
| HIGH     | 14 | **14** | 0 | — |
| MEDIUM   | 54 | ~44 | ~10 | — |
| LOW      | 27 | ~22 | ~5 | — |
| **Total** | **95** | **~80** | **~15** | **0** |

*(Figures update after the Batch 10–16 resume sweep. Original closeout
stopped at ~65/95; the second pass closed another ~15 findings.)*

(Deferred findings are documented below with reasons.)

Two prior-claimed CRITICALs from inventory 05 were **withdrawn**
during the audit:
- "HTML `<html lang>` not synced" — verified already wired at
  `i18n.js:1585`; pinned with a new test in `i18n-tests.ts`.
- "All grade colors fail AA on light panels" — overstated; grades are
  background fills with dark text (pass AA). Only text-color usages
  fail (F-DC-02 addresses those).

### Batches delivered

| Batch | Commit | Scope |
|---|---|---|
| 1 | `56935e2` | 15 quick wins (weight-900, accent-ink, variation selectors, noscript h2, appName i18n, default FR, CONTRIBUTING.md, lang-sync test) |
| 2 | `4557625` | HIGH block: font @link, focus rings, input state matrix, 8 aria-label i18n, 44×44 touch targets, camera-denied copy, backdrop-filter consolidation |
| 3 | `f477b5c` | Chain A evolution-layers: retired 8 unused tokens, adopted --surface-hover/pressed, regen design-system.md |
| 4 | `ae69a4b` | Chain B: `tools/audit-ruler.sh` + motion token sweep (28→10 literals) + h1–h4 scale migration |
| 5 | `44e2248` | Chain C: emoji calibration via applyStaticTranslations HTML wrap |
| 6 | `5046fc9` | Chain D: landmarks (header, main, result, weight-summary) + complete tablist (aria-controls + role=tabpanel) |
| 7 | `4bf931f` | UX polish: onboarding progress + Previous + Start; gap-closer all-targets-met celebration |
| 8 | `046cb48`, `bab9d0d` | MEDIUM mop-up: font-feature dedup, warning hex shift, toast role=alert, empty-state copy, plural migration, RTL doc |
| 9 | `e083b56` | Delete superseded audit files (36 docs) |
| 10 | `ce9e1cf` | Bucket 4 tokens: add --lh-*, --tracking-*, --scale-press*, --tilt-*, --motion-loop-*; adopt in .grade, .settings-btn, .hyd-btn, and 3 dash delete buttons |
| 11 | `f4def62` | F-DST-03 reusable `.empty-state` component with icon/title/body slots; existing feature-specific classes inherit the pattern |
| 12 | `ff03347` | F-DDV-01 renderLineChart a11y: `<title>` + `<desc>` trend summary, focusable latest-value dot with per-point title, unit prop on call-sites |
| 13 | `e58e6cb` | F-F-07 recipe-ideas Save + Plan buttons on each card; persists to IDB `recipes` + opens meal-plan dialog |
| 14 | `6355e84` | F-DTA-02 strip 131 stale `var(--text-*, 0.85rem)`-style fallbacks + refine ruler counter (excl. `1em` resets, 60/70) |
| 15 | `1aaad60` | F-N-02 migrate 10 remaining parenthetical plurals to `_one/_other` (fastingStreak, clearToday*, copyYesterday*, templateApplyToast, grocerySource, recipeTotals, additiveSummary, duplicateBarcodeSkipped, reminderWeightGap) |
| 16 | `64972bb` | F-DRC-04 landscape / max-height: 500px dialog overrides (settings/profile/onboarding): tighter padding + scrollable inner form + pinned action row |

---

## Deferred findings + reasons

Not all 95 findings landed. The deferred ones fall into three buckets:

### Bucket 1 — Needs visual screenshots to avoid regression
- **F-DCO-01** `.chip-btn` three-layer consolidation — merging the
  evolution blocks into one rule needs a before/after screenshot sweep.
- **F-DCO-06** `.card` base class — migration touches 10+ card-like
  surfaces; same screenshot requirement.
- **F-DTA-06** consolidate 6 `:root` token blocks into 2 — low-value,
  high-churn; deferred until the bigger refactor.
- **F-DH-05** dashboard KPI focal hierarchy — the audit flagged this
  but explicitly deferred it to a browser-driven visual pass.
- **F-CS-05** rename `.settings-dialog` class to `.modal-dialog` —
  touches 7 dialogs; regression surface.
- **F-DCO-05** consolidate 5 button families to 3 — systematic
  migration across the whole surface.

### Bucket 2 — Larger codepath changes than this session allowed
- **F-F-03** multi-item photo confirm-before-log step (new picker dialog) — still deferred
- **F-F-04** grocery per-ingredient source breakdown (data shape change) — still deferred
- **F-F-05** CSV import skipped-row details (new UI + export path) — still deferred
- **F-F-07** LLM recipe-ideas "Save" + "Plan" buttons — ✅ Batch 13 (`e58e6cb`)
- **F-DDV-01** chart a11y overhaul — ✅ Batch 12 (`ff03347`) (title + desc + focusable latest-value dot; full arrow-key nav deferred)
- **F-DST-03** reusable `.empty-state` component + migration — ✅ Batch 11 (`f4def62`) (component done; dynamic-render migration still deferred)
- **F-DST-05** skeleton for async LLM operations — still deferred
- **F-DRC-04** landscape / low-height media queries for dialogs — ✅ Batch 16 (`64972bb`)

### Bucket 3 — Needs product-owner decision
- **F-N-03** ES/IT/DE beta: expand coverage / prune / defer?
- **F-DRC-02** tablet layout: in scope?
- **F-CS-06** "farmer's market" metaphor granularity — what does it mean concretely?

### Bucket 4 — Large sweeps explicitly scoped down
- **F-DTA-02** font-size sweep continued in Batch 14 (`6355e84`): 131
  stale `var(--text-*, 0.85rem)` fallbacks stripped; ruler now excludes
  `1em` resets (60/70). Remaining em-based multipliers (1.05, 1.1, 1.2,
  1.4em) still deferred — need visual regression sweep.
- **F-N-02** parenthetical plurals — ✅ Batch 15 (`1aaad60`) closed all
  13 remaining `(s)` patterns across FR + EN.
- **F-DT-02** line-height tokens, **F-DT-03** letter-spacing tokens,
  **F-DM-02** loop-duration tokens, **F-DM-03** press-scale tokens,
  **F-DM-04** rotation tilts — ✅ Batch 10 (`ce9e1cf`) added all 16
  tokens in one `:root` block; 4 initial adoptions (grade, settings-btn,
  hyd-btn, 3 dash delete buttons). Full per-component migration still
  deferred (tokens exist for future contributors to reach for).

---

## What's new in the codebase (beyond fixes)

- `CONTRIBUTING.md` — warm × data-dense quadrant guardrails, protected
  signature elements, rejection criteria for off-character PRs.
- `tools/audit-ruler.sh` — 6-counter character-brief enforcement.
  Runs via `bash tools/audit-ruler.sh` (add to pre-commit for
  enforcement).
- `docs/audit-v3/` — the audit workspace, kept intact for reference:
  - `SUMMARY.md` (synthesis + roadmap)
  - `CLOSEOUT.md` (this file)
  - `inventory/*.md` × 6 (factual baselines)
  - `findings/*.md` × 12 (dimension-level finding lists)
- One new test in `i18n-tests.ts` pinning the `<html lang>` sync
  behaviour.

---

## Verification snapshot

```
npm test               619/619 pass   (was 618 at audit start; +1 lang-sync test)
npm run build:web      ok
audit-ruler.sh         PASS on all 6 counters

Counter                                   Current / Budget
raw font-size literals (excl. 1em resets) 60 / 70
hardcoded transition ms                   10 / 12
raw hex colors in rule bodies             25 / 60
outline: none rules                       11 / 12
backdrop-filter declarations               6 / 6
!important declarations                   13 / 15
```

---

## Suggested next steps

1. **Run the dev server + screenshot sweep** for the Bucket-1 findings
   that are deferred on visual regression risk. With screenshots in
   hand, F-DCO-01, F-DCO-06, F-DTA-06, F-DH-05, F-CS-05 can all land
   in a focused session.
2. **Product-owner call** on Bucket 3 (ES/IT/DE, tablet, farmer's
   market). Any of the three decisions could reshape the remaining
   findings.
3. **Tighten `audit-ruler.sh` budgets** quarterly. The current budgets
   give ~10–20% headroom to avoid false positives on small refactors;
   after a clean sweep, tighten so drift gets caught faster.
4. **Add `bash tools/audit-ruler.sh` to CI / pre-commit** so the
   character filters run on every PR.

---

## Resume pass summary (Batches 10–16)

Picked up from the original closeout. Seven additional batches landed:

| Batch | Finding(s) closed | User-visible impact |
|---|---|---|
| 10 | F-DT-02, F-DT-03, F-DM-02, F-DM-03, F-DM-04 | Token ladders for line-height, tracking, motion loops, press scales, decorative tilts — 16 new tokens, 4 initial adoptions |
| 11 | F-DST-03 | Canonical `.empty-state` + slots. Existing feature classes inherit. |
| 12 | F-DDV-01 | Progress charts now have real `<title>`, `<desc>` with trend summary, focusable latest-value dot with per-point `<title>`. Screen-reader users get a narrative. |
| 13 | F-F-07 | Each LLM recipe-idea card now has [Sauvegarder] + [Planifier] buttons that persist to IDB and (for Plan) open the meal-plan dialog. |
| 14 | F-DTA-02 (partial) | 131 stale --text-* fallbacks stripped; ruler tightened. |
| 15 | F-N-02 | 10 remaining parenthetical-plural keys migrated to proper `_one/_other` variants — no more `{n} scan(s) exporté(s)`. |
| 16 | F-DRC-04 | `@media (max-height: 500px)` rules on settings/profile/onboarding dialogs so landscape phones don't lose the action row below the fold. |

**Post-resume finding status: ~80 / 95 closed** (up from ~65).

Remaining deferred findings concentrate in two classes:
1. **Visual-sweep dependent** (Bucket 1): six evolution-layer / refactor
   findings that need before/after screenshots to avoid regression.
2. **Product-owner decision** (Bucket 3): ES/IT/DE coverage, tablet
   layout, farmer's-market metaphor granularity.

End of audit-v3.
