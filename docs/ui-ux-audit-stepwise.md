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

---

## Step 4 — III. TYPOGRAPHY (§DT1–§DT4)

### §DT1. Type Personality Matrix

Current stacks:

| Stack | Where applied |
|---|---|
| `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | default |
| `'Atkinson Hyperlegible', system-ui, …` | opt-in via `.font-atkinson` (dyslexia-friendly) |
| `'Lexend', system-ui, sans-serif` | opt-in via `.font-lexend` |

Placement on the matrix:
- **system-ui**: typically humanist sans on Apple (San Francisco) or
  neutral-grotesque on Windows (Segoe UI). **Default** leans humanist.
- **Atkinson Hyperlegible**: humanist-sans, purpose-built for
  low-vision readability (Braille Institute).
- **Lexend**: humanist-sans tuned for reading-speed studies.

Match to §DP2 character ("warm editorial, scientist's notebook at a
farmer's market"): **humanist sans is the correct placement**.
System-ui is the safe baseline; Atkinson + Lexend are user-selectable
reading-assist alternates. No misalignment.

**No change needed at the family level.**

### §DT2. Typographic Scale & Rhythm

**Extracted sizes:** 42 unique `font-size` values across the CSS.
That's 7× the size of a coherent scale. Ratio check — sizes
scattered between `0.7em` and `1.6em` with no discoverable
arithmetic.

**v2 layer already added the scale** (`--text-xs` … `--text-2xl`)
but only cascaded it into a small number of rules. The 42 ad-hoc
sizes still drive most of the visible UI.

**Ratio** for the v2 scale: 11.5 → 13.6 → 16 → 18.4 → 24 → 32.
That's not on a clean ratio — it mixes 1.18, 1.18, 1.15, 1.30, 1.33.
Should sit on a single ratio.

**Fix options:**
- Minor-third (1.2): 12.8 → 15.4 → 18.4 → 22 → 26.4 → 31.7.
- Major-third (1.25): 12.8 → 16 → 20 → 25 → 31.3 → 39.
- **Chosen: minor-third (1.2)** — food-quality consumer app, warmth
  over formality, steps need to be close enough for running copy
  to flow into labels without a jarring jump.

**Shipping:** retune `--text-*` tokens to minor-third, keep the same
semantic names so every downstream rule stays correct.

### §DT3. Advanced Type Craft Signals

| Signal | State | Action |
|---|---|---|
| `font-variant-numeric: tabular-nums` | ✓ set via `--num-feat` on `<body>` (v2) | keep |
| `font-feature-settings: "kern" 1` | default on modern browsers | add explicit via body |
| `font-variant-ligatures: common-ligatures` | missing | add |
| `-webkit-font-smoothing: antialiased` | missing | add |
| `text-rendering: optimizeLegibility` | missing | add |
| `text-wrap: balance` on display headings | missing | add to h1/h2 |

**Finding:** 5 missing craft signals. All are body/root-level rules,
cheap to add.

### §DT4. Typographic Voice & Expressiveness

**Line-height audit:** default browser `line-height: normal` ≈ 1.2
is used almost everywhere. For a reading-warm product the skill
target is 1.5–1.6 for body, 1.7+ for long-form. Currently:

- Body: inherits `line-height: normal` → too tight for warmth.
- Dialog text: same.
- Hints / captions: often `1.35`. Acceptable.

**Measure (line length):** `main { max-width: 600px }` equals
≈75 characters at default body size — right at the top of the
comfortable reading range. Good.

**Expressive moments:** empty states got v2 treatment (dashed border,
muted italic). Success toasts get the `'ok'` variant stripe. Error
toasts get red stripe. Good. **Missing:** success STATE typography
(after a save / scan log) is identical to idle-state body text.
Skill's §DST4 will be covered in a later step.

### Step 4 fixes → shipping

1. Retune `--text-*` scale to minor-third (1.2 ratio).
2. Add body-level typography craft block: kerning, ligatures,
   antialiasing, optimizeLegibility, balance on h1/h2.
3. Bump body `line-height` to 1.5 (warm-editorial target).
4. Document type-voice findings; success-state typography deferred
   to Step 11 (§DST4).

---

## Step 5 — IV. MOTION (§DM1–§DM5)

### §DM1. Motion Vocabulary Card

Current state, extracted:

| Token (measured) | Count | Where |
|---|---|---|
| `100ms ease` | 1 | chip-btn subtle |
| `120ms ease` | ~5 | button feedback, summary hover |
| `140ms ease` | 2 | settings-btn, recipe-idea card |
| `160ms ease` | 1 | skip-link |
| `180ms ease` | 2 | toast show/hide, progress bar |
| `240ms ease` | 1 | weekly-bar fill |
| `260ms ease` | — | unused |
| `0.15s ease` | 1 | one rule in s-form rather than ms |
| `1.2s ease-in-out infinite` | 3 | voice-pulse, shimmer, dash-pulse |
| `0.9s linear infinite` | 1 | progress-spinner |
| v2 layer `--speed-ui 140ms` / `--ease-ui cubic-bezier(…)` | 6 | buttons, chips |

**Finding DM1:** 8 different durations + mix of `s` / `ms` +
`ease` (legacy) vs `cubic-bezier` (v2). No canonical vocabulary.

Recommendation card per skill:

```yaml
Vocabulary (target)
──────────────────
Micro-feedback (press, toggle):     100 ms  ease-out
Small state (color, focus):         140 ms  ease-out  ← v2 --speed-ui
Entrance (appear, expand):          200 ms  ease-out
Exit (dismiss, collapse):           150 ms  ease-in
Navigation (view, page):            250 ms  ease-in-out
Looping (pulse, shimmer):          1200 ms  ease-in-out infinite
```

### §DM2. Motion Character vs Axis Profile

Energy axis = 3 (v2 dial-down). Appropriate motion character:
- Snappy but not bouncy (no overshoot spring)
- Single-ease family (cubic-bezier(.2,.8,.2,1) — the v2 curve)
- Reduce-motion respected everywhere

Current state mostly aligns. The `1.2s` pulses read slightly
slow for a "warm but responsive" feel; `1.0s` would match.

### §DM3. Motion Performance

- No `animation-fill-mode: both` explicitly set anywhere — enter
  animations can flash their end state before starting. Minor.
- `will-change` never used — acceptable, avoids promotion costs.
- reduce-motion handling is present but inconsistent: voice-pulse,
  skeleton, wbar-col have explicit overrides; others rely on the
  single kill-switch block (v2). Good.

### §DM4. Micro-interaction

| Element | Current feedback | Target |
|---|---|---|
| Primary button | scale(0.97) + elev-change (v2) | ✓ |
| Chip button | no press feedback | **GAP** — add scale(0.97) |
| Dashboard entry edit/del | no press feedback | **GAP** — subtle scale |
| Hydration +/- | no press feedback | **GAP** — add |
| Toggle checkbox | browser default | acceptable |
| Focus ring | v2 color via --border-focus | ✓ |

### §DM5. Motion Signature

One moment of "intentional motion expression" the app could own:
the scan success reveal (grade chip lands with a tiny spring).
Currently: the scan result appears static. A scale-up reveal
(scale 0.95→1, 200ms ease-out) on `.grade-chip` would be the
signature. **Low-risk, opt-in via a CSS class.**

### Step 5 fixes → shipping

1. Canonical motion tokens: `--motion-fast` 100ms, `--motion-base`
   140ms, `--motion-enter` 200ms, `--motion-exit` 150ms,
   `--motion-nav` 250ms, `--motion-loop` 1200ms.
2. Press-feedback class `.press` (scale 0.97 on :active + transition)
   applied to chip-btn, dash-entry-edit/-del, hydration +/-.
3. Grade-chip signature reveal — opt-in keyframe `.grade-chip-reveal`.
4. Retune the 1.2s pulses → 1.0s (within warm-responsive feel).

---

## Step 6 — §DH visual hierarchy + §DSA surface & atmosphere

### §DH1. Hierarchy engineering — squint test

Primary screens evaluated:

**Scan result** (`#result`):
- First landing: grade chip (large, colored, pattern-overlaid). ✓
  intentional dominance.
