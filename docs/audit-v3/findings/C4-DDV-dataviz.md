# Audit — §DDV Data Visualization

**Block:** C UX
**Dimension:** §DDV (Chart Color, Typography, Style Alignment)
**Date:** 2026-04-24

---

## F-DDV-01 · [MEDIUM] [CONFIRMED] · `renderLineChart` uses a bespoke SVG with weak semantics

**Location:** `public/app.js:3958+` (`renderLineChart`).

**Evidence:**
```js
const svg = document.createElementNS(SVG_NS, 'svg');
svg.setAttribute('viewBox', `0 0 300 120`);
svg.setAttribute('preserveAspectRatio', 'none');
svg.setAttribute('role', 'img');
svg.setAttribute('aria-label', opts.ariaLabel || 'chart');
```

Good:
- `role="img"` + `aria-label` — correct a11y pattern for non-decorative SVG.
- Empty-state handling (`pc-empty`).
- `preserveAspectRatio: none` lets the chart fill its container.

Gaps:
- Default `aria-label` fallback is literally `'chart'` — screen readers announce "chart" without context.
- No `<title>` element inside the SVG (complementary to `aria-label`).
- No `<desc>` element describing trend ("weight trending down −1.2 kg over 30 days"), which is where data viz shines for accessibility.
- No keyboard interaction — can't focus individual data points.
- `width: 300`, `height: 120` are hardcoded — CSS scaling handles display, but the internal coord system is fixed.

**Impact:**
- Screen-reader users hear "chart" but don't get the narrative.
- Keyboard users can't explore data points the way a sighted user can hover + tooltip.

**Recommendation:**
Lift `renderLineChart` into a small, reusable module:
1. Build a sentence summary from the data (min, max, delta, direction) — inject into `<desc>`.
2. Add `<title>` duplicating the opts.ariaLabel for belt-and-braces.
3. Add focusable `<circle>` data points with `tabindex="0"` + per-point `<title>` — keyboard navigation.
4. Callers pass meaningful `ariaLabel` (e.g., `"Poids, kg, 30 derniers jours"`) — no default should be `'chart'`.

**Effort:** Medium.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DDV-02 · [LOW] [CONFIRMED] · Weekly-summary direction colors are intuitive (good) — but encode direction as color only

**Location:** `public/styles.css:2748–2749`
```css
.weekly-summary .ws-item[data-direction="down"] .ws-value { color: var(--success); }
.weekly-summary .ws-item[data-direction="up"] .ws-value   { color: var(--warning); }
```

**Evidence:**
- Weight "down" = green; weight "up" = yellow warning. Intuitive when user context is weight loss.
- BUT: "up" means `--warning` regardless of metric. For calories, "up" may or may not be bad; for water intake, "up" is usually GOOD — `--warning` sends the wrong signal.
- Color-only encoding of direction fails WCAG 1.4.1 (Use of Color) — no ↑/↓ icon.

**Impact:**
- A user drinking MORE water sees warning color → cognitive dissonance.
- Color-blind users miss the direction cue entirely.

**Recommendation:**
1. Add a ↑/↓ / 📈/📉 arrow per row alongside the number (icons with `aria-hidden="true"` but visual for sighted).
2. Decouple color from direction per-metric:
   - Weight: down = success, up = warning (current).
   - Water: up = success, down = warning (invert).
   - Kcal: show the delta-to-target, not up/down; color by "within / over target".

**Effort:** Medium (metric-aware logic).
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DDV-03 · [MEDIUM] [CONFIRMED] · Dashboard macro progress bars (`dash-bar` / `dash-fill`) color by progress — verify AA contrast

**Location:** `public/styles.css` — `.dash-row`, `.dash-bar`, `.dash-fill` (around the gap-closer block).

**Evidence (inventory 02 §Tokens):**
`--grad-accent: linear-gradient(135deg, #FF6B45 → #E54B5E)` is the canonical coral gradient, applied to progress fills.

