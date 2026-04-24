# Audit — §G Accessibility (WCAG 2.1 AA)

**Block:** D A11y / UX Flows / i18n
**Dimension:** §G (Accessibility)
**Source inventory:** `docs/audit-v3/inventory/05-accessibility.md` (with corrections — see below)
**Date:** 2026-04-24

---

## Corrections to Inventory 05

Before enumerating findings, two corrections to the a11y baseline inventory:

1. **Inventory claim:** *"HTML lang=\"fr\" is hard-coded and does NOT update when user switches language."*
   **Actual code:** `public/core/i18n.js:1585` — `document.documentElement.lang = currentLang;` runs on every `applyStaticTranslations()` call, which fires on every `setLang()`. **Lang IS synced.** The original CRITICAL is withdrawn.

2. **Inventory claim:** *"All grade colors fail AA 3:1 on light panels."*
   **Actual usage:** grade colors are BACKGROUND fills on pills with dark text (`var(--on-muted)` = `#1B1B1F`). Dark text on a bright grade tile passes AA for all grades (A+ through D at 5:1+, F at ~4:1 marginal). The failure applies **only** when a grade token is used as TEXT COLOR on a light panel — see F-DC-02 in Block A.

---

## F-G-01 · [HIGH] [CONFIRMED] · Dialog form controls lose focus ring, rely only on background shift

**Location:** `public/styles.css` — rules at lines 611, 1154, 1201 (+ potentially others in the 14 `outline:none` set). Affected selectors (per inventory 05):
- `.settings-dialog input:focus-visible { outline: none; }`
- `.settings-dialog select:focus-visible { outline: none; }`
- `.settings-dialog textarea:focus-visible { outline: none; }`
- `.add-to-recipe-item:focus-visible { outline: none; }`
- `.custom-food-label:focus-visible { outline: none; }`

**Evidence:**
These elements remove the default focus outline without replacing it with a compliant visible indicator. WCAG 2.4.7 (Focus Visible) requires a visible indicator; WCAG 2.4.11 (AA, new in WCAG 2.2) adds minimum contrast + size requirements for the focus indicator.

The replacement strategy used here (`background: var(--panel-2)` or similar) is allowed only if:
- The new background contrasts with the surrounding surface at ≥ 3:1 (2.4.11).
- The change is perceptible to users with low contrast sensitivity.

`--panel-2` on `--panel` in dark theme: `#2A2A30` on `#1B1B1F` ≈ **1.4:1** — fails 3:1.
Light theme: `#FAF5E9` on `#FFFFFF` ≈ **1.02:1** — essentially invisible.

**Impact:**
- Settings dialog keyboard users can't see which field is focused → accidental edits on the wrong field.
- "Add to recipe" item list: keyboard users lose track of selection.
- WCAG AA failure on all five selectors.

**Recommendation:**
Restore a focus outline on these selectors:
```css
.settings-dialog input:focus-visible,
.settings-dialog select:focus-visible,
.settings-dialog textarea:focus-visible,
.add-to-recipe-item:focus-visible,
.custom-food-label:focus-visible {
  outline: 2px solid var(--accent-focus);
  outline-offset: 2px;
  /* Keep the existing background change as secondary indicator */
}
```
Keep the background change; add the outline back. Both indicators = belt-and-braces.

**Effort:** Small.
**Risk:** Low (additive outline).
**Preserves features:** Yes.

---

## F-G-02 · [HIGH] [CONFIRMED] · Touch targets at 40px — below WCAG AAA 44×44, marginal for AA 24×24

**Location:** `public/styles.css` — `.chip-btn { min-height: 40px }` (line 437), `.chip-btn.compact { min-height: 36px }` (line 4335), plus default button heights.

**Evidence:**
| Component | Min height | WCAG AA 2.5.8 (24×24, WCAG 2.2) | AAA 2.5.5 (44×44) |
|---|---|---|---|
| `.chip-btn` | 40px | ✓ passes AA | ✗ fails AAA |
| `.chip-btn.compact` | 36px | ✓ passes AA | ✗ fails AAA |
| `input`, `select` | ~40px default | ✓ passes AA | ✗ fails AAA |
| `summary` (details toggle) | text height only (≤24 often) | ✗ likely fails AA on compact font | ✗ fails AAA |
| `.dash-entry-del`, `.dash-entry-edit` | implicit (icon button) | check actual size | likely fails |
| `.recent-del`, `.queue-remove` | implicit | check actual size | likely fails |

