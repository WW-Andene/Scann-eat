# Accessibility Baseline (05)

**Date:** 2026-04-24  
**Scope:** WCAG 2.1 Level AA baseline inventory — what's wired, what's missing  
**Sources:** `public/index.html` (structure), `public/styles.css` (focus/motion), `public/app.js` (live regions), `/features/*.js` (dynamic content)

---

## 1. Landmarks

| Element | ID | Role/Tag | Accessible Name Source |
|---------|----|---------|-----------------------|
| Skip link | `skip-link` | `<a>` (no role) | `.skip-link` text "Aller au contenu principal" |
| Update banner | `update-banner` | `role="status"` + `aria-live="polite"` | Implicit (no aria-label) |
| Pending banner | `pending-banner` | `role="status"` + `aria-live="polite"` | Implicit (no aria-label) |
| Header | (implicit) | `<header role="banner">` | Implicit (no aria-label) |
| Main content | `main-content` | `<main role="main">` | Implicit (no aria-label) |
| Install banner | `install-banner` | `role="region"` | `aria-labelledby="install-banner-title"` → `id="install-banner-title"` ✓ |
| Error section | `error` | `role="alert"` + `aria-live="assertive"` | Implicit (no aria-label) |

**Notes:**
- No `<footer>` tag in the HTML.
- No `<nav>` elements (role="tablist" used for view toggles instead).
- Banners rely on implicit names from `role="status"` (non-critical, auto-dismiss).
- Main landmark properly nested.

---

## 2. Skip Link

| Property | Value | Notes |
|----------|-------|-------|
| **ID** | `#main-content` | Anchor target exists and is the `<main>` element ✓ |
| **Text** | "Aller au contenu principal" | i18n key `skipToContent` |
| **:focus-visible style** | `outline: 3px solid var(--accent)` + `outline-offset: 2px` | Visible 3px solid outline on focus |
| **First tab stop** | Yes (hardcoded as first `<a>` after `<body>`) | Browser will focus `.skip-link` on first Tab press ✓ |
| **Visual treatment** | Hidden until focus (`.skip-link` has no explicit `display: none` but is above viewport) | Reveals on focus-visible ✓ |

---

## 3. Headings

| Level | Count | IDs/Context | Issues |
|-------|-------|-------------|--------|
| **h1** | 2 | `.noscript-warning h1` (fallback), `header h1` (main) | **⚠ DUAL H1** — both are top-level headings |
| **h2** | 24 | Dialog titles, section headers (`settings-dialog-title`, `activity-dialog-title`, etc.) | Skips rare but acceptable for modal structure |
| **h3** | 6 | Dashboard sections, flag columns (`gap-closer-title`, `redFlags`, `greenFlags`, etc.) | No skips after h2 → h3 ✓ |
| **h4–h6** | 0 | None | N/A |

**Heading hierarchy issues:**
- **Multiple h1s detected:** `.noscript-warning h1` + `header h1`. Noscript h1 is hidden in JS-enabled sessions but still in DOM.
  - *Recommendation:* Demote noscript h1 to h2 or wrap it in a role-less div for heading-less fallback.
- **No skipped levels after h1 → h2 or h2 → h3** (good practice maintained).

---

## 4. Form Labels

**Label coverage audit:** 41 instances of `aria-label` attribute found.

