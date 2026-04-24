# Audit — §DRC Responsive Character

**Block:** C UX
**Dimension:** §DRC (Breakpoint Audit, Mobile Intensification, Cross-Viewport Character)
**Date:** 2026-04-24

---

## F-DRC-01 · [MEDIUM] [CONFIRMED] · Seven mobile breakpoints with no declared system

**Location:** `public/styles.css` — 10 `@media` width queries (excluding reduce-motion / forced-colors):

| Breakpoint | Line | First thing modified |
|---|---|---|
| `max-width: 360px` | 5246 | `.chip-btn` |
| `max-width: 380px` | 7326 | `.dashboard-tile-grid` |
| `max-width: 400px` | 5238 | `.dialog-actions` |
| `max-width: 420px` | 633 | `.dialog-actions` |
| `max-width: 480px` | 3922 | `.flags` grid |
| `max-width: 520px` | 3854 | `.flags` grid |
| `max-width: 540px` | 865, 3773 | `.compare-grid`, others |
| `min-width: 1024px` | 5260, 5265 | `body::before`, layout |
| `min-width: 1100px` | 6009, 7319 | `main` two-pane |
| `min-width: 1440px` | 6055 | `main` wider |

**Evidence:**
- Seven distinct mobile widths (60 px, 20 px, 20 px, 60 px spacing) — no obvious system (not tailwind / bootstrap scales).
- Two breakpoints 20 px apart (400/420, 480/520) — reveal per-component panic fixes rather than a ruler.
- Dialog-actions handled at 400 AND 420 — likely one overriding the other.
- `.flags` grid handled at 480 AND 520 — likely same duplication.

**Impact:**
- Maintenance tax: adding a new component responsive rule has no default breakpoint to reach for.
- Visual inconsistency: two components switching to column-layout at different widths (~40px apart) creates awkward in-between states.

**Recommendation:**
Declare and adopt a 3-step mobile scale:
```css
--bp-compact: 380px;   /* small phone — compact both axes */
--bp-narrow:  480px;   /* standard phone portrait */
--bp-wide:    680px;   /* large phone / small tablet */
```
Plus the existing desktop triad (1024, 1100, 1440). That's 6 breakpoints total.

Migrate:
- `max-width: 360, 380` → `--bp-compact`.
- `max-width: 400, 420` → `--bp-narrow` (both are "very narrow phone" for buttons).
- `max-width: 480, 520, 540` → either `--bp-narrow` or `--bp-wide` depending on what they do.

Note: CSS custom properties don't work inside `@media` queries directly. Use a CSS native approach instead:
```css
@custom-media --compact (max-width: 380px);
```
Or document the values in a comment and use them literally (simpler; this file already does that).

**Effort:** Medium (careful per-rule audit to pick the right step).
**Risk:** Medium — wrong step choice could change cross-device UX.
**Preserves features:** Yes.

---

## F-DRC-02 · [MEDIUM] [CONFIRMED] · No tablet breakpoint — 540 px to 1024 px is a monolith

**Location:** `public/styles.css` — breakpoints jump from `540px` directly to `1024px`.

**Evidence:**
- 540 px ≈ landscape phone.
- 1024 px ≈ desktop / landscape iPad.
- **484 px gap** — no @media query targets 600, 720, 768, 800, 900. Tablets portrait (768) and landscape large phones (600–720) fall through whichever side's rules happen to fit.

**Impact:**
- **iPad portrait (768×1024) gets the phone CSS** — layout likely looks like a stretched phone rather than an intentional tablet experience.
- **iPhone landscape (812×375 or 844×390) crosses 540 threshold**, so lands in the desktop-ish stream. Probably fine but uncontrolled.

**Recommendation:**
If tablet is in-scope per the PRD, add:
```css
@media (min-width: 720px) and (max-width: 1023px) { /* tablet tweaks */ }
```
Else, document "no tablet layout; iPad users fall through to desktop styles".

Given the PRD mentions "$200 Android" and PWA/APK only — tablets likely aren't a first-class target. Decision needed.

**Effort:** Small (add one block) or Trivial (document).
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DRC-03 · [LOW] [CONFIRMED] · Desktop layout is designed (two-pane at 1100px+) — document

**Location:** `public/styles.css:6009+` (1100 px min-width), `:6055+` (1440 px).

**Evidence (from commit history):**
- `3d5607b Move 6 — desktop two-pane layout (≥ 1100px)` — desktop layout was designed, not an afterthought.

**Impact:**
- Good. But not documented in `docs/design-system.md`, so a contributor on mobile-only testing might refactor the main layout and break the desktop pane.

**Recommendation:**
Add to `design-system.md §Responsive`:
- Breakpoint: 1100 px → two-pane (capture left, dashboard right).
- Breakpoint: 1440 px → wider main + more whitespace.
- Fallback: mobile-first single-column below 1100 px.

Add a visual regression or at least a commit-check rule: when modifying `main` styles, verify ≥1100 still renders two-pane.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DRC-04 · [MEDIUM] [CONFIRMED] · No `orientation: landscape` or height-based rules — landscape phones may break

**Location:** `public/styles.css` — no `orientation:` or `max-height:` queries.

**Evidence:**
Camera dialog + onboarding dialog + menu-scan dialog all occupy most of the viewport. On a phone held sideways (landscape, ~375 height), a modal declared with `max-height: 90vh` still lives at 337px tall — tight for a 5-slide onboarding.

**Impact:**
- Onboarding dialog: hard to complete without scrolling.
- Camera-dialog: viewfinder overlay may crop in landscape.
- Profile dialog: 8+ fieldsets in a ~300px tall viewport is unscrollable if flex layout doesn't cooperate.

**Recommendation:**
Two patterns:
1. Add `@media (max-height: 500px)` overrides for key dialogs: tighter padding, scrollable inner containers.
2. Lock camera-dialog to portrait via `<meta name="screen-orientation" content="portrait">` in the PWA manifest OR via a CSS-only handling.

**Effort:** Medium.
**Risk:** Medium.
**Preserves features:** Yes.

---

## F-DRC-05 · [LOW] [CONFIRMED] · Viewport meta uses `viewport-fit=cover` — correct for notched devices; verify safe-area coverage

**Location:** `public/index.html:5`
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Evidence:**
Correct meta. `viewport-fit=cover` + `env(safe-area-inset-*)` is the pattern for notched devices (iPhone X+, pixel 6a+).

From inventory (line 122 in styles):
```css
.app-toast { bottom: calc(env(safe-area-inset-bottom, 0) + 24px); ... }
```
Toast honors the safe area. Good.

**Impact:**
- Verify: bottom-bar navigation (if any), camera-dialog chrome, install-banner — do they all use `env(safe-area-inset-*)`?
- From a skim, only toast was found. Likely gaps.

**Recommendation:**
Grep `safe-area-inset` — if count is < 5, audit every bottom-fixed / top-fixed element. The sweep should unify either with tokens (`--safe-top`, `--safe-bottom`) or with the raw `env()` call.

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes.

---

## Dimension scorecard — §DRC
| Metric | Value |
|---|---|
| Findings | 5 (MEDIUM×3, LOW×2) |
| CRITICAL | 0 |
| HIGH | 0 |
| Quickest win | F-DRC-03 (document desktop layout) |
| Highest impact | F-DRC-01 (breakpoint system — reduces 7 ad-hoc mobile BPs to 3 named) |
| Deferred | F-DRC-02 (tablet decision — needs product owner) |