- Second: product name (bold, large). ✓
- Third: per-pillar scores (chips). ✓
- **Gap:** "Log this portion" button sits BELOW the score audit,
  visually smaller than the grade chip. Intended primary action is
  less prominent than the information display. Acceptable — this
  is an audit tool first, logger second — but worth noting.

**Dashboard** (`#daily-dashboard`):
- First landing: date + "Remaining" line. ✓
- Second: streak chip (when visible, gets color attention). ✓
- Third: hydration / activity / fasting tiles. Each tile competes
  equally — **accidental equal-weight**. User who logs daily reads
  the same three tiles in the same order every morning; hierarchy
  could emphasise whichever has the most urgent state today.
- Remaining rows (macros + micros): uniform row height with
  progress bar. Reading depth-only — no anchor to scan ahead. ✓
  (intentional — dense data panel).

**Recipes / templates lists:**
- Title + kcal + ingredient-count line dominates. ✓
- Action chips (apply / edit / dup / share / del) all at same
  weight. Apply is the primary action but not visually emphasized.
  Previous v2 layer made `.chip-btn.accent` carry elevation —
  that's the distinguishing affordance now. ✓ after v2.

### §DH2. Reading pattern compliance

App layout is a single-column 600px max — **F-pattern only**.
Dashboard rows render label→bar→value→pct in that order, matching
left-to-right scan. ✓. Recipe/template rows render name→kcal→
chips, also left-first. ✓.