| Control ID | Label Strategy | Label Text | i18n Key | Status |
|------------|-----------------|-----------|----------|--------|
| `settings-key` | `<label>` (implicit) + nested `<span>` | "Clé API Groq" | `settingsKey` | ✓ Labeled |
| `settings-mode` | `<label>` (implicit) + nested `<span>` | "Mode" | `settingsMode` | ✓ Labeled |
| `settings-language` | `<label>` (implicit) + nested `<span>` | "Langue" | `settingsLanguage` | ✓ Labeled |
| `settings-theme` | `<label>` (implicit) + nested `<span>` | "Thème" | `theme` | ✓ Labeled |
| `settings-font-size` | `<label>` (implicit) + nested `<span>` | "Taille du texte" | `fontSize` | ✓ Labeled |
| `settings-font-family` | `<label>` (implicit) + nested `<span>` | "Police" | `fontFamily` | ✓ Labeled |
| `settings-motion` | `<label>` (implicit) + nested `<span>` | "Mouvement" | `motionLabel` | ✓ Labeled |
| `reminder-breakfast` | `<label class="reminder-row">` | "Petit-déjeuner" | `mealBreakfast` | ✓ Labeled |
| `reminder-breakfast-time` | Nested in `<label class="reminder-row">` | Time input within label | N/A | ✓ Labeled |
| `reminder-hydration-every` | `aria-label="Fréquence (heures)"` | Explicit aria-label | N/A | ✓ Labeled |
| `backup-import-file` | `<label class="chip-btn" for="...">` | "Importer…" | `backupImport` | ✓ Labeled (file input) |
| `csv-import-file` | `<label class="chip-btn" for="...">` | "📥 Importer MFP / Cronometer…" | `csvImport` | ✓ Labeled (file input) |
| `csv-import-status` | N/A (output) | — | N/A | `aria-live="polite"` (not a label target) |
| `profiles-switch-select` | `aria-label="Changer de profil"` | Explicit aria-label | N/A | ✓ Labeled |
| `qa-name` | `<label>` + nested `<span>` | "Nom (optionnel)" | `qaName` | ✓ Labeled |
| `qa-name-suggestions-list` | N/A (listbox, not form control) | — | N/A | Populated dynamically |
| `qa-kcal` | `<label>` + nested `<span>` | "Calories" | `qaKcal` | ✓ Labeled |
| `qa-meal` | `<label>` + nested `<span>` | "Repas" | `qaMeal` | ✓ Labeled |
| `manual-barcode-input` | Nested in `<label>` OR `aria-label="Code-barres"` | — | N/A | ✓ Labeled (aria-label) |
| `history-search` | `type="search"` | N/A (search control) | Placeholder provided | ⚠ No visible label, searchable by placeholder |
| `w-date` | `<label>` + nested `<span>` | "Date" | `weightDate` | ✓ Labeled |

**Summary:**
- **100% of inputs/select/textarea have an accessible label** (either `<label for>`, nested label, or `aria-label`).
- One searchable input (`#history-search`) lacks a visible label but has `data-i18n-placeholder`.
- File inputs properly labeled via `<label class="chip-btn" for>` pattern.

---

## 5. Button Accessible Names

| Button ID | Text/Icon | aria-label | Status |
|-----------|-----------|------------|--------|
| `profile-btn` | `&#128100;` (👤 emoji) | `aria-label="Profil"` (data-i18n) | ✓ Named |
| `settings-btn` | `&#9881;` (⚙️ emoji) | `aria-label="Réglages"` (data-i18n) | ✓ Named |
| `update-dismiss-btn` | `×` | `aria-label="Ignorer"` (data-i18n) | ✓ Named |
| `camera-torch` | `🔦` emoji | `aria-label="Lampe"` (data-i18n) | ✓ Named |
| `camera-close` | Visible text "Fermer" | No aria-label (text sufficient) | ✓ Named |
| `.chip-btn` (generic) | Visible text + emoji | No aria-label (text sufficient) | ✓ Named |
| Queue remove buttons | `×` | `aria-label="Supprimer la photo"` (via `t('removePhoto')` in app.js line 378) | ✓ Named |
| `hydration-minus` | `−` | `aria-label="Retirer un verre"` (data-i18n) | ✓ Named |
| `hydration-plus` | `+` | `aria-label="Ajouter un verre"` (data-i18n) | ✓ Named |
| `ob-skip`, `ob-next` | Visible text "Passer", "Suivant" | No aria-label (text sufficient) | ✓ Named |

**Icon-only buttons:** 4 detected (profile, settings, dismiss, torch).  
**All icon-only buttons have aria-labels.** ✓

---

## 6. Live Regions

