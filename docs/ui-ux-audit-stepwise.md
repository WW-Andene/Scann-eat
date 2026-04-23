# UI/UX systematic audit — section-by-section pass

Going through every applicable section of:
- `design-aesthetic-audit-SKILL.md`
- `art-direction-engine-SKILL.md`
- `app-audit-SKILL.md` (P6 Visual + P7 UX + P8 A11y)

Each section: **finding → severity → fix (or note why deferred)**.
Stepwise so the doc grows per commit, not per megablob.

---

## Step 1 — I. AESTHETIC STYLE CLASSIFICATION

### §DS1. Design Language Identification

Applying the skill's taxonomy to the live state:

```
Primary style: Warm editorial
Secondary influences:
  (1) Data-dense (dashboards, macro rows, gap-closer chips)
  (2) Material/elevation (post-v2 refinement — card shadows)
Coherence score: MIXED-INTENTIONAL
Style-appropriate execution:
  - Editorial signature: generous spacing, type-forward headings,
    content-first dashboard, muted secondary text — present and
    consistent.
  - Data-dense signature: tabular numerics (v2), progress-bar
    rhythm, conditional-micro rendering — consistent.
  - Material signature: single elevation step + consistent shadow
    angle — consistent after v2.
```

**Assessment:** three styles co-exist by intent (a food-quality app
needs editorial warmth + data density + Z-axis legibility). The
risk is drift between them. v2 elevated the Material layer to
current spec but the editorial layer has accretion debt (below).

### §DS2. Style Coherence Assessment

Scanning for inflection points — components that break the
established voice:

| Component | Issue | Severity | Action |
|---|---|---|---|
| `.update-banner` / `.pending-banner` | Sticky pill at top uses flat red — feels system-default, not editorial | Medium | Re-theme with `--panel` + left-stripe accent (match toast variants) |
| `.camera-dialog` | Full-bleed black camera view with a tiny text overlay — no shared chrome | Low | Acceptable — live camera is its own context |
| `.onboarding-dialog` | Inherits dialog chrome but slide content uses custom spacing | Medium | Standardise slide padding to `var(--sp-5)` |
| `.progress-dialog-card` | Uses `--panel-2` where every other card uses `--panel` | Low | Keep — it's a nested card inside the dialog |
| `.recipe-idea-card` | LLM-generated cards render with looser spacing than the rest of the list | Medium | Tighten gap from `var(--sp-4)` to `var(--sp-3)` |
| `.additive-summary` | `<p>` floats between sections with ad-hoc top margin | Low | Move to the ingredient-section heading |

**Intent test:** coherence score is honest — MIXED-INTENTIONAL — so
fixes are limited to actual drift, not to removing the intentional
mix.

### Step 1 findings → fixes (shipping)

1. Re-theme `.update-banner` + `.pending-banner` to match the
   toast variant visual vocabulary (panel bg + left stripe in the
   semantic colour).
2. Standardise `.onboarding-dialog` slide padding.
3. Tighten `.recipe-idea-card` inter-row gap.

The rest are either correct-by-intent or deferred behind higher-impact
findings in later steps.

---

## Step 2 — II. COLOR SCIENCE (§DC1 + §DC2)

### §DC1. Perceptual Color Architecture

Approximate OKLCH mapping of key tokens (dark theme unless noted):

| Token | Hex | OKLCH (approx) | Note |
|---|---|---|---|
| `--bg` | #E84A5F | oklch(62% 0.19 17) | calmer coral (v2); hue 17° red-orange |
| `--accent` | #FF6B45 | oklch(69% 0.20 37) | orange; ~90% of peak chroma at L=69 |
| `--panel` | #1B1B1F | oklch(18% 0.004 280) | chromatic-dark (slight cool tint) — correct per skill |
| `--text` (dark) | #F5F0E8 | oklch(95% 0.01 90) | warm-cream, low chroma |
| `--grade-aplus` | #6BE584 | oklch(85% 0.20 147) | green |
| `--grade-a` | #A3E067 | oklch(85% 0.20 130) | yellow-green |
| `--grade-b` | #F5D651 | oklch(87% 0.17 100) | yellow |
| `--grade-c` | #F5A64B | oklch(76% 0.16 57) | orange |
| `--grade-d` | #F56E4B | oklch(67% 0.19 35) | red-orange |
| `--grade-f` | #E54B5E | oklch(60% 0.19 15) | red |

**Perceptual uniformity:** grade ladder walks from L=85 → L=60. That's
a ~25-point lightness ramp, visually distinct. Chroma varies
(0.16–0.20) but not systematically — acceptable for a grade scale
because hue already carries the semantic.

**Chromatic-dark:** `--panel` carries a slight blue tilt (B higher
than R/G by ≈4 in RGB). Skill target for refined dark surfaces is
`oklch(12% 0.01 240)`. Current value is close. No change.

**Temperature coherence:** dominant warm (coral/orange/cream). Green
grade-aplus is the only cool element — intentional semantic. No
conflict.

