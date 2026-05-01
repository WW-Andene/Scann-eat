# Audit — §DM Motion

**Block:** A Foundation
**Dimension:** §DM (Motion Vocabulary, Character Alignment, Performance, Micro-Interactions, Signature)
**Date:** 2026-04-24

---

## F-DM-01 · [HIGH] [CONFIRMED] · Motion tokens exist but are only partially adopted

**Location:** `public/styles.css` — token definitions in `:root` blocks; usage across 24 transition rules.

**Evidence (token coverage grep):**
| Token | Value | Refs |
|---|---|---|
| `--motion-fast` | 100ms | 2 |
| `--motion-base` | 140ms | 14 |
| `--motion-enter` | 200ms | 11 |
| `--motion-exit` | 150ms | **0** |
| `--motion-nav` | 250ms | **0** |
| `--motion-loop` | 1000ms | 3 |
| `--speed-ui` (legacy alias of `--motion-base`) | 140ms | 4 |
| `--ease-ui` | cubic-bezier(0.2,0.8,0.2,1) | 34 |

Plus **28 transition rules with literal ms values** (cross-ref F-DTA-03) — 180, 200, 160, 140, 120 ms mostly.

**Impact:**
- Character-brief promise "one speed, one easing" is false: actual shipped speeds vary from 100 ms to 250 ms, and that's just the tokenized set. The 28 literals add a dozen more off-grid values.
- `--motion-exit` and `--motion-nav` are dead: exits fall through to whatever `transition: all 180ms ease` says; dialog open/close uses hand-rolled durations.
- Changing "app motion speed" requires editing every file — the token system doesn't actually govern speed.

**Recommendation:**
Single sweep commit, deterministic rules:
| Literal | Replace with |
|---|---|
| `100ms` | `var(--motion-fast)` |
| `120ms`, `140ms` | `var(--motion-base)` |
| `160ms`, `180ms`, `200ms` | `var(--motion-enter)` |
| `250ms` | `var(--motion-nav)` |
| `ease`, `ease-out`, `ease-in-out` | `var(--ease-ui)` |

Retire `--speed-ui` legacy alias (one line removed) after its 4 usages migrate to `--motion-base`.

**Effort:** Medium (systematic grep + edit).
**Risk:** Low — max 10 ms drift per transition, imperceptible.
**Preserves features:** Yes.

---

## F-DM-02 · [MEDIUM] [CONFIRMED] · Animation durations entirely untokenized

**Location:** 12 `animation-duration` values across 10 keyframes, distribution:

| Duration | Count | Used by |
|---|---|---|
| `2s` | 4 | `scanneat-scanning-sweep`, `pulse` loops |
| `900ms` | 2 | `scanneat-grade-land`, other reveal |
| `1400ms` | 2 | `scanneat-milestone-pulse` |
| `2200ms` | 1 | `scanneat-scan-ready` |
| `9s` | 1 | extended `skeleton-shimmer` |

**Evidence:**
`--motion-loop` (1000ms) is the only "long" motion token; animations don't reference it. Every animation invents its own literal.

**Impact:**
- No way to "slow all loops by 20%" for prefers-reduced-motion users who want reduced speed rather than zero motion (a WCAG-compliant mid-point).
- `2s`, `2200ms`, `9s` are wildly different orders of magnitude — no documented rationale for which loop uses which.

**Recommendation:**
Add two loop tokens + migrate:
```css
--motion-loop-short: 1000ms;   /* rename existing --motion-loop for clarity */
--motion-loop-long:  2000ms;   /* scan sweeps, milestone pulses */
--motion-loop-xlong: 8000ms;   /* ambient shimmer (skeleton) */
```
Pin every `animation-duration` to one of the three. The `9s` skeleton becomes `var(--motion-loop-xlong)`, `2s` / `2200ms` → `--motion-loop-long`, `900ms` / `1400ms` → `--motion-loop-short` (or stay hand-crafted if a signature moment).

**Effort:** Small–Medium.
**Risk:** Low — loop timing is forgiving.
**Preserves features:** Yes.

---

## F-DM-03 · [MEDIUM] [CONFIRMED] · Press-feedback scales fragment across 5 values

**Location:** 5 distinct `transform: scale(…)` values: `0.6`, `0.94`, `0.96`, `0.97`, `0.98`.

**Evidence:**
Art-direction-brief §ACTIVE says *"Press physics: instant (0-50ms) transform+scale with shrinking shadow"*. No `--scale-press` token exists. Every interactive element invents its own shrink amount.