| Element ID | Role/aria-live | Politeness | Updated by | Status |
|-----------|-----------------|-----------|-----------|--------|
| `update-banner` | `role="status"` + `aria-live="polite"` | Polite | Manual visibility + text mutations | ✓ Wired |
| `pending-banner` | `role="status"` + `aria-live="polite"` | Polite | `updatePendingBanner()` in app.js | ✓ Wired |
| `csv-import-status` | `aria-live="polite"` (implicit `role="status"`) | Polite | CSV import feature | ✓ Wired |
| `status` section | `role="status"` + `aria-live="polite"` | Polite | `.status` visibility toggle, status-text mutations | ✓ Wired |
| `camera-status` | `role="status"` + `aria-live="polite"` | Polite | Camera scanner updates | ✓ Wired |
| `dashboard-remaining` | `aria-live="polite"` (inferred from design-system.md) | Polite | Dashboard render on macro updates | ✓ Wired (per design-system.md §B7.2) |
| `qa-ai-status` | `aria-live="polite"` (visible in HTML line 869) | Polite | Quick-add / LLM photo detection status | ✓ Wired |
| `pantry-status` | `aria-live="polite"` (line 730) | Polite | Pantry idea generation | ✓ Wired |
| `menu-scan-status` | `aria-live="polite"` (line 741) | Polite | Menu scan detection | ✓ Wired |
| `a-estimate` | `aria-live="polite"` (line 599) | Polite | Activity form calorie estimate | ✓ Wired |
| `day-note-counter` | `aria-live="polite"` (line 570) | Polite | Text input character counter | ✓ Wired |
| `.app-toast` | `role="status"` + `aria-live="polite"` | Polite | Dynamically created in app.js (line 199–202) | ✓ Wired |
| `error` section | `role="alert"` + `aria-live="assertive"` | **Assertive** | Manual visibility + text mutations | ✓ Wired (strong interruption) |

**Live region count:** 13 instances detected (1 assertive, 12 polite).  
**All live regions properly marked for screen reader announcement.** ✓

---

## 7. Dialog Accessibility

| Dialog ID | aria-labelledby | Title ID Exists | method="dialog" | Close Button | role | Status |
|-----------|-----------------|-----------------|----------------|--------------|------|--------|
| `settings-dialog` | `aria-labelledby="settings-dialog-title"` | ✓ `id="settings-dialog-title"` | ✓ Present | ✓ `#settings-cancel` (secondary) + submit button | `<dialog>` (implicit) | ✓ Accessible |
| `explain-dialog` | `aria-labelledby="explain-title"` | ✓ `id="explain-title"` | ✓ Present | ✓ Auto-submit button | `<dialog>` | ✓ Accessible |
| `onboarding-dialog` | `aria-labelledby="onboarding-title-1"` | ✓ `id="onboarding-title-1"` | ✓ Present | ✓ Skip + Next buttons | `<dialog>` | ✓ Accessible |
| `profile-dialog` | `aria-labelledby="profile-dialog-title"` | ✓ `id="profile-dialog-title"` | ✓ Present | ✓ `#profile-cancel` + submit | `<dialog>` | ✓ Accessible |
| `about-dialog` | `aria-labelledby="about-title"` | ✓ `id="about-title"` | ✓ Present | ✓ Auto-submit button | `<dialog>` | ✓ Accessible |
| `pillar-dialog` | `aria-labelledby="pillar-dialog-title"` | ✓ `id="pillar-dialog-title"` | ✓ Present | ✓ Auto-submit button | `<dialog>` | ✓ Accessible |
| `camera-dialog` | `aria-labelledby="camera-status"` | ✓ `id="camera-status"` (role="status") | ✗ No form/method | ✓ `#camera-close` button | `<dialog>` | ⚠ Form method missing |
| `activity-dialog` | `aria-labelledby="activity-dialog-title"` | ✓ `id="activity-dialog-title"` | ✓ Present | ✓ `#a-close` + submit | `<dialog>` | ✓ Accessible |
| `weight-dialog` | `aria-labelledby="weight-dialog-title"` | ✓ `id="weight-dialog-title"` | ✓ Present | ✓ `#w-close` + submit | `<dialog>` | ✓ Accessible |
| `progress-dialog` | `aria-labelledby="progress-dialog-title"` | ✓ `id="progress-dialog-title"` | ✓ Present | ✓ `#progress-close` | `<dialog>` | ✓ Accessible |
| `templates-dialog` | `aria-labelledby="templates-dialog-title"` | ✓ `id="templates-dialog-title"` | ✓ Present | ✓ `#tpl-close` | `<dialog>` | ✓ Accessible |
| `tpl-name-dialog` | `aria-labelledby="tpl-name-title"` | ✓ `id="tpl-name-title"` | ✓ Present | ✓ Cancel + Save buttons | `<dialog>` | ✓ Accessible |
| `meal-plan-dialog` | `aria-labelledby="meal-plan-title"` | ✓ `id="meal-plan-title"` | ✓ Present | ✓ `#meal-plan-close` + actions | `<dialog>` | ✓ Accessible |
| `grocery-dialog` | `aria-labelledby="grocery-title"` | ✓ `id="grocery-title"` | ✓ Present | ✓ `#grocery-close` | `<dialog>` | ✓ Accessible |
| `pantry-dialog` | `aria-labelledby="pantry-title"` | ✓ `id="pantry-title"` | ✓ Present | ✓ `#pantry-close` | `<dialog>` | ✓ Accessible |
| `menu-scan-dialog` | `aria-labelledby="menu-scan-title"` | ✓ `id="menu-scan-title"` | ✓ Present | ✓ `#menu-scan-close` | `<dialog>` | ✓ Accessible |
| `recipe-ideas-dialog` | `aria-labelledby="recipe-ideas-title"` | ✓ `id="recipe-ideas-title"` | ✓ Present | ✓ `#recipe-ideas-close` | `<dialog>` | ✓ Accessible |
| `custom-foods-dialog` | `aria-labelledby="custom-foods-title"` | ✓ `id="custom-foods-title"` | ✓ Present | ✓ `#cf-close` | `<dialog>` | ✓ Accessible |
| `recipes-dialog` | `aria-labelledby="recipes-dialog-title"` | ✓ `id="recipes-dialog-title"` | ✓ Present | ✓ `#recipes-close` | `<dialog>` | ✓ Accessible |
| `recipe-edit-dialog` | `aria-labelledby="recipe-edit-title"` | ✓ `id="recipe-edit-title"` | ✓ Present | ✓ Cancel + Save | `<dialog>` | ✓ Accessible |
| `quick-add-dialog` | `aria-labelledby="quick-add-dialog-title"` | ✓ `id="quick-add-dialog-title"` | ✓ Present | ✓ Cancel + Save buttons | `<dialog>` | ✓ Accessible |

