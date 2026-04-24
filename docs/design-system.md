# Design system

Scann-eat's visual language is a token set + a small component vocabulary,
defined entirely in `public/styles.css`. There's no Figma file and no
framework; the CSS IS the design system.

**v2 refinement landed 2026-04**, then reviewed end-to-end by the
2026-04 audit (see `docs/audit-v3/SUMMARY.md`). Key additions:
explicit typography scale, elevation tokens, calmer coral backdrop,
unified dialog chrome, scaled focus ring, shared motion speed.

## Vision (one-sentence)

> Scann-eat looks like a scientist's notebook at a farmer's market:
> warm cream paper, precise typography, nothing decorative, every
> number earns its pixel.

## Aesthetic profile (5-axis, v2 targets)

| Axis | v2 |
|---|---|
| Sophistication | 3 (warm, consumer-friendly, not clinical) |
| Density | 3 (data-heavy but paced) |
| Energy | 3 (calmer coral; brand recognition without shouting) |
| Formality | 2 (playful tone, emoji-per-feature) |
| Warmth | 4 (cream + coral = food-warm) |

## Component DNA — three primitives

- **Card** — `--panel` surface, `--r-md` radius, `var(--elev-1)` shadow,
  `--sp-5` internal padding.
- **Chip** — `--r-pill` shape, 40 px min-height (36 px `.compact`),
  two variants: outline + `.accent`.
- **Row** — 56 px min-height, `--sp-3` gap, single `--border` hairline
  separator. `.row` utility available for new features.

Everything else composes from these three.

## Tokens

Defined as CSS custom properties on `:root, [data-theme="dark"]` (default)
and `[data-theme="light"]`. **~80 tokens total** (regenerated from source
2026-04 per audit F-DTA-04; previous "53 tokens" figure was stale).
Theme switching flips the `data-theme` attribute on `<html>`; every
downstream rule reads the same variable name.

### Background + surface

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#E84A5F` | `#F6D0D6` | Page background (refined 2026-04 from prior #F54B5E / #F8C8CF — calmer) |
| `--bg-deep` | `#D94458` | `#F0B7BF` | Bottom of body gradient |
| `--panel` | `#1B1B1F` near-black | `#FFFFFF` | Card surfaces |
| `--panel-2` | `#2A2A30` | `#FAF5E9` | Nested card / input background |
| `--panel-3` | `#3A3A42` | `#EFE9DB` | Deepest nesting / fallback hover |
| `--surface-hover` | `#242429` | `#FFFDF7` | New rules hover state (preferred over --panel-3) |
| `--surface-pressed` | `#2D2D33` | `#F5EFDF` | New rules pressed state |

### Text

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--text` | `#F5F0E8` cream | `#1B1B1F` near-black | Text on `--panel` / `--panel-2` |
| `--text-on-bg` | `#1B1B1F` | `#1B1B1F` | Text placed directly on `--bg` |
| `--muted` | `#9A948B` | `#5B564A` | Secondary text, hints |
| `--muted-on-bg` | `rgba(27, 27, 31, 0.65)` | same | Muted text on `--bg` |
| `--text-disabled` | `rgba(245,240,232,0.38)` | `rgba(27,27,31,0.38)` | Disabled form controls |

### Accent + state

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--accent` | `#FF6B45` orange | `#B0431F` darkened for AA | Primary CTA |
| `--accent-dim` | `#D15637` | `#8A3316` | Accent hover / pressed legacy |
| `--accent-ink` | `#0E0E11` (AA 4.9:1, audit F-DC-04) | `#FFFFFF` (5.7:1) | Text drawn on `--accent` |
| `--accent-warm` | `#E8B76B` | `#B0761E` | Informational chips (life-stage, beta notices) |
| `--accent-hover` | `#FF8867` | `#C94D25` | Fine-grained hover state |
| `--accent-focus` | `#FF7E5F` | `#B0431F` | Focus-ring color |
| `--grad-accent` | coral gradient 135deg | same direction, darker | Canonical signature gradient |
| `--tension` | `#2FC7B2` teal | `#0F8F7E` | Counter-accent, ≤5 usages (audit F-DC-05) |
| `--danger` | `#E54B5E` | inherits | Destructive |
| `--success` | `#6BE584` | inherits | Confirmations |
| `--warning` | `#F5A64B` | inherits | Caution (⚠ same hex as --grade-c — see F-DC-01) |

