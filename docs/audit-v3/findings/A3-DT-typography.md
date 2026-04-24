# Audit — §DT Typography

**Block:** A Foundation
**Dimension:** §DT (Personality Matrix, Scale/Rhythm, Craft Signals, Voice)
**Date:** 2026-04-24

---

## F-DT-01 · [HIGH] [CONFIRMED] · Render-blocking Google Fonts `@import` in CSS

**Location:** `public/styles.css:6`
```css
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Lexend:wght@400;500;600;700&display=swap');
```

**Evidence:**
- CSS `@import` is a render-blocking waterfall: browser parses `styles.css` → sees `@import` → opens a second network connection → parses the imported stylesheet → *only then* unblocks layout.
- `index.html` has `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`, which is correct — but a `preconnect` to the CSS host doesn't help when the font stylesheet is discovered from inside another stylesheet (waterfall).
- Six font-weight variants loaded: Atkinson 400, 400i, 700, 700i + Lexend 400, 500, 600, 700 = 8 files.

**Impact:**
- First interactive delays by the round-trip to Google Fonts CSS + the font-file downloads. On a $200 Android + 3G (the PRD non-functional-requirement target), this is 300–800 ms added to first paint.
- Flash of Unstyled Text ("FOUT") is partially mitigated by `display=swap` — but the imported rules arrive late, so early paint is in system-ui before snap-in.
- Fails the PRD's "first interactive < 3 s on 4G on $200 Android" target on cold loads when Google Fonts is slow/unreachable.