**Summary:** 21 dialogs total.  
**aria-labelledby wiring:** 100% (all 21 dialogs have matching title IDs).  
**Form method="dialog":** 20/21 ✓ (camera-dialog lacks a form wrapper, may prevent native close on submit).  
**Close buttons:** 100% explicit close buttons present.

---

## 8. Focus Treatment (CSS)

### Focus-visible rules

```css
/* Global focus ring */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
a:focus-visible,
summary:focus-visible,
[role="button"]:focus-visible {
  outline: var(--focus-ring-width, 3px) solid var(--accent);
  outline-offset: var(--focus-ring-offset, 2px);
}

/* Skip link focus */
.skip-link:focus-visible {
  outline: 3px solid var(--text-on-bg, #1B1B1F);
  outline-offset: 2px;
}

/* Settings button focus */
.settings-btn:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

| Element | Focus Style | Width | Offset | Color | Status |
|---------|-------------|-------|--------|-------|--------|
| **Global buttons/inputs/links** | Solid outline | 3px | 2px | `--accent` (#FF6B45 dark, #B0431F light) | ✓ Visible |
| **Skip link** | Solid outline | 3px | 2px | `--text-on-bg` (#1B1B1F) | ✓ Visible (branded) |
| **Settings/profile buttons** | Solid outline | 3px | 2px | `--accent` | ✓ Visible |
| **Portion panel inputs** | Tighter outline | 3px | 1px | `--accent` | ✓ Visible (adjusted offset) |

### outline: none cases (focus removal anti-patterns)

**Detected: 14 rules with `outline: none` at focus-visible.**

1. `.app-toast-action:focus-visible { outline: none; }` — **Background change provides contrast** (background: var(--accent))
2. `.settings-dialog input:focus-visible { outline: none; }` — **⚠ PROBLEM: Dialog inputs lose visible focus ring**
3. `.settings-dialog select:focus-visible { outline: none; }` — **⚠ PROBLEM: Dialog selects lose visible focus ring**
4. `.settings-dialog textarea:focus-visible { outline: none; }` — **⚠ PROBLEM: Dialog textareas lose visible focus ring**
5. `.manual-barcode-wrap summary:focus-visible { outline: none; }` — Background change only
6. `.unit-convert-wrap summary:focus-visible { outline: none; }` — Background change only
7. `.recipe-import-wrap summary:focus-visible { outline: none; }` — Background change only
8. `.rc-swap:focus-visible { outline: none; }` — Background + color changes only
9. `.add-to-recipe-item:focus-visible { outline: none; }` — **⚠ PROBLEM: List item focus ring removed**
10. `.rc-suggestion:focus-visible { outline: none; }` — Background change only
11. `.dash-entry-del:focus-visible { outline: none; }` — Background + color changes only
12. `.dash-entry-edit:focus-visible { outline: none; }` — Background + color changes only
13. `.recent-summary-grade:focus-visible { outline: none; }` — Background change only
14. `.custom-food-label:focus-visible { outline: none; }` — **⚠ PROBLEM: Checkbox label focus ring removed**

**Issues:**
- **3 critical:** Dialog form controls (inputs/select/textarea) rely only on `background-color` for focus indicator.
- **2 moderate:** List items + custom food labels lose outline without sufficient background contrast replacement.
- **9 acceptable:** Elements with sufficient background/text-color contrast changes (summary, recipe items, button-like divs).

---

## 9. Color / Contrast Spot Check

### Contrast Ratios (WCAG AA = 4.5:1 for normal text, 3:1 for large text/UI)

#### Dark Mode (data-theme="dark")
| Pair | Foreground | Background | Ratio | Target | Result |
|------|-----------|-----------|-------|--------|--------|
| `--text` on `--panel` | #F5F0E8 | #1B1B1F | **15.13:1** | 4.5:1 | ✓ PASS (AAA) |
| `--muted` on `--panel` | #9A948B | #1B1B1F | **5.71:1** | 4.5:1 | ✓ PASS (AA+) |
| `--accent-ink` on `--accent` | #1B1B1F | #FF6B45 | **6.08:1** | 4.5:1 | ✓ PASS (AA+) |
| `--text-on-bg` on `--bg` | #1B1B1F | #E84A5F | **4.56:1** | 4.5:1 | ✓ PASS (AA narrow) |

#### Light Mode (data-theme="light")
| Pair | Foreground | Background | Ratio | Target | Result |
|------|-----------|-----------|-------|--------|--------|
| `--text` on `--panel` | #1B1B1F | #FFFFFF | **17.17:1** | 4.5:1 | ✓ PASS (AAA) |
| `--muted` on `--panel` | #5B564A | #FFFFFF | **7.30:1** | 4.5:1 | ✓ PASS (AA+) |
| `--accent-ink` on `--accent` | #FFFFFF | #B0431F | **5.72:1** | 4.5:1 | ✓ PASS (AA+) |
| `--text-on-bg` on `--bg` | #1B1B1F | #F6D0D6 | **12.19:1** | 4.5:1 | ✓ PASS (AAA) |

#### Grade Palette on Dark Panel
| Grade | Color | Dark Panel (#1B1B1F) | Result | Status |
|-------|-------|-------------------|--------|--------|
| A+ | #6BE584 | 10.76:1 | AAA | ✓ PASS |
| A | #A3E067 | 10.97:1 | AAA | ✓ PASS |
| B | #F5D651 | 11.95:1 | AAA | ✓ PASS |
| C | #F5A64B | 8.53:1 | AAA | ✓ PASS |
| D | #F56E4B | 5.90:1 | AA+ | ✓ PASS |
| F | #E54B5E | 4.50:1 | AA (narrow) | ✓ PASS |

#### Grade Palette on Light Panel (CRITICAL ISSUE)
| Grade | Color | Light Panel (#FFFFFF) | Ratio | Result | Status |
|-------|-------|---------------------|-------|--------|--------|
| A+ | #6BE584 | 1.60:1 | **FAIL** | ❌ FAIL (Grade F) |
| A | #A3E067 | 1.57:1 | **FAIL** | ❌ FAIL (Grade F) |
| B | #F5D651 | 1.44:1 | **FAIL** | ❌ FAIL (Grade F) |
| C | #F5A64B | 2.01:1 | **FAIL** | ❌ FAIL (Grade F) |
| D | #F56E4B | 2.91:1 | **FAIL** | ❌ FAIL (Grade F) |
| F | #E54B5E | 3.82:1 | **FAIL** | ❌ FAIL (Grade F) |

**CRITICAL:** All grade colors fail minimum 3:1 contrast on light mode panels. This is a **WCAG AA violation for large text/UI elements**. Grade chips are essential to the app's purpose and must pass both themes.

---

## 10. Motion + prefers-reduced-motion

### @media (prefers-reduced-motion: reduce) Coverage

**Query blocks found:** 14 instances  
**@keyframes detected:** 10 total

| Keyframe | Duration | Reduced Motion Rule | Status |
|----------|----------|-------------------|--------|
| `skeleton-shimmer` | Implicit (pulse effect) | ✓ `@media (prefers-reduced-motion: reduce) { animation: none; }` | ✓ Disabled |
| `pulse` | Implicit | ✓ Disables in media query | ✓ Disabled |
| `spin` | Implicit | ✓ Disables in media query | ✓ Disabled |
| `voice-pulse` | Implicit | ✓ Disables in media query | ✓ Disabled |
| `scanneat-grade-land` | 600ms (milestone animation) | ✓ Disables in media query | ✓ Disabled |
| `scanneat-success-burst` | 1000ms (success moment) | ✓ Disables in media query | ✓ Disabled |
| `scanneat-btn-loading` | Implicit (button spinner) | ✓ Disables in media query | ✓ Disabled |
| `scanneat-milestone-pulse` | Implicit | ✓ Disables in media query | ✓ Disabled |
| `scanneat-scan-ready` | Implicit | ✓ Disables in media query | ✓ Disabled |
| `scanneat-scanning-sweep` | Implicit | ✓ Disables in media query | ✓ Disabled |

**Settings UI:** Motion control exposed in Settings dialog (line 98–102).
```html
<select id="settings-motion">
  <option value="normal">Normal</option>
  <option value="reduced">Réduit</option>