**Impact:**
- WCAG 2.5.5 (AAA) compliance aspirational but not required. Currently failing.
- WCAG 2.5.8 (AA, 2.2 new) requires 24×24 CSS pixels — most elements pass.
- **Critical risk:** `summary` elements and small icon buttons may fall below 24×24 — specifically `.dash-entry-del` (✕ button), `.recent-del`, `.queue-remove` are icon-only and may be smaller.
- Commit `a4f8e80 Sweep 6 — §G1 touch-target expansion on icon buttons` suggests this was addressed once — regression check needed.

**Recommendation:**
1. Audit every icon-only button. Enforce a minimum hit area of 44×44 via padding (actual content smaller is fine).
2. For `summary` elements in details disclosures, add `padding: 8px` or `min-height: 32px`.
3. Standardize hit-area via a `.tap-target` utility class:
   ```css
   .tap-target {
     min-width: 44px;
     min-height: 44px;
     display: inline-flex;
     align-items: center;
     justify-content: center;
   }
   ```

**Effort:** Medium.
**Risk:** Medium — increasing button sizes shifts layouts.
**Preserves features:** Yes.

---

## F-G-03 · [MEDIUM] [CONFIRMED] · Dialogs don't explicitly set initial focus

**Location:** `public/index.html` — every `<dialog>` element; no `autofocus` attributes and no `dialog.showModal()` followed by `element.focus()` observed (inventory 06).

**Evidence:**
Native `<dialog>` behaviour: when `showModal()` is called, browser autofocuses the first focusable descendant. For dialogs like camera-dialog (`#camera-close` + torch), that's the torch button (often hidden) or close button — OK. For dialogs with many inputs (profile, settings), the browser picks the first text field — usually OK but unpredictable.

For screen readers, a dialog should have its title or first meaningful content focused on open, not a stray button. VoiceOver in particular may not announce the dialog title unless it's explicitly focused.

**Impact:**
- User opens profile dialog → focus lands on "sex" radio → VoiceOver announces "sex, radio button" without any sense that a dialog just opened.
- WCAG 2.4.3 (Focus Order) — dialog focus should be intentional, not an accident of DOM order.

