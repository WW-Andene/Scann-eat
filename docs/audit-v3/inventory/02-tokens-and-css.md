# Design Tokens & CSS Inventory (02)

**Source:** `public/styles.css` (7360 lines, 226 KB)
**Date:** 2026-04-24
**Method:** Direct grep + targeted Read. Facts only, no judgement.

---

## 1. Token catalogue (88 unique CSS custom properties across 6 `:root/[data-theme]` blocks)

Five blocks define tokens, spanning lines 12–13, 81, 4170–4196, 4409–4494, 4478–4494, 4529–4531, 4576+. Theme switching toggles `data-theme` on `<html>`; most tokens are defined once in the shared `:root, [data-theme="dark"]` block with `[data-theme="light"]` overrides.

### 1.1 Background / surface
| Token | Dark | Light | Notes |
|---|---|---|---|
| `--bg` | `#E84A5F` | `#F6D0D6` | Refined from docs (`#F54B5E` / `#F8C8CF`) — docs/design-system.md is stale |
| `--bg-deep` | `#D94458` | `#F0B7BF` | For gradient sweeps; not in docs |
| `--panel` | `#1B1B1F` | `#FFFFFF` | Card surface |
| `--panel-2` | `#2A2A30` | `#FAF5E9` | Nested/input bg |
| `--panel-3` | `#3A3A42` | `#EFE9DB` | Hover / deeper |
| `--surface-hover` | `#242429` | `#FFFDF7` | **Defined, zero references** |
| `--surface-pressed` | `#2D2D33` | `#F5EFDF` | **Defined, zero references** |

### 1.2 Text
| Token | Dark | Light |
|---|---|---|
| `--text` | `#F5F0E8` | `#1B1B1F` |
| `--text-on-bg` | `#1B1B1F` | `#1B1B1F` |
| `--muted` | `#9A948B` | `#5B564A` |
| `--muted-on-bg` | `rgba(27,27,31,0.65)` | same |
| `--on-muted` | `#1B1B1F` | `#1B1B1F` |
| `--text-disabled` | `rgba(245,240,232,0.38)` | `rgba(27,27,31,0.38)` |

### 1.3 Accent / state
| Token | Dark | Light | Notes |
|---|---|---|---|
| `--accent` | `#FF6B45` | `#B0431F` | Light darkened to pass WCAG AA 5.7:1 |
| `--accent-dim` | `#D15637` | `#8A3316` | Hover / pressed legacy |
| `--accent-ink` | `#1B1B1F` | `#FFFFFF` | Text on accent |
| `--accent-warm` | `#E8B76B` | `#B0761E` | Informational chips |
| `--accent-hover` | `#FF8867` | `#C94D25` | Hover state (fine-grained) |
| `--accent-pressed` | → `--accent-dim` | → `--accent-dim` | Alias |
| `--accent-focus` | `#FF7E5F` | `#B0431F` | Focus ring color |
| `--grad-accent` | `linear-gradient(135deg, #FF6B45 → #E54B5E)` | `linear-gradient(135deg, #B0431F → #8E2C3F)` | **The canonical signature gradient** |
| `--grad-accent-dim` | dimmer variant | dimmer variant | |
| `--grad-accent-soft` | rgba-muted variant | rgba-muted variant | |
| `--danger` | `#E54B5E` | inherits | |
| `--success` | `#6BE584` | inherits | |
| `--warning` | `#F5A64B` | inherits | |
| `--tension` | `#2FC7B2` teal | `#0F8F7E` | Counter-accent, AA-safe on panel |
| `--tension-ink` | `#0F2B28` | `#FFFFFF` | |

### 1.4 Grade palette (A+ → F)
| Token | Value (shared) |
|---|---|
| `--grade-aplus` | `#6BE584` |
| `--grade-a` | `#A3E067` |
| `--grade-b` | `#F5D651` |
| `--grade-c` | `#F5A64B` |
| `--grade-d` | `#F56E4B` |
| `--grade-f` | `#E54B5E` |
(See inventory 05 for contrast analysis — all 6 fail WCAG AA on `#FFFFFF` light panel.)

### 1.5 Radii (7 generic + 6 purpose-named)
| Token | Value | Used? |
|---|---|---|
| `--r-xs` | 8px | yes |
| `--r-sm` | 12px | yes |
| `--r-md` | 18px | yes |
| `--r-lg` | 24px | yes |
| `--r-xl` | 32px | yes |
| `--r-pill` | 999px | yes (heaviest) |
| `--r-btn` | (defined separately) | **0 refs** |
| `--r-card` | (defined separately) | **0 refs** |
| `--r-badge` | (defined separately) | **0 refs** |
| `--r-modal` | (defined separately) | **0 refs** |
| `--r-modal-lg` | (defined separately) | 1 ref |
| `--r-input` | (defined separately) | 1 ref |