**Mobile thumb zones:** primary action chips (Quick Add, Templates,
Recipes, Weight) live in the dashboard middle-band. Works on
scroll-down; not a thumb-zone placement, but this is a PWA, not a
native chrome, so no system-bottom-nav to compete with. ✓.

### §DH3. Visual weight distribution

**80/20 test** for the daily-use flow (log a meal, check remaining):
- Primary task surfaces: Quick Add button (top-right chip row),
  scan button (top-hero), dashboard "Remaining" line.
- Visual surface = ~15% of the pixel real estate.
- Pass.

**Heavy corner audit:** no corner accumulates weight
disproportionately. Header has two small icon-only buttons
top-right; nothing else. ✓.

### §DH4. Contrast as composition tool

- **Value contrast:** cards (#1B1B1F) on coral (#E84A5F) —
  near-maximum value contrast. Cards "pop" strongly. ✓.
- **Scale contrast:** v2 tokens now provide six steps. Dashboard
  numerics are `--text-xl` / `--text-2xl` vs labels at `--text-sm`
  / `--text-xs`. ✓ after Step 4.
- **Chroma contrast:** grade palette is the only truly saturated
  area. Everything else desaturates to cream/near-black. Grades
  therefore command attention — intentional.
- **Form contrast:** all cards and chips use rounded corners
  (`--r-md` / `--r-pill`). No sharp form contrast. Acceptable —
  consistent style signal.

**Isolation principle:** dashboard uses plenty of quiet muted
labels so the current-day numerics pop. ✓.

### §DSA1. Background as material

v2 set `body` to `linear-gradient(180deg, --bg → --bg-deep)`.
Direction: top-light → bottom-weight. ✓ natural gravity.

**Finding DSA1-1:** the gradient is applied only to body. Dialog
backdrops (`dialog::backdrop`) default to a near-opaque rgba(10,10,10,0.65)
which feels system-generic against the warm bg. Fix: use the same
coral gradient at reduced opacity for dialog backdrops so the
atmosphere is consistent when a dialog opens.

### §DSA2. Elevation system

v2 added `--elev-1` / `--elev-2`. Single light source (0 1px 3px
rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.06)) = top-down light. ✓.

**Finding DSA2-1:** dark theme uses the same shadow values as
light. Skill says dark-mode elevation should come from lightness,
not shadow (shadows ~invisible on dark). But here `--panel` cards
sit on a *coral* bg (not dark bg), so shadows ARE visible. The
rule ("no shadow in dark") is for dark-on-dark; our case is
card-on-coral which is different. **Acceptable.**

### §DSA3. Atmosphere signals

| Signal | State |
|---|---|
| Grain/noise overlay | ✗ missing (skill: 0-4% opacity, most styles) |
| Gradient directionality | ✓ 180deg top→bottom |
| Color temperature shift with depth | partial — cards are cool-tinted near-black, bg is warm coral |
| Border opacity treatment | ✓ `--border` uses rgba, adapts to surface |

**Finding DSA3-1:** no grain/noise. A 2% opacity noise overlay on
the body bg would add warm "paper" feel without distracting — matches
the "scientist's notebook" vision statement.