**Recommendation:**
Two-step plan:
1. **Move font `<link>` into `index.html`** so discovery happens on the initial HTML parse, not a CSS waterfall. Delete the `@import` line from CSS.
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:..." />
   ```
2. **Slim the font set** (separate commit): Atkinson italic variants (400i, 700i) — verify they're actually used. Lexend 500 + 600 — check if those weights appear in CSS. `font-weight` distribution is: `900×1, 700×70, 600×41, 500×19`. Two of the six loaded weights (Atkinson italic, Lexend 500) are likely unused or barely used → drop them and the bundle shrinks by ~40%.
3. **Self-host** (separate decision): `fonts.gstatic.com` is a third-party CDN; for a privacy-first app, self-hosting via `@font-face` + subsetting is the honest default (see `PRIVACY.md`).

**Effort:** Small (step 1 is 2 lines moved). Medium for full pipeline.
**Risk:** Low — moving `<link>` earlier is strictly faster.
**Preserves features:** Yes.

---

## F-DT-02 · [MEDIUM] [CONFIRMED] · 11 distinct line-height values — no documented rhythm

**Location:** `public/styles.css`, 42 `line-height` declarations spread across 11 values:
`1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6`.

**Evidence:**
Top 5 counts: `1.5` (9×), `1.4` (8×), `1` (8×), `1.55` (3×), `1.45` (3×).
No `--lh-*` tokens exist. No documented mapping of line-height to purpose in `docs/design-system.md`.

**Impact:**
- Vertical rhythm drifts across cards — a user scrolling the dashboard sees rows that don't align to a consistent baseline.
- 11 values bloat the cognitive surface: a contributor picking a line-height has no default to reach for.

**Recommendation:**
Introduce 4 tokens (standard typography triad + display):
```css
--lh-tight:    1;      /* display numerics, grade badge */
--lh-snug:     1.25;   /* headings, chip text */
--lh-base:     1.5;    /* body, paragraphs */
--lh-loose:    1.6;    /* long-form copy, notes */
```
Migrate the 42 uses → 4 tokens. Off-scale values (1.15, 1.35, 1.45, 1.55) get rounded to the nearest token.

**Effort:** Medium.
**Risk:** Low — visual drift within ±0.1 per affected block is imperceptible.
**Preserves features:** Yes.

---

## F-DT-03 · [MEDIUM] [CONFIRMED] · 10 distinct letter-spacing values, no documented tracking rule

**Location:** 39 `letter-spacing` declarations across 10 values:
`-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.04, 0.06, 0.08, 0.1 em` plus one anomaly `2px`.

**Evidence:**
Top: `0.08em` (9×), `0.06em` (8×) — these match the small-caps pattern documented in `design-system.md §Typography` ("small caps labels: 0.08em").
`2px` at line 6524 is an absolute value — doesn't scale with font-size, inconsistent with the em-based system.
No `--tracking-*` tokens.

**Impact:** Similar to F-DT-02 — no principled "which tracking for which size" rule.

**Recommendation:**
Introduce 5 tokens:
```css
--tracking-tight:  -0.02em;   /* --text-xl, --text-2xl display */
--tracking-snug:   -0.01em;   /* --text-lg headings */
--tracking-base:    0;        /* --text-base body */
--tracking-wide:    0.02em;   /* --text-sm secondary */
--tracking-caps:    0.08em;   /* uppercase small caps */
```
Replace `letter-spacing: 2px` at line 6524 with the nearest em-based token.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DT-04 · [LOW] [CONFIRMED] · `font-weight: 900` outlier at pillar veto row

**Location:** `public/styles.css:2056`
```css
.pa-row.veto-row .pa-points { color: var(--danger); font-weight: 900; }
```

**Evidence:**
Only one `font-weight: 900` declaration in the codebase; the Google Fonts @import requests weights 400, 500, 600, 700 but **not 900**. Browser will synthesize (artificially bold) 900 from 700 — the synthesized result is visually heavier but lacks Atkinson Hyperlegible's hand-tuned 900 letterforms (which aren't shipped).

**Impact:**
- Visual inconsistency: the "veto" pillar row is heavier than any other emphasised text in the app.
- On browsers that refuse synthesis (rare; mobile webviews sometimes), falls back to 700 — breaking the intended emphasis.

**Recommendation:**
Drop to `font-weight: 700` — matches every other strong emphasis in the codebase. Add `text-transform: uppercase` + `letter-spacing: 0.06em` if the veto needs extra visual weight. One line changed.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DT-05 · [LOW] [CONFIRMED] · Monospace font stack used in 2 sites, not tokenized

**Location:**
- `public/styles.css:2551` — `.app-toast-action` (small inline), `ui-monospace, SFMono-Regular, Menlo, monospace`.
- `public/styles.css:4021` — `textarea` (progress dialog CSV export), same stack.

**Evidence:**
Two sites declare identical `font-family: ui-monospace, SFMono-Regular, Menlo, monospace`. No `--font-mono` token.

**Impact:**
Minor. But design-system.md doesn't acknowledge any monospace use — a third contributor will either add a fresh stack or reach for `inherit` and get the body font.

**Recommendation:**
Add token:
```css
--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
```
Two sites migrate. Document the mono usage in `design-system.md` (for data export blocks, numeric alignments where tabular-nums alone isn't enough).

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DT-06 · [MEDIUM] [CONFIRMED] · Design-system.md typography table is stale

**Location:** `docs/design-system.md §Typography (Scale v2)`.

**Evidence:**
The doc claims v2 scale values:
- `--text-sm: 0.85rem`, `--text-xl: 1.5rem`, `--text-2xl: 2rem`.

Actual current values from inventory 02:
- `--text-sm: 0.87rem` (bumped from 0.85)
- `--text-xl: 1.44rem` (down from 1.5)
- `--text-2xl: 1.73rem` (down from 2.0)
- Plus `--text-3xl: 2.07rem` — added but with **0 references** (cross-ref F-DTA-01).

The doc also says "Font stack: system UI primary with an optional `--font-lexend` opt-in" — but `--font-lexend` is not a declared token in current CSS; Lexend is loaded via Google Fonts import and selected via `.font-lexend` body class.

**Impact:** Same class as F-DTA-04 — docs contradict code; contributors follow the wrong numbers.

**Recommendation:**
Merge into the single regen script proposed in F-DTA-04 — the same generator that emits the token table can emit the typography scale from source. One commit regenerates both.

**Effort:** Small (shared script).
**Risk:** None.
**Preserves features:** N/A.

---

## F-DT-07 · [MEDIUM] [CONFIRMED] · OpenType `--type-feat` and `--num-feat` tokens exist but inconsistently applied

**Location:**
- Tokens defined: `--type-feat: "kern" 1, "liga" 1, "calt" 1;` and `--num-feat: "tnum", "lnum";`.
- Usage: `body { font-variant-numeric: var(--num-feat); }` — works for numerics globally.
- `--type-feat` — grep shows it applied on `body` but not selectively. Kerning, ligatures, and contextual alternates are ON across every text surface.

**Evidence:**
Grade badge explicitly sets `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1;` (line 3727) — this duplicates the body-level setting. Same duplication at `.score` (line 3746).

**Impact:**
- Duplicated declarations = drift risk when the global token updates.
- Kerning on body at 14–16px is imperceptible but harmless; on 32px display it matters. Fine as-is.

**Recommendation:**
Remove the duplicated `font-variant-numeric` + `font-feature-settings` on `.grade` and `.score` — `body` already sets them. Two commits (or one sweep).

Audit contributor comment block reinforcing: *"Numerics and OT features are set at `body` level via `--num-feat` + `--type-feat`. Don't re-declare per component."*

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## Dimension scorecard — §DT
| Metric | Value |
|---|---|
| Findings | 7 (HIGH×1, MEDIUM×4, LOW×2) |
| CRITICAL | 0 |
| Quickest win | F-DT-04 (weight 900 → 700, one line) |
| Highest impact | F-DT-01 (font-loading waterfall — affects first-paint on every device) |
| Systemic follow-up | F-DT-06 shares a regen script with F-DTA-04 |
