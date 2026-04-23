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