### Grade palette (A+ → F, score chips)

`--grade-aplus` `#6BE584` · `--grade-a` `#A3E067` · `--grade-b` `#F5D651` ·
`--grade-c` `#F5A64B` · `--grade-d` `#F56E4B` · `--grade-f` `#E54B5E`.

Diverging scale from green to red, 6 stops. Used **as background fill**
behind dark `--on-muted` text (`#1B1B1F`) — all six pass WCAG AA in both
themes. Color-blind users are served by per-grade PATTERN OVERLAYS (dots,
stripes, cross-hatch) on `.recent-grade`, `.compare-grade`, etc. — these
patterns are protected (audit F-DC-03).

### Radii

Generic scale: `--r-xs` 8 · `--r-sm` 12 · `--r-md` 18 · `--r-lg` 24 ·
`--r-xl` 32 · `--r-pill` 999.
Purpose-named (only those earning their place): `--r-input` 10 · `--r-modal-lg` 36.

Cards use `--r-md` · buttons use `--r-pill` · full-screen dialogs use
`--r-lg` · settings dialogs `--r-modal-lg`.
(Audit F-DTA-01 retired `--r-btn`, `--r-card`, `--r-badge`, `--r-modal` —
they were pure aliases with 0 refs; call-sites go direct to the underlying.)

### Spacing scale

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 ·
`--sp-7` 32. (`--sp-8` retired; 0 refs.)

All paddings, gaps, and margins reference this scale. No ad-hoc
`padding: 14px`; if you're reaching for one, it's either a bug or a new
token.

### Borders + inputs

`--border` · `--border-strong` · `--border-focus` (= `--accent-focus`) ·
`--input-bg` · `--on-muted` (text drawn on muted chips).

## Theme switching

The lang / theme settings map to `<html data-theme="dark|light">`. A
third option ("auto") watches `prefers-color-scheme` via
`matchMedia('(prefers-color-scheme: light)')` and applies `dark` or
`light` accordingly. See `public/app.js:applyTheme`.

## Typography

### Scale (v2, regenerated 2026-04 per audit F-DT-06)

| Token | Size | Use |
|---|---|---|
| `--text-xs`   | 0.72rem (≈11.5px) | metadata, counters, timestamps |
| `--text-sm`   | 0.87rem (≈13.9px) | secondary labels, chips (bumped from 0.85) |
| `--text-base` | 1rem (16px)       | body default |
| `--text-lg`   | 1.2rem  (≈19.2px) | card headings (bumped from 1.15) |
| `--text-xl`   | 1.44rem (≈23px)   | dashboard numerics (was 1.5) |
| `--text-2xl`  | 1.73rem (≈27.7px) | scan grade, big numbers (was 2.0) |
(`--text-3xl` 2.07rem was defined but unused — retired 2026-04.)

### Numerics
`--num-feat: "tnum", "lnum"` is set on `body`. Every dashboard /
summary / macro / score value inherits tabular-nums automatically;
columns align without custom `font-variant-numeric` rules per site.

### Letter-spacing rule of thumb
- Display sizes (`--text-xl`/`--text-2xl`): `-0.02em`.
- Small caps labels (uppercase section headers): `0.08em`.
- Everything else: default (no manual tracking).

### Fonts
- **Body stack** (from `body { font-family: … }`): Atkinson Hyperlegible
  → system UI chain. Lexend is opt-in via `.font-lexend` body class
  (Settings → Reading → Font).
- **Monospace:** `var(--font-mono)` → `ui-monospace, SFMono-Regular,
  Menlo, Consolas, "Liberation Mono", monospace`. Used in `.app-toast-action`
  and the progress-dialog CSV export textarea.
- **Loading:** Google Fonts `<link>` in `index.html` (not CSS `@import`)
  so discovery happens during HTML parse. 4 weights shipped: Atkinson
  400/700, Lexend 400/600/700 (italic + Lexend 500 retired 2026-04 per
  audit F-DT-01 — unused in the 131 weight declarations).