### §DSA4. Light physics

Single light source, top-down (shadows all drop). ✓ consistent.
No luminous/glow effects (none needed — not cyberpunk). ✓.

### §DSA5. Focal vs ambient atmosphere

**Ambient** = body gradient. **Focal** candidates:
- Scan grade chip — the celebration moment.
- Streak chip when active.
- Apply-recipe success.

Currently only the grade chip has a distinguishing element (the
pattern overlay added in R13). Other focal moments land in plain
toasts. **Acceptable** — focal restraint is correct for warm
editorial.

### Step 6 fixes → shipping

1. Dialog backdrop: warm coral tint instead of generic black.
2. Paper-grain noise overlay at 2% on body (via SVG data URI).
3. Reduce-motion + reduce-contrast branches honoured.
4. Document DH findings — dashboard tile-equal-weight and
   scan "log" button placement are intentional trade-offs.

---

## Step 7 — §DI iconography + §DDT trend calibration

### §DI1. Icon Language Assessment

**Icon sources:** one — **Unicode emoji only**, documented as
convention in `docs/design-system.md`.

**Style:** native OS emoji. Platform-dependent rendering:
- Apple: 3D shaded illustrations (iOS / macOS Safari)
- Google: flat filled (Android Chrome, Linux)
- Microsoft: flat linear (Edge on Windows)
- Samsung: hybrid

Finding **DI1-1**: cross-device visual drift. A 🥕 on iOS renders
as a detailed 3D carrot with ink outline; on Windows it's a
flat-orange triangle. Same product, different feel.

**Fix options:**
- **Twemoji CDN / bundle** (Twitter open-source set) — one consistent
  style everywhere. Cost: +40 KB (bundle) or one extra HTTP call
  (CDN). Cheap and one-shot.
- **Custom SVG icon set** — biggest visual differentiator but a
  large undertaking.
- **Accept platform variance** — current state; cheapest.

**Shipping choice:** add a `.icon-glyph` helper class that normalises
emoji inline-with-text alignment (line-height, optical size,
vertical baseline). Defer the Twemoji adoption to a future product
decision — call it out in the audit as the biggest remaining
iconography lever.

### §DI2. Icon Grid & Optical Sizing

Emojis don't sit on a 24×24 grid — each platform's vector sizes
differently. What Scann-eat CAN control:
- **Inline-with-text alignment:** baseline drift when emoji + text
  share a line. Fix: `line-height: 1; vertical-align: -0.1em;` on
  the glyph span.
- **Optical size compensation:** simple-geometry emojis (💧, ⚖️)
  look smaller at the same font-size as dense-geometry (📅, 🥕).
  Nudge glyph `font-size: 1.08em` to compensate.

### §DI3. Icon Expressiveness Spectrum

Placement: **Calibrated** (emoji + OS-native rendering, no
customisation). Appropriate for warm editorial product. NOT
stuck at Utilitarian.

If product positioning ever shifts toward "flagship consumer" or
"IP-adjacent", move to **Signature** via custom SVG set. Not
warranted now.

### §DI4. Custom Icon Direction

Deferred — product doesn't yet warrant Signature or Illustrative.
When it does, the skill's 5-icon test sequence (home / settings /
user / alert / plus) is the design gate.

### §DDT1. Trend Inventory