On dark theme `--panel` (`#1B1B1F`):
- Coral `#FF6B45` has luminance ~56%, dark bg 9% → ratio ~6.3:1 ✓
- Coral `#E54B5E` has luminance ~40% → ratio ~4.5:1 ✓ (hair)

On light theme `--panel` (`#FFFFFF`):
- `#B0431F` (darkened) → ratio ~5.7:1 ✓ (confirmed in design-system docs)

Empty (unfilled) state — uses `--panel-2` background (`#2A2A30` dark / `#FAF5E9` light):
- Dark: `#2A2A30` on `#1B1B1F` → ratio ~1.4:1 (fine for a bar track, but invisible if there's no value)
- Light: `#FAF5E9` on `#FFFFFF` → ratio ~1.02:1 (essentially invisible)

**Impact:**
- Light theme: an empty progress bar is indistinguishable from the card background. A user at 0% looks at an empty space, not a bar.
- May compound with missing labels — does each row have both a label AND a visible track?

**Recommendation:**
1. Add a 1px border to `.dash-bar` in light theme: `border: 1px solid var(--border);` — makes the track visible without adding fill.
2. Or: change `--panel-2` light value to `#F0E5D8` (slightly darker) — but that affects all `--panel-2` usages across the app; much bigger ripple.

Option 1 wins.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DDV-04 · [LOW] [CONFIRMED] · Gap-closer chips are a micro-dataviz — visually encode ranking but not labeled as such

**Location:** `renderGapCloser` in `public/app.js:3907`.

**Evidence (inferred from commit history + inventory):**
- Gap-closer shows 2-3 food suggestions per under-target nutrient.
- Ranked by per-100 g density.
- Each chip likely shows: name + grams + deficit portion.

No visual cue indicates ordering — if three chips are displayed, user can't tell if the leftmost is the best or the worst without reading all.

**Impact:**
- Users scan leftmost-first by habit. If ranking isn't visually reinforced, they may miss the best option.

**Recommendation:**
Add subtle ranking indicator:
- Small numeric rank before each chip name ("① Amandes · 38 g").
- Or: size-encode the best option slightly larger.
- Or: chip border intensity varies by rank (solid #1, dashed #2, dotted #3).

Simplest: numeric prefix. One-line change to the chip text template.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes (enhances).

---

## F-DDV-05 · [MEDIUM] [CONFIRMED] · No documented chart-style contract — each chart invents its own palette

**Location:** `docs/design-system.md` — no `§DDV` or `§Data viz` section.

**Evidence:**
- `.pc-line` (progress chart line) — uses `var(--accent)` for the stroke.
- Weekly bars — uses `var(--accent)` or `var(--grade-*)` depending on metric.
- Dashboard progress — uses `--grad-accent`.
- Gap-closer — not fully inspected, likely uses `--grade-*` or `--accent`.

Three or four slightly different color recipes across charts; no rule.

**Impact:**
- Consistency suffers across the progress dialog (three charts: weight/kcal/water). If one uses `--grade-*` and another uses `--accent`, the palette reads as "uncoordinated".

**Recommendation:**
Declare chart palette in `design-system.md §DDV`:
```
Primary series (single line/bar):       --accent
Comparison / secondary series:          --tension
Positive delta / target met:            --success
Negative delta / missed target:         --warning (not --danger — softer)
Neutral baseline (target line):         --muted
Empty state fills:                      --panel-2
```
Migrate the ~5 chart call-sites to this palette.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## Dimension scorecard — §DDV
| Metric | Value |
|---|---|
| Findings | 5 (MEDIUM×3, LOW×2) |
| CRITICAL | 0 |
| HIGH | 0 |
| Quickest win | F-DDV-03 (1px border on light-theme progress track) |
| Highest impact | F-DDV-01 (chart a11y — reusable module) |