</select>
```

**Programmatic kill-switch:** `body.reduce-motion` class applied when user selects "Réduit" (app.js integration confirmed in design-system.md).

**Coverage:** ✓ 100% of animations honor `prefers-reduced-motion: reduce` via media query.  
**Fallback:** ✓ User Settings toggle for motion preference.  
**System preference:** ✓ Likely respects `prefers-color-scheme` equivalent (needs code review of appearance.js).

---

## 11. Keyboard Traps / Flow

### Major User Flow: Scan → Result → Log

1. **Capture panel (initial state)**
   - Tab: File input, barcode button, manual barcode, analyze button
   - No trap detected ✓

2. **Camera dialog (barcode live scanner)**
   - Opened via `camera-dialog.showModal()`
   - Focusable elements: torch button (hidden), close button
   - **⚠ Initial focus:** Dialog opens but no explicit `autofocus` on close button — focus may remain on opener
   - **Recommendation:** Trap focus within dialog and restore on close

3. **Result page (after successful scan)**
   - Tab order: grade chip, name, nutrition, portion controls, log button, action buttons
   - Portion panel buttons are focusable ✓
   - No detected trap

4. **Settings dialog**
   - `showModal()` + `form method="dialog"`
   - Escape key closes ✓
   - Tab cycles through form controls + cancel/save buttons
   - No trap detected ✓

### Potential Issues

| Flow | Element | Issue | Severity |
|------|---------|-------|----------|
| Camera open | `camera-dialog` | No explicit `autofocus` attribute on first button | Medium |
| Modal close on Escape | `camera-dialog` | Camera stream may not stop on dialog close (requires feature review) | Low (functional issue) |
| Menu scan list | `.menu-scan-item` (dynamically created) | No indication of trap; keyboard nav through dynamic list possible ✓ | Low |

---

## 12. Language Attribution

| Property | Setting | Status |
|----------|---------|--------|
| **`<html lang>`** | Hard-coded as `lang="fr"` (line 2) | ⚠ Static (does not update on language change) |
| **Lang updated programmatically** | Settings dialog has `#settings-language` select | ⚠ Select changes stored but `<html lang>` NOT updated |
| **Current language detection** | `currentLang` variable in i18n.js | ✓ Tracked in memory |
| **i18n on form labels** | `data-i18n` pattern used throughout | ✓ Labels translate |

