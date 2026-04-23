# Design system

Scann-eat's visual language is a token set + a small component vocabulary,
defined entirely in `public/styles.css`. There's no Figma file and no
framework; the CSS IS the design system.

**v2 refinement landed 2026-04.** See `docs/ui-ux-audit-v2.md` for the
findings that drove it. Key additions: explicit typography scale,
elevation tokens, calmer coral backdrop, unified dialog chrome, scaled
focus ring, shared motion speed.

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

Defined as CSS custom properties on `[data-theme="dark"]` (default) and
`[data-theme="light"]`. 53 tokens total. Theme switching flips the
`data-theme` attribute on `<html>`; every downstream rule reads the same
variable name.

### Background + surface

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#F54B5E` vibrant coral | `#F8C8CF` pale coral paper | Page background behind cards |
| `--panel` | `#1B1B1F` near-black | `#FFFFFF` | Card surfaces |
| `--panel-2` | `#2A2A30` | `#FAF5E9` | Nested card / input background |
| `--panel-3` | `#3A3A42` | `#EFE9DB` | Hover / deeper nesting |

### Text

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--text` | `#F5F0E8` cream | `#1B1B1F` near-black | Text on `--panel` / `--panel-2` |
| `--text-on-bg` | `#1B1B1F` | `#1B1B1F` | Text placed directly on `--bg` |
| `--muted` | `#9A948B` | `#5B564A` | Secondary text, hints |
| `--muted-on-bg` | `rgba(27, 27, 31, 0.65)` | same | Muted text on `--bg` |

### Accent + state

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--accent` | `#FF6B45` orange | `#B0431F` | Primary button / CTA |
| `--accent-dim` | `#D15637` | `#8A3316` | Accent hover / pressed |
| `--accent-ink` | `#1B1B1F` | `#FFFFFF` | Text drawn on `--accent` |
| `--danger` | `#E54B5E` | (inherits) | Destructive actions, veto states |
| `--success` | `#6BE584` | (inherits) | Confirmations, good scores |
| `--warning` | `#F5A64B` | (inherits) | Caution, moderate issues |

### Grade palette (A+ → F, score chips)

`--grade-aplus` `#6BE584` · `--grade-a` `#A3E067` · `--grade-b` `#F5D651` ·
`--grade-c` `#F5A64B` · `--grade-d` `#F56E4B` · `--grade-f` `#E54B5E`.

A diverging scale from green to red, intentionally more than 5 stops so
the step between C and D is visually distinct (the scoring engine
often decides between those two).

### Radii

`--r-xs` 8 · `--r-sm` 12 · `--r-md` 18 · `--r-lg` 24 · `--r-xl` 32 · `--r-pill` 999.

Cards use `--r-md` · buttons use `--r-pill` by default · full-screen
dialogs use `--r-lg` on the top edges where they hang off the bottom of
the viewport.

### Spacing scale

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 ·
`--sp-7` 32 · `--sp-8` 48.

All paddings, gaps, and margins reference this scale. No ad-hoc
`padding: 14px`; if you're reaching for one, it's either a bug or a new
token.

### Borders + inputs

`--border` (low-contrast line, typical dividers) · `--border-strong`
(when a divider needs to read against a dim background) · `--input-bg`
(distinguishable from the card surface so inputs don't blend in on
`--panel-2` contexts) · `--on-muted` (text drawn on muted chips).

## Theme switching

The lang / theme settings map to `<html data-theme="dark|light">`. A
third option ("auto") watches `prefers-color-scheme` via
`matchMedia('(prefers-color-scheme: light)')` and applies `dark` or
`light` accordingly. See `public/app.js:applyTheme`.

## Typography

### Scale (v2)

| Token | Size | Use |
|---|---|---|
| `--text-xs`   | 0.72rem (≈11.5px) | metadata, counters, timestamps |
| `--text-sm`   | 0.85rem (≈13.6px) | secondary labels, chips |
| `--text-base` | 1rem (16px)       | body default |
| `--text-lg`   | 1.15rem (≈18.4px) | card headings |
| `--text-xl`   | 1.5rem (24px)     | dashboard numerics |
| `--text-2xl`  | 2rem (32px)       | scan grade, big numbers |

### Numerics
`--num-feat: "tnum", "lnum"` is set on `body`. Every dashboard /
summary / macro / score value inherits tabular-nums automatically;
columns align without custom `font-variant-numeric` rules per site.

### Letter-spacing rule of thumb
- Display sizes (`--text-xl`/`--text-2xl`): `-0.02em`.
- Small caps labels (uppercase section headers): `0.08em`.
- Everything else: default (no manual tracking).

### Fonts
- Font stack: system UI primary with an optional `--font-lexend` opt-in
  (body can carry `.font-lexend` class — toggled from Settings).
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