### 1.6 Spacing scale
| Token | Value | Used? |
|---|---|---|
| `--sp-1` | 4px | yes |
| `--sp-2` | 8px | yes |
| `--sp-3` | 12px | yes |
| `--sp-4` | 16px | yes |
| `--sp-5` | 20px | yes |
| `--sp-6` | 24px | yes |
| `--sp-7` | 32px | yes |
| `--sp-8` | 48px | **0 refs** |

### 1.7 Typography
| Token | Value (v2) | Notes |
|---|---|---|
| `--text-xs` | `0.72rem` (11.5 px) | |
| `--text-sm` | `0.87rem` (13.9 px) | bumped from 0.85 |
| `--text-base` | `1rem` (16 px) | |
| `--text-lg` | `1.2rem` (19.2 px) | bumped from 1.15 |
| `--text-xl` | `1.44rem` (23 px) | down from 1.5 |
| `--text-2xl` | `1.73rem` (27.7 px) | down from 2.0 |
| `--text-3xl` | `2.07rem` (33.2 px) | **Added but 0 refs** |
| `--num-feat` | `"tnum","lnum"` | Tabular-nums feature |
| `--type-feat` | `"kern" 1,"liga" 1,"calt" 1` | OpenType features |

### 1.8 Elevation
| Token | Dark | Light |
|---|---|---|
| `--elev-1` | `0 1px 3px rgba(30,18,22,0.10), 0 4px 12px rgba(30,18,22,0.08)` | lighter |
| `--elev-1-tonal` | (coral-hued variant) | (coral-hued variant) |
| `--elev-2` | `0 2px 6px rgba(40,18,24,0.14), 0 12px 28px rgba(40,18,24,0.12)` | lighter |
| `--elev-3` | (deepest) | (deepest) |

### 1.9 Motion
| Token | Value | Used? |
|---|---|---|
| `--speed-ui` | `140ms` | heavily (legacy alias) |
| `--ease-ui` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | heavily |
| `--motion-fast` | `100ms` | yes |
| `--motion-base` | `140ms` (alias of `--speed-ui`) | yes |
| `--motion-enter` | `200ms` | yes |
| `--motion-exit` | `150ms` | **0 refs** |
| `--motion-nav` | `250ms` | **0 refs** |
| `--motion-loop` | `1000ms` | yes |

### 1.10 Borders / inputs / focus
| Token | Value |
|---|---|
| `--border` | low-contrast line (theme-aware rgba) |
| `--border-strong` | stronger divider (theme-aware rgba) |
| `--input-bg` | `#2A2A30` / `#FFFFFF` |
| `--border-focus` | → `--accent-focus` |
| `--focus-ring-width` | (defined, 1 ref) |
| `--focus-ring-offset` | (defined, 1 ref) |

### 1.11 Miscellaneous
| Token | Purpose |
|---|---|
| `--selection-bg` | `::selection` bg |
| `--selection-fg` | `::selection` fg |
| `--scrim-top` | `--scrim-bottom` | Scroll-fade masks |
| `--meal-accent` | Per-meal color (morning/noon/evening…) |
| `--tile-accent` | Per-dashboard-tile accent |
| `--blur-glass` | Backdrop-filter intensity |

### 1.12 Unused tokens summary
**10 tokens defined with ZERO `var()` references:**
`--motion-exit`, `--motion-nav`, `--r-badge`, `--r-btn`, `--r-card`, `--r-modal`, `--sp-8`, `--surface-hover`, `--surface-pressed`, `--text-3xl`.

**Several referenced only once:**
`--accent-hover`, `--accent-pressed`, `--bg-deep`, `--border-focus`, `--focus-ring-offset`, `--grad-accent-soft`, `--muted-on-bg`, `--r-input`, `--r-modal-lg`, `--selection-bg`.

---

## 2. Theme switching
- Toggle: `<html data-theme="dark|light">` attribute (set by `public/features/appearance.js`, reading `localStorage` + `prefers-color-scheme`).
- Both branches of the `:root, [data-theme="dark"]` block are the default.
- No separate stylesheet per theme; same CSS, different token values.
- No `color-scheme: dark light` declaration at `:root` level; `color-scheme: dark` / `light` declared per theme block (correct).

---

## 3. Media queries (35 total)
| Count | Feature |
|---|---|
| 20 | `prefers-reduced-motion: reduce` |
| 8 | `max-width` breakpoints: 360, 380, 400, 420, 480, 520, 540 |
| 4 | `min-width` breakpoints: 1024, 1100, 1440 |
| 2 | `forced-colors: active` |
| 1 | `prefers-reduced-transparency: reduce` (merged with one `forced-colors`) |

**Breakpoint spread:** 7 mobile breakpoints between 360–540px (dense cluster — likely hand-tuned per component), 3 desktop (1024, 1100, 1440). No tablet range.

---

## 4. Animations + transitions
- **10 `@keyframes`**: `voice-pulse`, `pulse`, `skeleton-shimmer`, `spin`, `scanneat-grade-land`, `scanneat-success-burst`, `scanneat-btn-loading`, `scanneat-milestone-pulse`, `scanneat-scan-ready`, `scanneat-scanning-sweep`.
- **28 transition rules** with hardcoded ms values (not token-referenced). Common literals: `180ms`, `200ms`, `160ms`, `140ms`, `120ms`.
- Reduce-motion coverage: 20 blocks set `animation: none; transition: none` — appears comprehensive.