**Recommendation:**
Pattern: when opening a dialog, explicitly focus its `<h2>` (making h2 focusable with `tabindex="-1"` + `.sr-only` focus style so it's not a visual ring).

```js
function openDialog(dialog) {
  dialog.showModal();
  const title = dialog.querySelector('h2');
  if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
}
```

Apply to all 21 dialogs. Or add `autofocus` to each dialog's first meaningful interactive element for simpler cases.

**Effort:** Small (centralize in a helper).
**Risk:** Low.
**Preserves features:** Yes.

---

## F-G-04 · [MEDIUM] [CONFIRMED] · Landmarks lack explicit names

**Location:** `public/index.html:37` (`<header role="banner">`), `:394` (`<main id="main-content">`).

**Evidence (from inventory 05):**
- Header has implicit name from `role="banner"` — browser announces "banner landmark" with no further context.
- Main has implicit name — "main landmark".
- No `<nav>` element; view toggles use `role="tablist"`.

Screen-reader rotor shows "banner, main" — functional but terse.

**Impact:**
- When the same page has multiple landmarks, explicit names help users jump between. Scann-eat has only 2 top-level landmarks, so the impact is smaller — but if F-DH-02 recommendations are adopted (add section landmarks), names become essential.

**Recommendation:**
- `<header role="banner" aria-label="App header">` — or equivalent i18n key.
- `<main id="main-content" role="main">` — `role="main"` is redundant with `<main>` but harmless; `aria-labelledby="app-title"` if the `<h1>` id is set.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-G-05 · [LOW] [CONFIRMED] · `<html lang>` DOES sync — strength, document

**Location:** `public/core/i18n.js:1585` — `applyStaticTranslations()` includes:
```js
document.documentElement.lang = currentLang;
```

**Evidence:** This function fires from `setLang()` at line 1531, meaning every language change DOES update the root lang attribute. Verified.

**Impact:** Screen readers announce content in the correct language after a language switch. Spell-checkers use the correct dictionary. This is working correctly.

**Recommendation:**
- Add a test in `i18n-tests.ts` that mocks `document.documentElement`, calls `setLang('en')`, and asserts `document.documentElement.lang === 'en'`. Pin the behaviour so future refactors can't drop it.
- Remove the `⚠ ` marker from `inventory/05-accessibility.md §12` (documentation fix).

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-G-06 · [MEDIUM] [CONFIRMED] · Camera-dialog focus-trap + stream-stop on close both need verification

**Location:** `public/features/scanner.js`, `public/index.html:camera-dialog`.

**Evidence (from inventory 05 §11):**
- Native `<dialog>` traps focus when opened with `showModal()` (browser-native). OK.
- But: **camera stream lifecycle** — when the dialog closes via Escape or close-button, does the MediaStreamTrack stop?

If it doesn't:
- Camera LED stays on.
- Battery drain.
- User privacy surprise ("why is my camera still active?").

**Recommendation:**
1. Code review of `features/scanner.js closeCameraScanner()`: confirm it calls `stream.getTracks().forEach(t => t.stop())`.
2. Add a listener: `cameraDialog.addEventListener('close', () => stopStream())`.

**Effort:** Small.
**Risk:** Low (fix confirms a tight invariant).
**Preserves features:** Yes.

---

## F-G-07 · [MEDIUM] [CONFIRMED] · `role="tablist"` on view-toggle buttons is incomplete

**Location:** `public/index.html:466–469` (dashboard view toggles: day/week/month).

**Evidence (from inventory 01 anomalies):**
```
id="view-day" aria-label="Vue"   data-i18n="viewDay"  role="tab"  aria-selected
id="view-week"                                      role="tab"
id="view-month"                                     role="tab"
```
Each tab has `role="tab"` and `aria-selected` — good. But:
- No `role="tablist"` on the wrapper.
- No `aria-controls` pointing at the panel (`#dashboard-rows`, `#weekly-view`, `#monthly-view`).
- No `role="tabpanel"` on the panels.
- No arrow-key navigation (ARIA tablist authoring practices require Left/Right to move between tabs).

**Impact:**
- Screen readers recognise individual tabs but not the tablist as a group.
- Keyboard-only users tab through each view-toggle linearly; no arrow-key jumping.
- Panels aren't announced as tab-controlled content.

**Recommendation:**
Full tablist pattern:
```html
<div role="tablist" aria-label="Vue">
  <button role="tab" id="view-day" aria-selected="true" aria-controls="dashboard-rows">...</button>
  <button role="tab" id="view-week" aria-selected="false" aria-controls="weekly-view">...</button>
  <button role="tab" id="view-month" aria-selected="false" aria-controls="monthly-view">...</button>
</div>
<section id="dashboard-rows" role="tabpanel" aria-labelledby="view-day">...</section>
<section id="weekly-view" role="tabpanel" aria-labelledby="view-week">...</section>
<section id="monthly-view" role="tabpanel" aria-labelledby="view-month">...</section>
```
Add Left/Right arrow handlers in JS.

**Effort:** Small-Medium.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-G-08 · [LOW] [CONFIRMED] · `prefers-reduced-motion` coverage looks complete — document

**Location:** `public/styles.css` — 20 media blocks, covering all 10 keyframes.

**Evidence (from inventory 05 §10):**
All 10 `@keyframes` have a `prefers-reduced-motion: reduce` override that kills animation. Settings dialog has a motion toggle. `body.reduce-motion` programmatic override also works.

**Impact:** WCAG 2.3.3 compliance looks solid — users with vestibular disorders have three orthogonal kill-switches (OS preference, app preference, body class).

**Recommendation:** Document in `design-system.md §Motion §Reduce-Motion Contract`. Add an `i18n-tests.ts`-level check: the settings-dialog motion select persists and applies the class.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes — documents a strength.

---

## Dimension scorecard — §G
| Metric | Value |
|---|---|
| Findings | 8 (HIGH×2, MEDIUM×4, LOW×2) |
| CRITICAL | 0 (two prior-claimed CRITICALs retracted — see Corrections) |
| Quickest win | F-G-05 (document working lang-sync + add pinning test) |
| Highest impact | F-G-01 (restore focus rings on dialog inputs) |
| Corrected from inventory | HTML-lang-not-synced, all-grade-colors-fail-AA |