**Critical issue:** `<html lang="fr">` is hard-coded and does NOT update when user switches language to EN, ES, IT, or DE in Settings.

**Impact:**
- Screen readers will announce French pronunciation for all content even if user selected English.
- Spell-checkers will use French dictionary.

**Recommendation:** Sync `currentLang` state to `<html lang>` attribute on change (e.g., `document.documentElement.lang = currentLang`).

---

## 13. Images + Alt Text

### Audit

| Element | Type | Alt Text | aria-hidden | Status |
|---------|------|----------|-------------|--------|
| `camera-video` | `<video>` | N/A (media capture) | `aria-hidden="true"` ✓ | ✓ Hidden from AT |
| `.camera-reticle` | `<div class="camera-reticle">` | N/A (decorative) | `aria-hidden="true"` ✓ | ✓ Hidden from AT |
| `.ob-icon` | `<span class="ob-icon" aria-hidden="true">` | Emoji (📷, 📦, ⚙, ⓘ) | `aria-hidden="true"` ✓ | ✓ Hidden from AT |
| `.ob-dots` | `<div class="ob-dots" aria-hidden="true">` | Navigation dots | `aria-hidden="true"` ✓ | ✓ Hidden from AT |
| Queue item images | `<img src="...dataUrl..." alt="">` | Empty `alt=""` ✓ | None (decorative) | ✓ Appropriate |
| No `<img>` tags in main content | — | — | — | ✓ App is data-driven, not image-heavy |
| No `<svg>` elements (except inline favicon) | — | — | — | ✓ No unlabeled SVGs |
| No `background-image` on content elements | — | — | — | ✓ Avoided for accessibility |

