# Audit — §DSA Surface & Atmosphere

**Block:** B Structure
**Dimension:** §DSA (Background, Elevation, Atmospheric Signals, Light Physics)
**Date:** 2026-04-24

---

## F-DSA-01 · [LOW] [CONFIRMED] · Paper-grain overlay is implemented correctly — protect it

**Location:** `public/styles.css:4686–4710`.

**Evidence:**
```css
body::before {
  content: ""; position: fixed; inset: 0; z-index: 0;
  pointer-events: none; opacity: 0.025;
  background-image: url("data:image/svg+xml;utf8,<svg…feTurbulence…>");
  background-size: 180px 180px;
  mix-blend-mode: overlay;
}
body.reduce-motion::before { display: none; }
@media (prefers-reduced-transparency: reduce) { body::before { display: none; } }
```
Good craft:
- 2% opacity (design-system.md spec).
- Inline SVG noise → no extra HTTP request.
- Respects both app-level `body.reduce-motion` AND OS `prefers-reduced-transparency`.
- `mix-blend-mode: overlay` unifies the grain with the underlying coral gradient.

**Impact:** This is a signature detail (character brief: "paper dominant — 2% grain overlay"). Protect it.

**Recommendation:**
- Document in `design-system.md §Surface` as a **protected** element (per art-direction-engine §SIGNATURE).
- Add to the token-regen script proposed in F-DTA-04: the noise-overlay SVG should be kept inline in the stylesheet (not refactored to a separate file — inline-data is the whole point).

**Effort:** Trivial (doc).
**Risk:** None.
**Preserves features:** Yes — documents a strength.

---

## F-DSA-02 · [MEDIUM] [CONFIRMED] · Three elevation tokens defined, `--elev-3` only 2 refs

**Location:** `public/styles.css` — elevation tokens at lines 4180–4199.

**Evidence:**
| Token | Refs | Declared values |
|---|---|---|
| `--elev-1` | 20 | Dark: `0 1px 3px, 0 4px 12px` rgba. Light: lighter values. |
| `--elev-1-tonal` | 14 | Same shape, coral-hued shadows. |
| `--elev-2` | 10 | Hover/active state lift. |
| `--elev-3` | 2 | Declared but barely used. |

**Impact:**
- `--elev-3` exists as a "deepest" step but only 2 components honor it — that's not a system, that's an almost-dead token.
- The "one extra step of elevation" semantic never took root. If it's meant to be "modal overlay", then modals aren't using it.

**Recommendation:**
Two options:
- **A (adopt):** Migrate `dialog` ::backdrop + the raised active-card state to `--elev-3`. Gives the token a real job.
- **B (delete):** If `--elev-2` already covers the hover + active + raised cases, delete `--elev-3`. 2 line changes.

Pick A — modals carry naturally heavier shadows; giving them the token is cheap. After migration, grep should show `--elev-3` with 4+ refs.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DSA-03 · [MEDIUM] [CONFIRMED] · 10 `backdrop-filter` sites with inconsistent blur amounts

**Location:** `public/styles.css` — 10 usages.

**Evidence:**
One usage documented at line 4738 — the dialog `::backdrop` bumped from `blur(6px)` to `blur(12px)` per skill §DDT1 ("below 12px reads as 'slightly frosted'"). Good craft.

But the other 9 usages haven't been unified. Without a `--blur-glass` token reference point, subsequent contributors will pick different px values; the design becomes "sometimes glassy, sometimes not".

Inventory 02 notes `--blur-glass` token exists. Let me check adoption:
- Grep `var(--blur-glass)` — need to verify.

**Impact:**
- Inconsistent glassmorphism intensity across modals, bottom sheets, floating chrome.
- Character brief says "glass is demoted — paper is dominant". If glass leaks back in via inconsistent backdrop-filter, the paper metaphor erodes.

**Recommendation:**
1. Audit the 10 sites: replace literal `blur(Npx)` with `var(--blur-glass)` where a token reference exists.
2. Delete any glass that isn't intentional per character brief (sticky headers, toast, camera dialog overlay).
3. Reserve `backdrop-filter` strictly for the dialog `::backdrop` scrim — everything else should use `--panel` / `--panel-2` with the 2% paper grain showing through.

**Effort:** Small-Medium.
**Risk:** Low–Medium (visual change possible).
**Preserves features:** Yes.

---

## F-DSA-04 · [LOW] [CONFIRMED] · Body background gradient is documented, verify direction

**Location:** `public/styles.css:4203–4208`.

**Evidence:**
```css
body {
  background: linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
  ...
}
```
- Top-to-bottom coral gradient, honoring character brief (§BACKDROP).
- `--bg` at top, `--bg-deep` at bottom.

**Impact:**
This gives the page a subtle vertical depth — content feels "held" by a warmer base. Good.

**Recommendation:**
Two minor notes:
1. On very tall scrolling dashboards, the gradient sits fixed to the viewport (default `background` behaviour is repeat-on-scroll). Consider `background-attachment: fixed` so the gradient feels like a paper backdrop, not a repeating pattern. One line.
2. For `prefers-reduced-motion`, flatten to `var(--bg)` flat (doc already notes this "Reduce-motion users still see the static version" — verify it's actually implemented).

**Effort:** Trivial.
**Risk:** Low (fixed attachment on mobile has GPU cost; test on mid-range phone).
**Preserves features:** Yes.

---

## F-DSA-05 · [MEDIUM] [CONFIRMED] · Dialog `::backdrop` scrim + `prefers-reduced-transparency` — good, generalise

**Location:** `public/styles.css:4682–4684`, `4738–4742`.

**Evidence:**
```css
dialog::backdrop { backdrop-filter: blur(12px); /* + scrim gradient */ }
@media (prefers-reduced-motion: reduce) {
  dialog::backdrop { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (prefers-reduced-transparency: reduce) {
  body::before { display: none; }
}
```
Dialog backdrop is blurry by default, reduce-motion kills the blur, reduce-transparency kills the paper grain.

**Impact:**
- Fine for dialogs. But `prefers-reduced-transparency` isn't queried for `.app-toast`, camera overlay, floating chrome — those could also be transparency-heavy.

**Recommendation:**
Grep every backdrop-filter / rgba() ≥ 0.5 alpha / translucent element. Audit whether each should honor `prefers-reduced-transparency: reduce` by falling back to an opaque surface. Likely candidates: `.app-toast` transparent-ish bg, camera-dialog overlay, `#install-banner` (if it uses any translucent layer).

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes (tightens a11y).

---

## Dimension scorecard — §DSA
| Metric | Value |
|---|---|
| Findings | 5 (MEDIUM×3, LOW×2) |
| CRITICAL | 0 |
| HIGH | 0 |
| Documented strength | F-DSA-01 (paper grain is correctly crafted) |
| Quickest win | F-DSA-01 (doc only) |
| Highest impact | F-DSA-03 (backdrop-filter consistency) |