| Trend | Present? | Status |
|---|---|---|
| Glassmorphism | ✓ partial — dialog backdrops (Step 6) | Cooling but executed correctly; text lives on cards above the scrim, high-contrast coral backdrop. |
| Neumorphism | ✗ | ✓ (passed) |
| Bento grid | ✗ | n/a |
| Gradient mesh | ✗ | We use linear gradient, not mesh. |
| Bold type-as-hero | ✗ not yet deployed | Tokens ready (`--text-2xl`, `--text-3xl`); no hero moment uses them. |
| Neo-brutalism | ✗ | ✓ |
| Dot/grid texture | paper-grain 2% (Step 6) | Adjacent — grain, not grid-texture. OK. |
| Aurora | ✗ | ✓ |
| Minimal monochrome | ✗ | n/a (we're warm, not monochrome) |
| Skeuomorphic revival | gesture via paper grain | Low intensity, intentional. ✓ |

**Finding DDT1-1:** Glassmorphism backdrop-filter blur at 6px sits
below the skill's ≥12px quality bar. Bump to 12px to meet the
threshold (executed well or removed — no middle).

### §DDT2. Trend Strategy

Warm-editorial consumer app competing on privacy + nutrition
quality. Correct posture: **Trend selective** (use where it serves,
ignore where it doesn't). Actual posture matches. No gap.

**Trend debt:** none. v2 already dialled back the "vibrant coral
shout". No neumorphism. No flashy trends maintained-for-legacy.

### Step 7 fixes → shipping

1. `.icon-glyph` helper class (line-height, vertical-align, optical
   size nudge) for emoji-with-text consistency.
2. Dialog backdrop-filter blur 6px → 12px (meets skill quality bar
   for glassmorphism).
3. Document Twemoji as the biggest pending iconography lever (not
   shipped — product decision).

---

## Step 8 — §DBI brand identity (archetype · DNA · anti-genericness)

### §DBI1. Brand personality archetype

- **Projected by current design:** Sage (calm authority, clean
  information) + Lover (warm, sensory, intimate) + Caregiver
  (warm, soft, unhurried) as tertiary.
- **Intended per §DP2 vision statement:** Sage + Caregiver —
  trustworthy nutrition guidance with warmth.
- **Alignment:** ✓ close. Lover tertiary is a bonus, not a gap.

No archetype pivot needed.

### §DBI2. Design DNA — signature extraction

Candidates (distinctiveness × visibility):

| Candidate | Dist. | Visibility | Character | Action |
|---|---|---|---|---|
| Coral bg + near-black card two-tone | HIGH | every screen | ✓ | already the primary signature |
| Grade chip with pattern overlay | HIGH | every scan + recipe + history | ✓ | **gap — missing from `.grade`** (main scan-result badge, `#grade-el` / `#personal-grade-el`) |
| Paper-grain 2% overlay | MED | ambient | ✓ | keep as-is |
| Scan-reveal grade land | MED | opt-in | ✓ | keep opt-in |
| EU-allergen detection in ingredient rows | HIGH (functional) | scan-result | ✓ | already-shipped, not a visual signature |

**Finding DBI2-1:** the scan-result grade badge `.grade`
(`#grade-el` and `#personal-grade-el`) is the single most-seen
grade instance. The pattern-overlay rule we applied to
`.recent-grade` / `.compare-grade` / `.recipe-row-grade` /
`.recipe-edit-grade` (R13.7 + R14) was **not** extended to
`.grade`. Fix: apply the same overlay-by-grade rules to `.grade`
so the "Scann-eat grade badge" is recognisable everywhere as the
same element.

### §DBI3. Anti-genericness audit (12 signals)

| # | Signal | Current | Verdict |
|---|---|---|---|
| 1 | Default Tailwind blue | `--accent` #FF6B45 orange | ✓ |
| 2 | Inter default weight everywhere | system stack + Atkinson/Lexend opt-in | ✓ |
| 3 | rounded-lg on everything | single `--r-md` 18px for cards + buttons + inputs | **gap — add semantic radius** |
| 4 | 16px grid only | `--sp-*` scale with 4/8/12/16/20/24/32/48 | ✓ |
| 5 | shadow-sm (generic gray) | v2 `--elev-1` uses `rgba(0,0,0,.08)` | **gap — use tonal shadow** |
| 6 | Default Heroicons / Lucide | Unicode emoji | ✓ |
| 7 | Gray-900/500/400 text stack | chromatic cream + brown-gray muted | ✓ |
| 8 | White #ffffff as bg (light) | `--panel` light = `#FFFFFF` pure | **gap — tint warm** |
| 9 | transition: all 0.2s ease-in-out | specific property transitions | ✓ |
| 10 | Full-width buttons everywhere | sized to content; form-submits full-width (correct) | ✓ |
| 11 | Single `<hr>` separator style | multiple `--border` / `--border-strong` | ✓ |
| 12 | Placeholder #9ca3af default | no `::placeholder` rule — browser default | **gap — add token-tied rule** |

### Step 8 fixes → shipping

1. **`.grade` pattern overlay** — apply the same grade-letter
   pattern system as the other grade badges. Covers the primary
   scan-result badge (`#grade-el`) and the personal-score badge
   (`#personal-grade-el`).
2. **Semantic radius tokens** — `--r-btn` 14px, `--r-card` 18px
   (existing `--r-md`), `--r-input` 10px, `--r-badge` 999
   (existing `--r-pill`), `--r-modal` 24px (existing `--r-lg`).
   Buttons, cards, inputs no longer share the same radius.
3. **Tonal shadow** — `--elev-1-tonal` using the coral bg at low
   opacity instead of pure black. Applied to the elevation
   default without breaking existing call-sites that reach for
   `--elev-1`.
4. **Light-theme panel warm tint** — `#FFFFFF` → `#FFFDF7`
   (oklch ≈ 99% 0.005 90). Pure-white removed.
5. **`::placeholder` rule** — placeholder text pulled from the
   muted token, not browser default gray.

---

## Step 9 — §DP design character system (extract · assess · brief)

### §DP0. Character extraction (read from code, not from intent)

| Signal | Extracted value(s) |
|---|---|
| **Background** | Dark: `#E84A5F → #D94458` coral gradient. Light: `#F6D0D6 → #F0B7BF` coral paper. Gradient body (v2), 2% SVG-noise paper grain overlay. |
| **Surface** | Dark panel `#1B1B1F` near-black. Light panel `#FFFDF7` warm cream (Step 8). Nested `--panel-2` cream/charcoal, `--panel-3` deeper. |
| **Accent** | Dark `#FF6B45` orange. Light `#B0431F` burnt sienna. Plus `--accent-hover`, `--accent-pressed`, `--accent-focus` (Step 2). |
| **Grade palette** | 6-stop green→red diverging scale with B dots / C diagonals / D hatch / F dense X overlay on every badge (Step 8 extended to `.grade`). |
| **Spacing scale** | `--sp-1..8` = 4/8/12/16/20/24/32/48. Dominant section rhythm `--sp-5` 20px. No ad-hoc values. |
| **Radii** | `--r-xs 8`, `--r-sm 12`, `--r-md 18` (cards), `--r-lg 24` (modals), `--r-xl 32`, `--r-pill 999` (chips). Plus semantic aliases `--r-btn 14`, `--r-input 10`, `--r-card`, `--r-badge`, `--r-modal` (Step 8). |
| **Typography** | Atkinson Hyperlegible primary + optional Lexend. Minor-third scale `--text-xs..3xl` = 11.5/13.9/16/19.2/23/27.7/33.2 (Step 4). tabular-nums + lining-nums on `body`. |
| **Weight range** | 400 body → 700 grade/display. No ultra-light, no black. |
| **Motion durations** | `--motion-fast 100ms`, `--motion-base 140ms`, `--motion-enter 220ms`, `--motion-exit 180ms`, `--motion-nav 260ms`, `--motion-loop 1000ms`. One easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. |
| **Elevation** | `--elev-1` neutral shadow + `--elev-1-tonal` coral-hued option (Step 8). `--elev-2` hover/active. |
| **Borders** | Hairline `--border` low-contrast + `--border-strong` for dim-bg dividers. 1.5px dashed on empty-state tiles. |
| **Icons** | Unicode emoji only. `.icon-glyph` helper normalises baseline/size (Step 7). One emoji per feature. |
| **Surface atmosphere** | Coral-gradient dialog backdrop @ 12px blur + 2% paper-grain body overlay + grade-pattern overlays on badges. |
| **Voice (microcopy)** | French/English, plural-aware i18n. Verbose-but-warm ("Aucune recette sauvegardée.") — casual register, emoji-accented. |

**Emergent personality statement (read from the above, not from intent):**
> *The design reads as a **warm, precise food ledger** — coral paper,
> cream card-stock, numbers that line up like an accountant's
> columns, soft notebook-grain texture, diverging-scale badges that
> feel like handwritten grades. Strongest signals: (1) coral+cream
> two-tone; (2) tabular-numerals scientific feel; (3) emoji-per-feature
> casual tone. Weakest signals: (1) dialog backdrop leans
> "premium glassmorphism" against the paper identity; (2) main
> product heading `.product h2` has no distinguishing type moment;
> (3) empty states still read as "missing data" rather than
> "notebook page waiting to be filled".*

### §DP1. Six-dimension character analysis

| Dimension | Observed (§DP0) | Target (§0 / v2 vision) | Gap |
|---|---|---|---|
| **D1 Voice — Terse↔Expansive** | 3 (slightly expansive: paper grain, grade overlays) | 3 | ✓ |
| **D1 Voice — Cold↔Warm** | 4 (coral + cream + emoji) | 4 | ✓ |
| **D1 Voice — Formal↔Casual** | 2 (emoji + plural-aware voice + rounded corners) | 2 | ✓ |
| **D1 Voice — Restrained↔Expressive** | 3 (grade patterns, reveal anim) | 3 | ✓ |
| **D2 Space — Dense↔Airy** | 2 (dashboard stacks macros+micros+tiles+meals) | 3 (target) | -1 (manageable) |
| **D2 Space — Flat↔Deep** | 3 (--elev-1 + tonal option + 12px blur) | 3 | ✓ |
| **D2 Space — Rigid↔Fluid** | 2 (token scale, no ad-hoc) | 2 | ✓ |
| **D2 Space — Anchored↔Floating** | 2 (cards anchored, no hovering) | 2 | ✓ |
| **D3 Material dominant** | Paper (cream, shadow-cast, grain) + Glass (dialog backdrop) | **Paper** primary | Glass contradicts — backdrop leans premium/cold |
| **D4 Interaction — Mechanical↔Physical** | 3 (`scale(0.96)` press, eased motion) | 3 | ✓ |
| **D4 Interaction — Snappy↔Considered** | 2 (140ms base, firmly snappy) | 2-3 | ✓ |
| **D4 Interaction — Silent↔Expressive** | 3 (opt-in grade reveal, pulse loops) | 3 | ✓ |
| **D5 State — Empty** | Dashed-border italic muted box | On-character, but generic copy | -1 on copy, not CSS |
| **D5 State — Loading** | Skeleton + pulse-dots | ✓ | ✓ |
| **D5 State — Success** | Toast 'ok' variant | ✓ | ✓ |
| **D5 State — Error** | Toast 'warn' variant + `--danger` | ✓ | ✓ |
| **D6 Coherence** | **PARTIALLY COHERENT** | COHERENT | dialog glass + `.product h2` generic |

**Primary coherence fix (one change, highest impact):** lean the
`.product h2` (scan-result product name) into the notebook-ledger
character with a subtle fountain-pen-style underline — a thin
accent rule under the name, visible only in the main result card.
This is the "one unavoidable moment" per §DP3.5 where character
becomes deliberate rather than ambient.

**Secondary coherence fix:** tighten dialog backdrop — drop the
gloss-glass cast by layering the coral gradient *over* a subtle
paper-grain behind the blur, so the backdrop reads as
"looking at the cover of the notebook" rather than
"premium iOS sheet". Small opacity bump on the grain when
dialogs open.

### §DP2. Design character brief (shipped to `docs/design-system.md`)

Added as a new **"Character brief"** section. See design-system.md
for the canonical copy; summary here:

- **Voice**: warm + casual + moderately expressive (Sage+Caregiver+Lover).
- **Space**: dense-but-paced, flat-with-lift, rigid token grid.
- **Material**: Paper (cream + grain + shadow-cast), with Light as
  tertiary for the grade palette glow. Glass is demoted — dialogs
  use tinted paper, not frosted glass.
- **Interaction**: snappy (140ms base) + physical press + expressive
  on opt-in signature moments only (grade reveal, pulse loops).
- **States**: consistent paper-on-notebook treatment across empty /
  loading / success / error.

### Step 9 fixes → shipping

1. **`.product h2` ledger underline** — subtle 1px coral accent
   rule under the scan-result product name. Expresses the
   "scientist's notebook" material through ONE deliberate type
   moment. Feather the underline so it doesn't read as a link.
2. **Paper-grain under dialog backdrop** — body's 2% grain stays
   visible *behind* the coral scrim when `body:has(dialog[open])`
   so the dialog reads as "paper cover" rather than pure glass.
   Bumps material coherence without touching the blur effect.
3. **Design-system.md Character brief** — canonical §DP2 brief
   added so future work filters decisions through the brief,
   not reinvents it.