- `0.96` is the canonical "physical press" per design-system.md.
- `0.94`, `0.97`, `0.98` are drift.
- `0.6` (at some camera-viewfinder element?) is an extreme outlier — likely a one-off reveal effect, not a press.

**Impact:**
- Inconsistent tactile feel across buttons, chips, cards.
- Contributors picking a press-scale have no default.

**Recommendation:**
```css
--scale-press:     0.96;   /* standard button/chip press */
--scale-press-sm:  0.94;   /* high-touch tiny elements */
```
Migrate 15 sites (sweep). The `0.6` outlier gets audited separately — likely stays literal if it's a signature reveal.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DM-04 · [MEDIUM] [CONFIRMED] · Decorative rotations (-12° to +12°) uncatalogued

**Location:** 8+ `transform: rotate(…)` values: `-12°, -4°, -3°, -1.5°, -0.6°, +1.2°, +3°, +12°` (plus the functional `rotate(360deg)` for `spin`).

**Evidence:**
Likely the "polaroid tilt" decorative treatment on recent-scans tiles (ADR direction: paper metaphor). Each rotation is hand-tuned.

**Impact:**
- Collectively forms a signature detail ("handmade scrapbook feel") — a **strength** if consistent, a **drift** if contributors add arbitrary rotations.
- No design-system entry describes when to rotate a tile and how much.

**Recommendation:**
Add to character brief and define the palette:
```css
--tilt-subtle:   0.6deg;    /* ambient variation */
--tilt-medium:   1.5deg;    /* default scrapbook tile */
--tilt-strong:   3deg;      /* featured moment */
--tilt-extreme:  12deg;     /* signature — use sparingly */
```
Randomisation (mix of positive/negative) stays per-component with nth-child rules — the tokens pin the *magnitudes*, not the per-tile angle.

**Effort:** Small.
**Risk:** None — pure additive refinement.
**Preserves features:** Yes (protects the signature).

---

## F-DM-05 · [LOW] [CONFIRMED] · 20 prefers-reduced-motion blocks — coverage looks solid; verify

**Location:** `public/styles.css` — 20 `@media (prefers-reduced-motion: reduce)` blocks.

**Evidence:**
Inventory 02 noted 20 blocks. Every @keyframes has at least one reduce-motion partner killing the animation. 7 `transition: none` declarations inside these blocks.

**Impact:**
- WCAG 2.3.3 (animation-from-interactions) compliance appears in place.
- Some reduce-motion blocks set `animation: none` but not `transition: none` for the same selector — silent omissions may leak motion.

**Recommendation:**
Spot-audit: for each of the 10 keyframes, verify its hosting selector also has `transition: none` or equivalent inside the reduce-motion block. If any gap, add to the existing block (not new ones — keep the 20 consolidated where possible).

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes (tightens compliance).

---

## F-DM-06 · [LOW] [CONFIRMED] · No "signature motion" documented

**Location:** Missing — docs/design-system.md §Motion section is short.

**Evidence:**
Per art-direction-engine-SKILL §SIGNATURE: *"Identify the highest-frequency meaningful interaction; design a distinctive animation; protect it across updates."*

Candidates in Scan'eat:
- **Grade reveal** — `scanneat-grade-land` keyframe (900ms): a mid-drop bounce animation is the "moment of truth" after scanning.
- **Scan sweep** — `scanneat-scanning-sweep` (2s): the coral-sweep overlay during camera scanning.

Neither is called out in docs as the app's signature motion. Both are good candidates.

**Impact:**
- No contributor knows which motion to protect across refactors; either could be silently simplified.
- A distinctive motion is a recognition asset (per §SIGNATURE three-layer identity recognition).

**Recommendation:**
Add `design-system.md §Motion Signature` section — pick one (recommend grade-reveal: it's the app's decision moment), document it, mark it protected.

**Effort:** Trivial (documentation).
**Risk:** None.
**Preserves features:** Yes (protects a feature).

---

## Dimension scorecard — §DM
| Metric | Value |
|---|---|
| Findings | 6 (HIGH×1, MEDIUM×3, LOW×2) |
| CRITICAL | 0 |
| Quickest win | F-DM-06 (document the signature motion) |
| Highest impact | F-DM-01 (motion-token adoption — unlocks "change one value, change the whole app") |
| Cross-reference | F-DM-01 folds in F-DTA-03 (28 hardcoded transition ms) |
