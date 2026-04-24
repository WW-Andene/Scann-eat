# Audit-v3 — Closeout

**Ended:** 2026-04-24
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
| HIGH     | 14 | **13** | 1 (partial) | — |
| MEDIUM   | 54 | ~32 | ~22 | — |
| LOW      | 27 | ~20 | ~7 | — |
| **Total** | **95** | **~65** | **~30** | **0** |

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
- **F-F-03** multi-item photo confirm-before-log step (new picker dialog)
- **F-F-04** grocery per-ingredient source breakdown (data shape change)
- **F-F-05** CSV import skipped-row details (new UI + export path)
- **F-F-07** LLM recipe-ideas "Save" + "Plan" buttons
- **F-DDV-01** chart a11y overhaul (reusable module with desc + keyboard-
  focusable data points)
- **F-DST-03** reusable `.empty-state` component + migration
- **F-DST-05** skeleton for async LLM operations
- **F-DRC-04** landscape / low-height media queries for dialogs

### Bucket 3 — Needs product-owner decision
- **F-N-03** ES/IT/DE beta: expand coverage / prune / defer?
- **F-DRC-02** tablet layout: in scope?
- **F-CS-06** "farmer's market" metaphor granularity — what does it mean concretely?

### Bucket 4 — Large sweeps explicitly scoped down
- **F-DTA-02** 92 raw `font-size` → only base h1..h4 migrated (4 sites).
  Remaining 88 are per-component display decisions; visual regression
  surface too big for this session.
- **F-N-02** parenthetical plurals → 3 most-visible keys migrated
  (exportHistoryDone, recentSummaryFilter). Other `(s)` patterns remain.
- **F-DT-02** 11 line-heights, **F-DT-03** 10 letter-spacings,
  **F-DM-02** animation durations, **F-DM-03** press-scales,
  **F-DM-04** rotation tilts — tokens not added; partial sweep would
  have only marginal value until all are done together.

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
                       raw font-size 88/95 · transitions 10/12
                       raw hex 25/60 · outline:none 11/12
                       backdrop-filter 6/6 · !important 13/15
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

End of audit-v3.