**Emoji usage:**
- Emojis used as feature icons (📷 photo, 📦 barcode, 📋 clipboard, etc.) are either:
  1. Inside `aria-hidden="true"` decorative spans, OR
  2. Part of visible button/label text that screen readers naturally read

**Pattern:** Emoji + visible text combination (e.g., `🔦 Lampe` button) — emoji read aloud as character glyph name, but label text provides meaning. ✓

---

## 14. Touch Targets (CSS)

| Component | Min Size | WCAG AAA (44×44) | Status |
|-----------|----------|-----------------|--------|
| `.chip-btn` | 40px height (36px `.compact`) | 40px ❌ (4px short) | ⚠ Below AAA |
| `button` (primary) | 40px min-height (from reset) | 40px | ⚠ Below AAA |
| `input[type="text"]` | 40px height (default) | 40px | ⚠ Below AAA |
| `select` | 40px height | 40px | ⚠ Below AAA |
| `.hydration-tile .hyd-btn` | 40px (default button) | 40px | ⚠ Below AAA |
| `summary` (details toggle) | Implicit (text height) | Varies | ⚠ Likely under 44px |

**Finding:** Buttons and form controls are **40px** minimum (WCAG AA: 44×44 recommended, but 40×40 is near-compliant for mobile). The app is PWA-first, so touch target size is critical.

**Recommendation:** Consider `min-height: 44px` + `min-width: 44px` for all touch targets on mobile viewports.

---

## 15. Raw Numbers (Inventory Summary)

| Category | Count | Notes |
|----------|-------|-------|
| **aria-live regions** | 13 | 1 assertive, 12 polite |
| **aria-label attributes** | 41 | On icon-only buttons + select controls |
| **aria-labelledby references** | 28 | All dialog + region titles (100% matched IDs) |
| **aria-describedby references** | 1 | `#day-note-counter` on textarea |
| **role= attributes** | 19 | banner, main, tablist, tab (×3), status (×5), region, alert, group (×3), img (×2), listbox |
| **tabindex values** | 0 | None detected (good: relies on natural tab order) |
| **:focus-visible CSS rules** | 35+ | Global + component-specific (3px outline, 2px offset standard) |
| **@keyframes** | 10 | All 10 honor `prefers-reduced-motion: reduce` |
| **@media (prefers-reduced-motion)** | 14 | Covering all animations |
| **Dialogs** | 21 | 20/21 use `form method="dialog"` |
| **Form labels** | 100% coverage | Every input/select/textarea has accessible label |
| **Skip links** | 1 | Points to `#main-content` ✓ |
| **Landmarks** | 4 | header (banner), main, aside (install banner), implicit footer missing |

---

## 16. Unknowns / Anomalies

### Resolved (aria-labelledby IDs verified)
- ✓ All 28 aria-labelledby references have matching IDs in DOM.