---

## 5. Ad-hoc values (token-coherence facts — NOT judgement)
- **Raw hex colours (outside token blocks):** 57 occurrences across 36 unique values. Top 10:
  - `#1B1B1F` (10), `#FFFFFF` (6), `#fff` (4), `#E54B5E` (4), `#FF6B45` (3), `#F8C8CF` (3), `#B0431F` (3), `#000` (3), `#FFFDF7` (2), `#FAF5E9` (2).
  - Most are duplicates of token values; a few exotic single-use colors (`#FF8867`, `#FF7E5F`, `#F5EFDF`, `#E0552F`).
- **`font-size: NNpx/em/rem`:** 92 raw occurrences (primary sources: noscript, base `<h1>..<h4>`, body font-size modifiers, various feature panels).
- **Transition durations in ms:** 28 rules with hardcoded `NNNms` instead of `var(--speed-ui)` or `var(--motion-*)`.
- **`box-shadow` hardcoded:** Found in `.app-toast` variant rules (`inset 4px 0 0 …, 0 10px 30px rgba(0,0,0,0.25)`) and other spots — NOT using `--elev-*`. (Count not tallied; `!important:` 13 total.)

---

## 6. Focus treatment
- **67 `:focus-visible` rules** — coverage looks strong.
- **14 `outline: none` / `outline: 0` rules.** Sampled contexts:
  | Line | Selector | Replacement strategy |
  |---|---|---|
  | 161 | `.app-toast-action:focus-visible` | Replaces with accent bg + ink color + 2px solid border |
  | 611 | (detail in body) | verify |
  | 1154 | | verify |
  | 1201 | | verify |
  | 2238 | `.manual-barcode-wrap summary:focus-visible` | Color shift only (no ring) |
  | 2259 | `.unit-convert-wrap summary:focus-visible` | Same |
  | 2293 | `.recipe-import-wrap summary:focus-visible` | Same |
  | 2429 | `.rc-swap:focus-visible` | bg + accent color |
  | 2492 | `.add-to-recipe-item:focus-visible` | bg shift |
  | 2539 | `.rc-suggestion:focus-visible` | bg shift |
  | 3235 | `.dash-entry-del:focus-visible` | bg + danger color |
  | 3237 | `.dash-entry-edit:focus-visible` | bg + accent color |
  | 6300 | (deep) | verify |
  | 6862 | (deep) | verify |
  Several of these rely on **color/background shift only** for focus indication, not a visible ring. This needs the audit to check contrast of the focus state against the resting state (WCAG 2.4.11).
- **Skip-link focus style** (line 75–79): `top: var(--sp-3)`, `outline: 3px solid var(--text-on-bg)`, `outline-offset: 2px`. Correct.

---

## 7. Raw numbers
| Metric | Value |
|---|---|
| Total lines | 7360 |
| Total unique custom properties | 88 (note: design-system.md says "53 tokens" — doc is stale) |
| Total `@media` queries | 35 |
| Total `@keyframes` | 10 |
| Total `@font-face` | 0 |
| Total `@supports` | 2 |
| Total `@import` | 1 |
| Total `!important` | 13 |
| Total `outline: none` | 14 |
| Total `:focus-visible` | 67 |
| Total `prefers-reduced-motion` blocks | 20 |
| Total raw hex colors | 57 |
| Total raw `font-size` | 92 |

---

## 8. External dependencies
- 1 `@import` directive (check head of file if webfonts). Font preconnects in index.html go to `fonts.googleapis.com` + `fonts.gstatic.com` — implies at least one Google-hosted font.
- 0 `@font-face` blocks locally — so web fonts must be loaded via stylesheet `@import` or `<link>`.

---

## 9. Anomalies (facts, not findings yet)
- **Docs drift:** `docs/design-system.md` claims "53 tokens total". Actual count: 88. Doc is 5 months stale relative to the code.
- **10 purpose-named tokens unused:** `--r-btn`, `--r-card`, `--r-badge`, `--r-modal`, `--surface-hover`, `--surface-pressed`, `--motion-exit`, `--motion-nav`, `--sp-8`, `--text-3xl`. Signals a naming plan that was added but not adopted in components.
- **28 transitions use hardcoded ms values** instead of motion tokens — direct contradiction of design-system.md §Motion ("One speed, one easing").
- **92 raw font-size declarations** suggest `--text-*` scale isn't used uniformly yet.
- **Two `--bg` colors** from docs (`#F54B5E`, `#F8C8CF`) differ from current code (`#E84A5F`, `#F6D0D6`) — design pass happened, doc wasn't updated.
- **Spacing scale stops at `--sp-8` = 48px** but `--sp-8` has 0 refs — app never paces anything beyond 32px?
- **14 `outline: none` rules** — at least 7 replace the ring with a `background-color` change only (no visible ring). Needs contrast check in audit.