### §DC2. Palette Role Inventory

Mapping current tokens to the skill's canonical role table:

| Role | Present as | Assessment |
|---|---|---|
| Background | `--bg` | ✓ |
| Surface 1 | `--panel` | ✓ |
| Surface 2 | `--panel-2` | ✓ |
| Surface 3 | `--panel-3` | ✓ |
| Primary text | `--text` | ✓ |
| Secondary text | `--muted` | ✓ |
| **Disabled text** | (missing) | **GAP** — fixed via opacity 0.45 |
| Accent primary | `--accent` | ✓ |
| **Accent hover** (lighter) | (missing) | **GAP** |
| Accent pressed (darker) | `--accent-dim` | ✓ but mis-named "dim" — it's "pressed" |
| **Accent focus** | (missing) | **GAP** — focus ring reuses `--accent` |
| Destructive | `--danger` | ✓ (= `--grade-f`; intentional) |
| Success | `--success` | ✓ (= `--grade-aplus`; intentional) |
| Warning | `--warning` | ✓ (= `--grade-c`; intentional) |
| Border default | `--border` | ✓ |
| **Border focus** | (missing) | **GAP** |
| **Selection bg** | (missing) | **GAP** — browser default highlight |

### Step 2 findings → fixes

Ship five real token additions + one rename:

1. `--text-disabled` (dark + light) — eliminates opacity-hack pattern.
2. `--accent-hover` (OKLCH ~8% lighter than `--accent`) — proper hover.
3. `--accent-focus` (warm outer-glow variant) — distinct focus from hover.
4. `--border-focus` — focus-visible outlines use this, not bare `--accent`.
5. `--selection-bg` — style `::selection` so highlights match the brand
   instead of system-blue.
6. Alias `--accent-pressed` = `--accent-dim` (keep the old name working,
   introduce the correct name).

---

## Step 3 — §DC3 dark-mode craft + §DC4 brand distinctiveness

### §DC3. Dark Mode Craft Assessment

Scann-eat's dark theme is atypical: `--bg` is a brand colour (coral),
not a dark surface. Cards stack *on* the coral. So the
elevation-as-lightness rule applies inside the card stack, not to
page-level.

Measured OKLCH lightness of the panel stack (dark theme):

| Token | Hex | OKLCH L | Delta from prev |
|---|---|---|---|
| `--panel` | #1B1B1F | 18% | — |
| `--panel-2` | #2A2A30 | 26% | **+8%** (skill target: +3–4%) |
| `--panel-3` | #3A3A42 | 34% | **+8%** |

**Finding DC3-1:** panel-2 and panel-3 each jump +8% in OKLCH
lightness above the previous layer. Skill target is +3–4%. Current
steps make the hover surface (panel-3) read as a different material
rather than a lift. 15 rules reach for `--panel-3`; retuning in
place risks breaking them.

**Fix:** add `--surface-hover` + `--surface-pressed` tokens tuned
to the skill spec (+3%, +6% over `--panel`) and migrate the hover
call-sites to them over time. Leave `--panel-3` as-is for deepest
nesting.

**No pure black, no shadows in dark cards** — already correct.

### §DC4. Brand Color Distinctiveness

Competitive map of food-tracking accents:

| App | Accent hue |
|---|---|
| MyFitnessPal | blue (220°) |
| Cronometer | green (140°) |
| Lifesum | green (135°) |
| Yazio | teal (180°) |
| OFF | green (135°) |
| Bitesnap | orange (30°) |

Scann-eat accent: `#FF6B45` → hue 37°. Closest competitor: Bitesnap
(~30°). 7° apart — under the 15° confusion threshold the skill flags.

**Finding DC4-1:** Accent hue lands near Bitesnap's. However the
two-tone combo (coral-bg + orange-accent) has no analogue in the
category — the page-level coral is the distinctive brand signature,
not the accent alone. Calibration signature `oklch(69% 0.20 37)` is
specific (not Tailwind orange-500 `#F97316`).

Verdict: distinctive enough via page-level coral. No recalibration
needed; if ever pressed, shift accent 10–15° warmer (toward hue 22°)
to separate from Bitesnap.

### §DC5 spillover — tension color

No tension colour exists. The grade palette (green at 147°) is ~110°
from the accent but it's already semantic (A+). Using it
compositionally would dilute meaning.

**Finding DC5-1:** add a `--tension` token at hue ~170° (teal-green)
distinct from any grade, for rare-use celebration moments (streak
milestones, "goal hit" confetti, compare-armed). Don't apply broadly;
document the 3-5 appearances-per-app rule.

### Step 3 fixes → shipping

1. `--surface-hover` and `--surface-pressed` tokens tuned to the
   skill's +3%/+6% OKLCH spec.
2. `--tension` token + `--tension-ink` pair for rare-use accents.
3. Documented brand-distinctiveness findings in the audit doc.
4. No breaking rename: `--panel-3` stays in place for the 15 rules
   already using it.