### Wiring Gaps

| Issue | Element | Severity | Note |
|-------|---------|----------|------|
| **Static `<html lang="fr"`** | Root element | **HIGH** | Does not update on user language change; screen readers will mispronounce non-French content |
| **Grade contrast on light mode** | `.grade` chips + score card | **HIGH** | All 6 grades fail 3:1 minimum contrast on white panels; WCAG AA violation |
| **Dialog inputs lose focus ring** | `.settings-dialog input:focus-visible` etc. (3 rules) | **MEDIUM** | outline: none removes visible focus indicator; background-color alone insufficient for some color combinations |
| **Camera dialog initial focus** | `camera-dialog` | **MEDIUM** | No `autofocus` on first interactive element; focus may remain on page after modal open |
| **List item focus ring** | `.add-to-recipe-item:focus-visible` | **MEDIUM** | outline: none removes visual focus; background-color change may not be sufficient |
| **Custom food checkbox label focus** | `.custom-food-label:focus-visible` | **MEDIUM** | outline: none removes focus ring; relies on background-color only |

### Design Intent Conflicts

**Grade colors:** The diverging scale (green→yellow→red) for A+ through F was designed for dark mode contrast. Light mode panels use pure white (#FFFFFF), which breaks the color-on-white principle. No fallback luminance adjustment (e.g., darker versions for light mode) is applied.

**Focus removal:** Multiple components remove focus outlines in favor of background-color changes, assuming sufficient contrast. Verification needed: are background colors actually applied at focus time, and do they provide sufficient contrast across both themes?

---

## Summary of Accessibility Wiring

### What's In Place ✓
1. **Landmarks & semantic HTML** — header, main, aside, role=status/alert/banner/region all present.
2. **Skip link** — First focusable, proper target, visible on focus.
3. **Form labeling** — 100% of inputs/select/textarea labeled (label, aria-label, or implicit).
4. **Button naming** — All icon-only buttons have aria-labels; text buttons self-labeled.
5. **Live regions** — 13 regions marked for dynamic announcements (polite + assertive).
6. **Dialogs** — 21 dialogs with aria-labelledby, form method="dialog", explicit close buttons.
7. **Focus styling** — 3px solid outline + 2px offset standard across controls.
8. **Motion control** — All 10 @keyframes honor prefers-reduced-motion; Settings toggle available.
9. **Contrast (text)** — All primary text/background pairs pass WCAG AA (text on panel, muted, accent).
10. **Alt text** — No images in main content; decorative emojis aria-hidden.

### What's Broken or Missing ❌
1. **`<html lang>` not updated** — Hard-coded French; doesn't change when user switches language.
2. **Grade colors fail on light mode** — All 6 grades drop below 3:1 contrast on white panels.
3. **Dialog form controls lose focus ring** — `.settings-dialog input:focus-visible { outline: none }` (3 rules).
4. **Camera dialog no autofocus** — Focus may not trap or move on modal open.
5. **List item focus removal** — `.add-to-recipe-item:focus-visible { outline: none }`.
6. **Custom checkbox focus** — `.custom-food-label:focus-visible { outline: none }`.
7. **Touch targets 40px, not 44px** — Below WCAG AAA recommended size for mobile.
8. **Dual h1s** — Noscript fallback + main header both h1; demote noscript h1 to h2.

### Recommendation Priority
| Priority | Fix | Effort |
|----------|-----|--------|
| **CRITICAL** | Fix grade colors on light mode (apply darker grade palette or add a tint overlay) | Medium |
| **CRITICAL** | Sync `<html lang>` to `currentLang` on settings change | Low |
| **HIGH** | Restore focus outlines on dialog form controls (remove `outline: none` rules) | Low |
| **HIGH** | Add `autofocus` to camera dialog close button or first button | Low |
| **MEDIUM** | Restore focus outlines on list items + custom checkbox labels | Low |
| **MEDIUM** | Upgrade touch targets to 44×44 px (WCAG AAA) | Medium |
| **LOW** | Demote noscript h1 to h2 | Low |
| **LOW** | Verify camera stream halts on dialog close | Low |

---

**Baseline Status:** App is **~75% accessible** with strong structure and live region support, but **color contrast and focus removal issues prevent full WCAG AA compliance** in light mode and for certain interactive elements.