- Two size modifiers on `<body>`: `.font-size-large` (20px) and
  `.font-size-xlarge` (22px). Default inherits from the browser.
- No custom web fonts shipped by default — first paint stays under the
  performance budget that was informally set as "no layout shift
  visible on 4G".

## Elevation (v2)

Two shadow steps, computed for a fixed light source from above.

- `--elev-1` — cards + primary buttons. Subtle physical lift.
- `--elev-2` — hover / active state for cards that lift under pointer.

Outline buttons (`.secondary`, `.chip-btn` without `.accent`) stay flat
by design — they're information chrome, not affordances.

## Motion (v2)

One speed, one easing:
- `--speed-ui: 140ms`
- `--ease-ui: cubic-bezier(0.2, 0.8, 0.2, 1)`

Everything that transitions uses these. `prefers-reduced-motion: reduce`
disables them via a single kill-switch block. No per-component duration
drift.

## Backdrop (v2)

The body gets a calmer coral gradient (`--bg` → `--bg-deep`) instead of
the previous flat vibrant coral. Reduce-motion users fall back to the
flat `--bg` — parallax/gradient drift off for them.

## Motion

One opt-out: `body.reduce-motion` (applied when the user checks a
Settings box OR when `prefers-reduced-motion: reduce` is honoured
programmatically). Disables the hydration fill transition, fasting fill,
and any future animated fill. Every animation rule should test for
`body.reduce-motion` before committing.

## Component vocabulary

| Component | File location | Purpose |
|-----------|---------------|---------|
| **Result card** | `.result`, `.product` in `styles.css` | Post-scan display: grade badge, name, macros |
| **Score chip** | `.chip` variants + `[data-grade]` | Grade A+..F colored pill |
| **Progress row** | `.dash-row`, `.dash-bar`, `.dash-fill` | Daily macro bars with target + percent |
| **Meal section** | `.meal-section`, `.meal-header`, `.meal-entries` | Breakfast / lunch / dinner / snack groupings |
| **Tile (hydration / fasting / activity)** | `.hydration-tile`, `.fasting-tile`, `.activity-tile` | Consistent card shape for daily trackers |
| **Pairing chip** | `.pairing-chip` | "🍽️ ça va bien avec" chips with shared-compound tooltip |
| **Recipe card** | `.recipe-idea-card` | LLM-generated recipe cards |
| **Menu scan row** | `.menu-scan-item` | Restaurant-menu dish row with per-dish "Add" button |
| **Gap-closer chip** | `.gap-closer-chip` | Nutrient-deficit suggestions on dashboard |
| **Install banner** | `.install-banner` | Dismissible PWA install prompt at top of main |
| **Settings dialog** | `.settings-dialog` | Standard modal shape for every feature's settings |
| **Chip button** | `.chip-btn`, `.chip-btn.accent`, `.compact` | Primary nav buttons in dashboard + dialog actions |

## Icons

Unicode emoji. Zero icon fonts, zero SVG sprite sheets. Convention: every
feature uses a single recognisable emoji as its accent glyph
(📅 planning, 🥕 pantry, 🛒 grocery, 🎯 gap-closer, 💡 recipe ideas,
📜 menu scan, 📸 photo, 📱 install).

**Expressiveness position (§DI3):** *Calibrated Signature.* The
base (Unicode emoji) is standard — the signature is the house rule
"one recognisable emoji per feature." `.icon-glyph` helper +
`button > span[data-icon]` auto-apply keep rendering calibrated
across OS emoji stacks.

## Focus + accessibility

- Skip link (`.skip-link` → `#main-content`) is the first focusable
  element on the page; `:focus-visible` styles reveal it as a branded
  chip.
- `focus-visible` is specifically styled across `button`, `input`,
  `select`, `textarea`, `a`, `summary`, `[role="button"]`. Keyboard-only
  users see a 2 px outline in `--accent`.
- Live regions on `#dashboard-remaining`, `#qa-ai-status`, toast
  container, camera status, day-note counter, pantry status, menu-scan
  status, a-estimate (activity form). See `B7.2` commit for audit.

## What this design system is NOT

