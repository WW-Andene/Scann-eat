# Design system

Scann-eat's visual language is a token set + a small component vocabulary,
defined entirely in `public/styles.css`. There's no Figma file and no
framework; the CSS IS the design system.

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

- Font stack: system UI primary with an optional `--font-lexend` opt-in
  (body can carry `.font-lexend` class — toggled from Settings).
- Two size modifiers on `<body>`: `.font-size-large` (20px) and
  `.font-size-xlarge` (22px). Default inherits from the browser.
- No custom web fonts shipped — first paint stays under the performance
  budget that was informally set as "no layout shift visible on 4G".

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

## Rules for adding a token

1. The new style actually recurs in ≥ 3 places. One-offs don't need a
   token.
2. Name it with the existing prefixes: `--r-*` radius, `--sp-*` space,
   `--grade-*` score band, otherwise semantic name.
3. Test both themes. A value that looks great on dark but breaks contrast
   on light is not shippable.
4. WCAG AA (4.5:1 text on background, 3:1 large text / UI) for any
   foreground/background pair introduced.