- A component library with variants (`<Button primary>`, `<Button
  secondary>`). There's CSS + HTML; no framework.
- A responsive grid system. Layout is hand-tuned per-component with CSS
  grid / flex as needed.
- Versioned independently of the code. The tokens live in `styles.css`;
  changing one ships with the next web deploy.

## Competitive positioning (v2, post-§DCP)

**Occupied quadrant:** *Warm × Data-dense.* Rivals cluster at
Clinical-dense (Cronometer), Warm-curated (Yuka), or neutral
(MyFitnessPal). The warm-dense quadrant is the "scientist's
notebook at a farmer's market" territory — coral paper,
tabular numerics, emoji-per-feature, grade-pattern overlay.
No direct competitor plants a flag here.

## Character brief (v2, post-§DP)

Canonical character statement. Every design decision filters through
this — either reinforces or contradicts what it says.

> **This app's design reads as a warm, precise food ledger.**
> The strongest expression is the coral-paper + cream-card two-tone
> with tabular numerics and diverging-scale grade badges.
> It should never feel clinical, corporate, or "premium glass" —
> which currently happens when a dialog's frosted-glass blur
> overtakes the paper metaphor.

**Voice:** warm + casual + moderately expressive. Sage (trustworthy
guidance) + Caregiver (soft, unhurried) + Lover tertiary
(sensory, food-warm).

**Space:** dense-but-paced, flat-with-lift, rigid token grid. Every
vertical rhythm reads from `--sp-5` (20px) at the section level.

**Material:** Paper dominant — cream panels, 2% grain overlay, shadow
cast from a fixed overhead light. Light tertiary — the grade palette
glow from `--grade-*` tokens. Glass demoted: dialogs read as "paper
cover with a tint", not frosted iOS sheets.

**Interaction:** snappy (`--motion-base 140ms`) + physical press
(`scale(0.96)` on touchable chrome) + expressive on opt-in signature
moments only (grade-chip-reveal, listening/scanning pulse loops).

**States:** paper-on-notebook treatment is consistent across empty
(dashed paper tile) / loading (skeleton pulse) / success (`ok`
toast) / error (`warn` toast with `--danger`).

### Character tests (decision filters)

- ✓ **On character** — a new surface uses `--panel` or `--panel-2`
  (both already warm/cream), with `--elev-1` neutral OR
  `--elev-1-tonal` coral shadow. One grain-compatible texture at
  ≤ 3% opacity is acceptable.
- ✗ **Off character** — a new surface uses pure `#ffffff`, pure
  `#000000`, or a chromatic non-coral gradient. Reject.
- ✓ **On character** — a new interaction finishes in ≤ 220ms with
  a single easing (`--ease-ui`).
- ✗ **Off character** — a custom easing, bounce physics, or a
  transition > 400ms. Reject.
- ✓ **On character** — type values come from `--text-xs..3xl`.
- ✗ **Off character** — ad-hoc `font-size: 0.92em`. Reject; add to
  scale if the size genuinely recurs.

### Protect (character already expressed correctly)

- Coral `--bg` + `--bg-deep` gradient.
- Cream `--panel` (`#FFFDF7` light / `#1B1B1F` dark).
- Grade badge pattern overlays across `.grade`, `.recent-grade`,
  `.compare-grade`, `.recipe-row-grade`, `.recipe-edit-grade`.
- Atkinson Hyperlegible + tabular-nums on numerics.
- Emoji-per-feature signature.
- 2% paper-grain overlay.

### Reject (belongs to a different product)

- Frosted-glass cards (Apple sheet / iOS premium).
- Neon accents (Discord, Linear, gaming).
- Thick uppercase tracking on body text (fintech).
- Serif editorial headlines (news / longform).
- Monospace body type (dev tool / terminal).

---

## Rules for adding a token

1. The new style actually recurs in ≥ 3 places. One-offs don't need a
   token.
2. Name it with the existing prefixes: `--r-*` radius, `--sp-*` space,
   `--grade-*` score band, otherwise semantic name.
3. Test both themes. A value that looks great on dark but breaks contrast
   on light is not shippable.
4. WCAG AA (4.5:1 text on background, 3:1 large text / UI) for any
   foreground/background pair introduced.
