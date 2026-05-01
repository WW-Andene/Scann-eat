# Surface Inventory (Phase 1)

**Document**: `/home/user/Scan'eat/public/index.html`  
**File size**: ~65 KB | **Lines**: 1124 | **Unique IDs**: 361 | **Analyzed**: 2026-04-24

---

## 1. Document Shell

### HTML & Metadata
- **`<html lang="fr">`** — Root language set to French.
- **Charset**: UTF-8 (meta charset)
- **Viewport**: `width=device-width, initial-scale=1, viewport-fit=cover` — PWA-ready, safe area coverage.
- **Theme colors**:
  - Dark: `#F54B5E` (coral red)
  - Light: `#F8C8CF` (light pink)
  - Media query: both `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)`
- **Manifest**: `/manifest.webmanifest` (PWA)
- **Icon**: `/icon.svg` (type: `image/svg+xml`)
- **Font preconnects**:
  - `https://fonts.googleapis.com`
  - `https://fonts.gstatic.com` (with `crossorigin`)
- **Stylesheet**: `/styles.css` (single file, no inline styles in head)
- **No async/defer scripts in head**; single module script at body close: `<script type="module" src="/app.js"></script>`

### Noscript
```html
<noscript>
  <section class="noscript-warning">
    <h1>Scan'eat</h1>
    <p>Cette application nécessite JavaScript pour analyser les étiquettes. Merci de l'activer dans ton navigateur.</p>
    <p lang="en">This app needs JavaScript to read food labels. Please enable it in your browser.</p>
  </section>
</noscript>
```
- Bilingual fallback (FR + EN).
- **Accessibility**: No `aria-*` or role on noscript content (correct; noscript is not styled in interactive DOM).

---

## 2. Banners & Landmarks

### Skip Link
| Property | Value |
|----------|-------|
| **Class** | `skip-link` |
| **href** | `#main-content` |
| **data-i18n** | `skipToContent` → "Aller au contenu principal" |
| **Position** | First interactive element after `<body>` |
| **Visibility** | Not hidden (visible but typically off-screen via CSS) |

### Banner Elements
| ID | Role | aria-live | Default Hidden | Purpose |
|----|------|-----------|-----------------|---------|
| `update-banner` | `status` | `polite` | **hidden** | Update notification (new version available) |
| `pending-banner` | `status` | `polite` | **hidden** | Sync status / retry prompt |
| `install-banner` | `region` | — | **hidden** | PWA installation prompt (inside main) |

### Banner Details

**`update-banner`** (lines 26–30)
- Contains: version span (#update-version), install link, dismiss button
- `aria-labelledby`: None (implied from context)
- **Controls**:
  - `#update-install-btn` (link styled as button, `download` attr)
  - `#update-dismiss-btn` (button, text "×")

**`pending-banner`** (lines 32–35)
- Status text: `#pending-text` (placeholder "—")
- Action: `#pending-retry` button (data-i18n: `retryAll`)

**Header `role="banner"`** (lines 37–42)
- **Not a semantic `<banner>` element, but landmark role applied.**
- **Contents**:
  - `#profile-btn` (emoji "👤", aria-label from data-i18n-aria-label="profile")
  - `#settings-btn` (emoji "⚙️", aria-label from data-i18n-aria-label="settings")
  - `<h1>Scan'eat</h1>` (no id)
  - Tagline `<p>` with data-i18n="tagline"

---

## 3. Header

| ID | Type | Glyph/Text | aria-label (i18n key) | Visible |
|----|------|------------|----------------------|---------|
| `profile-btn` | button | 👤 | `profile` → "Profil" | Yes |
| `settings-btn` | button | ⚙️ | `settings` → "Réglages" | Yes |

**Header structure**:
- `<h1>` with plain text "Scan'eat" (no id, not i18n'd).
- Tagline in `<p>` with `data-i18n="tagline"`.

---

## 4. Main Surfaces (Persistent & Conditional)

### 4.1 Capture Section (lines 402–441)
**ID**: `capture` | **Role**: None (implied section)

| Child ID | Type | Purpose | i18n Key | Status |
|----------|------|---------|----------|--------|
| `queue` | `<div>` | File queue display | — | Hidden by default |
| `barcode-live-btn` | button | Launch barcode camera | `scanBarcode` | Hidden (conditional) |
| `file-input` | input (file) | Photo/image capture | — | Hidden (label wraps it) |
| `scan-btn` | button | Analyze uploaded images | `analyse` | **Disabled initially** |
| `manual-barcode-form` | form | Barcode entry (details) | — | Collapsed |
| `manual-barcode-input` | input (text) | Barcode digits | `manualBarcodePlaceholder` | — |
| `manual-barcode-submit` | button | Submit barcode | `manualBarcodeSubmit` | — |

**Controls**:
- Photo input wrapped in label (`capture-btn` class); no id on label.
- Barcode live button: `id="barcode-live-btn"`, hidden initially.

---

### 4.2 Daily Dashboard (lines 462–572)
**ID**: `daily-dashboard` | **Role**: None | **Hidden initially**

#### Header
| ID | Type | Purpose | i18n |
|----|------|---------|------|
| `dashboard-date` | span | Today's date | — |
| `dashboard-streak` | p | Streak indicator | — |
| `view-day`, `view-week`, `view-month` | buttons (role="tab") | Time range toggle | `viewDay`, `viewWeek`, `viewMonth` |

#### Action Buttons (lines 471–481)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `quick-add-btn` | button | `quickAdd` | Log calories without scan |
| `templates-btn` | button | `mealTemplates` | Show saved meal templates |
| `recipes-btn` | button | `recipesBtn` | Show saved recipes |
| `meal-plan-btn` | button | `mealPlanBtn` | Weekly meal planning |
| `custom-foods-btn` | button | `customFoodsBtn` | Manage custom food entries |
| `weight-btn` | button | `weightBtn` | Log body weight |
| `progress-btn` | button | `progressBtn` | View 30-day trends |
| `copy-yesterday` | button | `copyYesterday` | Copy yesterday's log |
| `clear-today` | button | `clearToday` | Delete today's entries |

#### Tile Grid (lines 484–519)

**Hydration Tile** (`#hydration-tile`)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `hydration-label` | span | `hydrationLabel` | "Hydratation" |
| `hydration-amount` | strong | — | Current ml consumed |
| `hydration-fill` | span | — | Progress bar fill |
| `hydration-minus` | button | `hydrationMinus` | Remove 250ml glass |
| `hydration-plus` | button | `hydrationPlus` | Add 250ml glass |

**Activity Tile** (`#activity-tile`)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `activity-label` | span | `activityLabel` | "Exercice" |
| `activity-summary` | strong | — | Summary text |
| `activity-entries` | ul | — | List of logged exercises (hidden initially) |
| `activity-add` | button | `activityAdd` | Open activity dialog |

**Fasting Tile** (`#fasting-tile`, hidden initially)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `fasting-label` | span | `fastingLabel` | "Jeûne" |
| `fasting-amount` | strong | — | Current hours/completion |
| `fasting-fill` | span | — | Progress bar |
| `fasting-stop` | button | `fastingStop` | Stop fast |
| `fasting-state` | span | — | Status text |

**Weight Summary** (`#weight-summary`, hidden initially)

#### Fasting Controls (lines 526–536)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `fasting-target` | select | — | Duration (12–20h) |
| `fasting-start` | button | `fastingStart` | Begin fast |

#### Dashboard Log (lines 551–571)
| ID | Type | i18n Key |
|----|------|----------|
| `dashboard-rows` | ul | — |
| `weekly-view` | section | — |
| `monthly-view` | section | — |
| `dashboard-log` | details | `todayEntries` |
| `dashboard-entries` | div | — |
| `day-note-wrap` | details | `dayNoteTitle` |
| `day-note-input` | textarea | `dayNoteHint` |
| `day-note-counter` | span | — |

---

### 4.3 Status Section (lines 443–460)
**ID**: `status` | **Role**: `status` | **aria-live**: `polite` | **Hidden initially**
- Skeleton loaders for grade, text, progress.
- Spinner + text: "Analyse en cours…"

---

### 4.4 Recent Scans Section (lines 911–933)
**ID**: `recent-scans` | **Hidden initially**

| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `export-history` | button | `exportHistory` | Export scan history |
| `clear-history` | button | `clearHistory` | Delete all scans |
| `history-search` | input (search) | `searchHistory` | Filter scans |
| `history-grade` | select | — | Grade filter (A+–F) |
| `recent-list` | ul | — | List of scan results |

---

### 4.5 Result Section (lines 959–1119)
**ID**: `result` | **Hidden initially**

#### Score Card (lines 960–988)
| ID | Type | Purpose |
|----|------|---------|
| `score-card` | div | Dual-score display (classic + personal) |
| `grade-el` | div | Classic letter grade |
| `score-el` | strong | Classic numeric score |
| `verdict-el` | div | Classic verdict text |
| `personal-slot` | div | Personal score slot (hidden initially) |
| `personal-grade-el` | div | Personal letter grade |
| `personal-score-el` | strong | Personal numeric score |
| `personal-delta-el` | span | Delta from classic |

#### Comparison Section (lines 937–957)
**ID**: `comparison` | **Hidden initially**
| ID | Type | Purpose |
|----|------|---------|
| `compare-a` | div | Previous scan card |
| `compare-b` | div | Current scan card |
| `compare-delta` | p | Delta summary |

#### Product Details (lines 995–1015)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `product-name` | h2 | — | Product name |
| `product-category` | p | — | Category (e.g., "Breakfast cereals") |
| `result-source` | span | — | Source badge (hidden initially) |
| `result-confidence` | span | — | Confidence badge (hidden initially) |
| `result-ecoscore` | span | — | EcoScore badge (hidden initially) |
| `allergens` | div | — | Allergen list (hidden initially) |

#### Portion Panel (lines 1017–1071)
| ID | Type | i18n Key | Purpose |
|----|------|----------|---------|
| `portion-grams` | input (number) | `portionLabel` | Grams consumed |
| `portion-meal` | select | `mealLabel` | Meal type (breakfast–snack) |
| `portion-share-pct` | input (number) | `shareLabel` | Sharing percentage |
| `log-btn` | button | `logPortion` | Log this portion |

#### Details & Flags (lines 1084–1119)
| ID | Type | i18n Key |
|----|------|----------|
| `red-flags` | ul | — |
| `green-flags` | ul | — |
| `pillar-list` | ul | — |
| `ingredient-list` | ol | — |
| `nutrition-list` | ul | — |
| `reset-btn` | button | `rescan` |
| `reset-camera-btn` | button | `rescanCamera` (hidden initially) |

---

## 5. Dialogs

### Complete Dialog Inventory (21 dialogs)

| Dialog ID | aria-labelledby | Title i18n Key | Primary Controls |
|-----------|-----------------|-----------------|------------------|
| `settings-dialog` | `settings-dialog-title` | `settings` | 13 form inputs (key, mode, language, theme, preferences) |
| `explain-dialog` | `explain-title` | `whyThisFlag` | #explain-body (populated dynamically) |
| `onboarding-dialog` | `onboarding-title-1` | 4-slide carousel | #ob-skip, #ob-next |
| `profile-dialog` | `profile-dialog-title` | `profileTitle` | 15+ form inputs (sex, age, height, weight, diet, macros, etc.) |
| `about-dialog` | `about-title` | `disclaimerTitle` | #about-body (disclaimer text) |
| `pillar-dialog` | `pillar-dialog-title` | `pillarDetails` | #pillar-dialog-list (ul) |
| `camera-dialog` | `camera-status` | — | #camera-video, #camera-torch, #camera-close |
| `quick-add-dialog` | `quick-add-dialog-title` | `quickAddTitle` | 14+ inputs (name, meal, kcal, macros, advanced) |
| `activity-dialog` | `activity-dialog-title` | `activityTitle` | #a-type, #a-minutes, #a-kcal, #a-note |
| `weight-dialog` | `weight-dialog-title` | `weightTitle` | #w-kg, #w-date, #w-notes, #w-history |
| `progress-dialog` | `progress-dialog-title` | `progressTitle` | 3 chart divs (weight, kcal, water) |
| `templates-dialog` | `templates-dialog-title` | `templatesTitle` | #tpl-save-today, #tpl-search, #tpl-list |
| `tpl-name-dialog` | `tpl-name-title` | `templateNameDialogTitle` | #tpl-name-input |
| `meal-plan-dialog` | `meal-plan-title` | `mealPlanTitle` | #meal-plan-grid, grocery/clear/close buttons |
| `grocery-dialog` | `grocery-title` | `groceryTitle` | #grocery-list, #grocery-text, #grocery-markdown checkbox |
| `pantry-dialog` | `pantry-title` | `pantryTitle` | #pantry-input, #pantry-submit |
| `menu-scan-dialog` | `menu-scan-title` | `menuScanTitle` | #menu-scan-list, #menu-scan-status |
| `recipe-ideas-dialog` | `recipe-ideas-title` | `recipeIdeasTitle` | #recipe-ideas-intro, #recipe-ideas-status, #recipe-ideas-list |
| `recipes-dialog` | `recipes-dialog-title` | `recipesTitle` | #recipe-new-btn, #recipe-pantry-btn, #recipe-import-url, #recipes-search, #recipes-list |
| `recipe-edit-dialog` | `recipe-edit-title` | `recipeEditTitle` | #recipe-edit-name, #recipe-edit-servings, #recipe-components-list, #recipe-add-component |
| `custom-foods-dialog` | `custom-foods-title` | `customFoodsTitle` | #cf-name, #cf-kcal, #cf-protein, #cf-carbs, #cf-fat, #cf-list |

### Dialog Labeling Compliance
- **All 21 dialogs** have `aria-labelledby` pointing to a `<h2>` with matching id.
- **All title h2s** have `id` and `data-i18n` key.
- **No dialog without aria-labelledby**.
- **All dialogs use `<form method="dialog">`** for proper dismissal.

---

## 6. Skip Link & Focus Anchors

| ID | Target | Purpose | Status |
|----|--------|---------|--------|
| `skip-link` | `#main-content` | Skip to main content | Visible (typically off-screen) |
| (none) | `#main-content` (id exists) | Primary content region | role="main" |

**Note**: No explicit focus anchors (e.g., `autofocus`) detected in capture or dashboard sections. Focus management likely handled in JavaScript.

---

## 7. Touch Target Analysis

### Minimum Size Expectations: 44×44 CSS px

**Buttons flagged by class** (scan for inline styles suggesting smaller sizes):
- Hydration/fasting buttons (`.hyd-btn`): **inline style check recommended**
- Share preset buttons (`.chip-btn`): **may have compact class**
- All other buttons: CSS class-based sizing

**Specific concerns**:
- **Hydration minus/plus buttons** (`#hydration-minus`, `#hydration-plus`): No inline style visible; assume CSS-based.
- **Share preset buttons** (lines 1054–1058): `class="chip-btn compact"` → **likely < 44px**
- **Fasting buttons**: `.hyd-btn` (reused hydration style) → **verify CSS**

**Checkboxes & radio-like inputs**:
- Reminder checkboxes (`.reminder-row`): Wrapped in `<label>`, clickable area includes text.
- Preference checkboxes (`.pref-row`): Wrapped in `<label>`, clickable area includes text.

**No hidden/zero-size inputs detected** (all file inputs have `hidden` attribute, not `display:none`).

---

## 8. Accessibility Attributes Summary

### Raw Counts
| Attribute | Count |
|-----------|-------|
| `data-i18n` | 320 |
| `aria-live` | 13 |
| `aria-labelledby` | 27 |
| `aria-describedby` | 1 |
| `role=` | 19 |
| `aria-label` / `aria-label=` | 14 (data-i18n-aria-label applied) |
| `aria-hidden` | (not counted; common) |
| `aria-pressed` | #camera-torch (1) |
| `aria-selected` | view tabs (3) |
| `aria-autocomplete` | #qa-name (1) |
| `tabindex` | 0 (none explicit) |

### aria-live Regions (13 total)
1. `#update-banner` (status, polite)
2. `#pending-banner` (status, polite)
3. `#status` (status, polite)
4. `#dashboard-remaining` (status, polite, hidden)
5. `#csv-import-status` (polite)
6. `#pantry-status` (polite)
7. `#menu-scan-status` (polite)
8. `#recipe-ideas-status` (polite)
9. `#qa-ai-status` (polite, hidden initially)
10. `#day-note-counter` (polite)
11. `#a-estimate` (polite, in activity dialog)
12. `#recipe-edit-totals` (polite, in recipe-edit dialog)
13. `#p-estimate` (implied in other contexts)

### aria-labelledby Usage (27 total)
- All 21 dialogs: `aria-labelledby="[dialog-id]-title"`
- Result pairings section: `aria-labelledby="pairings-title"`
- Gap-closer section: `aria-labelledby="gap-closer-title"`
- Hydration & activity tiles: `aria-labelledby="[tile]-label"`

### Roles Assigned (19 total)
| Role | Count | Elements |
|------|-------|----------|
| `banner` | 1 | `<header>` |
| `main` | 1 | `<main id="main-content">` |
| `status` | 4 | banners, status section, #dashboard-remaining |
| `region` | 1 | `#install-banner` |
| `tab` | 3 | view toggle buttons (day/week/month) |
| `group` | 2 | hydration & activity tiles |
| `alert` | 1 | `#error` section |
| `img` | 2 | weekly/monthly bars (decorative charts) |
| `listbox` | 1 | `#qa-name-suggestions-list` |
| (other) | ~4 | minor roles |

---

## 9. Input Controls & Labels

### Label Coverage
- **70 `<label>` elements** detected.
- **64 `<input>` elements** detected.
- **17 `<select>` elements** detected.

### Unlabeled Inputs (Flagged)
| ID | Type | Purpose | Issue |
|----|------|---------|-------|
| `file-input` | file | Photo input | Wrapped in label (acceptable) |
| `backup-import-file` | file | Backup JSON | Wrapped in label (acceptable) |
| `csv-import-file` | file | CSV import | Wrapped in label (acceptable) |
| `recipe-photo-input` | file | Recipe photo | Wrapped in label (acceptable) |
| `qa-photo-input` | file | Quick-add photo | Wrapped in label (acceptable) |
| `qa-photo-multi-input` | file | Multi-item plate photo | Wrapped in label (acceptable) |
| `qa-photo-menu-input` | file | Menu scan photo | Wrapped in label (acceptable) |

**No problematic unlabeled inputs found** (all file inputs use label-wrapping or are hidden).

---

## 10. Data-i18n Keys Summary

**Total**: 320 data-i18n or data-i18n-* attributes

### Distribution by Type
| Type | Count |
|------|-------|
| `data-i18n` (text) | ~270 |
| `data-i18n-placeholder` | ~15 |
| `data-i18n-aria-label` | ~14 |
| `data-i18n-aria-title` | ~1 |

### Languages Configured (settings-language select)
1. **Français** (default, value="fr")
2. **English** (value="en")
3. **Español** (value="es", note "partiel · EN fallback")
4. **Italiano** (value="it", note "partiel · EN fallback")
5. **Deutsch** (value="de", note "partiell · EN fallback")

**Note**: Fallback to English for incomplete translations.

---

## 11. Known Anomalies & Unknowns

### Missing or Potential Issues

1. **`#explain-body` population** (line 206)
   - Element: `<p id="explain-body">—</p>`
   - Status: Placeholder; populated by JavaScript dynamically.
   - Accessibility: No `aria-live` on this element (may need it for context changes).

2. **Camera dialog status** (line 388)
   - `<div id="camera-status" role="status" aria-live="polite">`
   - Has both role and aria-live (correct).
   - **But**: Camera video element is `aria-hidden="true"` (correct) and muted.

3. **Tab controls missing `aria-controls`** (lines 466–468)
   - View toggle buttons have `role="tab"` but no `aria-controls` linking to tab panels.
   - Panels are not in a `role="tabpanel"` container.
   - **Note**: May be managed by JavaScript; check if implicit.

4. **Hydration/activity tiles**
   - `<div role="group" aria-labelledby="[label-id]">` — correct.
   - But: No `role="img"` on progress bars (span.hyd-fill, span.fasting-fill) — likely purely decorative.

5. **Queue display** (`#queue`, line 403)
   - Hidden initially; content unknown.
   - **Recommendation**: Verify that dynamically-added items have accessible names.

6. **Manual barcode form** (lines 424–440)
   - Inside `<details>` tag (valid).
   - Input has `aria-label="Code-barres"` (direct, not data-i18n).
   - **Note**: aria-label not i18n'd — hardcoded French.

7. **Portion share preset buttons** (lines 1054–1058)
   - `<button type="button" class="chip-btn compact" data-share="50">½</button>`
   - **No aria-label**; glyph-only buttons (½, ⅓, ¼, Tout).
   - **Likely accessible** via CSS content or JS labels, but verify.

8. **Error section** (line 935)
   - `<section id="error" class="error" role="alert" aria-live="assertive" hidden></section>`
   - Correct: `role="alert"` + `aria-live="assertive"`.
   - **Content**: Populated dynamically; verify that errors are announced.

9. **Inline recipe picker** (lines 1079–1082)
   - `<ul id="add-to-recipe-picker" ... hidden></ul>`
   - Comment indicates it's populated when user clicks "Add-to-recipe."
   - **Accessibility**: List items need accessible names once populated.

10. **Profile derived calculations** (lines 352–356)
    - `<div class="profile-derived" id="profile-derived" hidden>`
    - Initially hidden; shown only if profile is complete.
    - **Note**: Correct use of hidden attribute; content will be announced once revealed.

11. **Portion conversion details** (lines 1025–1032)
    - `<details class="unit-convert-wrap">`
    - Contains an input with no label, only placeholder: `#unit-convert-input`
    - **Accessibility**: Input needs aria-label or associated label element.

12. **Fragment-only links**
    - Several buttons use href="#" with event handlers (e.g., `#update-install-btn`).
    - Should be native `<button>` elements or `<a role="button">`.

13. **Textarea labels**
    - `#pantry-input` (line 727): in `<label>` (good).
    - `#textarea#day-note-input` (line 568): in `<label>` (good).
    - `#grocery-text` (line 708): `aria-label="Liste de courses (texte)"` (direct, not i18n'd).

14. **Hidden file inputs**
    - All file inputs use `hidden` attribute (not `display:none`), so they remain focusable.
    - **Correct behavior** for progressive enhancement.

---

## 12. Form Structure & Nesting

### Settings Dialog (most complex form)
- **21 labeled sections** (inputs, selects, textareas, checkboxes)
- **6 fieldsets** with legends
- **Multiple details elements** for backup, telemetry
- **Dialog-level actions** (about, cancel, save buttons)

### Profile Dialog
- **Grid layout** with 15+ form controls
- **Conditional hidden sections** (#custom-diet-wrap, #macro-custom-wrap)
- **Profile-derived hidden section** for calculated stats

### Activity Dialog
- **4 inputs** + 1 `aria-live` region (#a-estimate)
- **Dialog-level actions** (save, close)

### Quick-Add Dialog
- **Complex multi-section form**:
  - AI input buttons (voice, photo, plate, menu)
  - Name autocomplete (#qa-name with list attribute)
  - Meal select
  - Core macros (3 inputs)
  - Advanced section (4 more inputs)
  - Dialog-level actions (cancel, save-as-template, save)

---

## 13. Interactive Patterns

### Tabs
**View toggle** (lines 466–468):
- `role="tab"` on buttons
- `aria-selected="true/false"` on buttons
- **Missing**: `aria-controls` pointing to tab panels
- **Note**: Panels use `hidden` attribute for visibility toggle

### Autocomplete
**Quick-add name field** (lines 870–874):
- `<input list="qa-name-suggestions">`
- Paired `<ul id="qa-name-suggestions-list" role="listbox" hidden>`
- `aria-autocomplete="list"` on input
- Correct pattern.

### Dialog Form Submission
All dialogs use:
```html
<dialog id="...">
  <form method="dialog">
    ...
    <button type="submit">...</button>
  </form>
</dialog>
```
- Native `<dialog>` element (modern, no polyfill required in list).
- Proper form method for dismissal.

### Details/Summary (Collapsible)
Used for:
- Manual barcode entry
- Recipe import
- Backup section
- Custom foods add form
- Advanced quick-add fields
- Fasting history
- Dashboard log
- Day note
- Portion conversion
- Share percentage
- Pillar details
- Ingredients list
- Nutrition table

**Pattern**: All correct; `<summary>` is always clickable.

---

## 14. Visual Indicators & Classes

### Accessibility-Related Classes (inferred from content)
- `.chip-btn` — compact button style
- `.compact` — reduced size variant
- `.secondary` — lower-priority action
- `.accent` — primary action color
- `.skeleton-*` — loading placeholders
- `.hint` — helper text (visual only, not aria-describedby linked)

### Decorative Elements
- Emoji glyphs: `aria-hidden="true"` on `<span class="icon">`
- Spinner: `<div class="spinner" aria-hidden="true">`
- Progress bars: `<span class="hyd-fill">` — purely visual; no role

---

## 15. Summary Statistics

| Category | Count |
|----------|-------|
| **Total HTML lines** | 1124 |
| **Unique element IDs** | 361 |
| **Buttons** | 108 |
| **Inputs** | 64 |
| **Selects** | 17 |
| **Dialogs** | 21 |
| **Sections** | 13 |
| **Forms** | 20 |
| **Labels** | 70 |
| **Data-i18n attributes** | 320 |
| **Aria-live regions** | 13 |
| **Aria-labelledby uses** | 27 |
| **Span elements** | 129 |
| **Div elements** | 119 |
| **Heading elements** | 38 |
| **List elements (ul/ol)** | 23 |

---

## 16. Structural Observations

### Strengths
1. **Consistent labeling**: All dialogs have `aria-labelledby`; all form inputs have associated `<label>` or aria-label.
2. **i18n ready**: 320 data-i18n attributes cover UI strings; 5 languages supported.
3. **Live regions**: Status, pending, and error sections use appropriate aria-live values.
4. **PWA-first**: Manifest, theme colors, viewport, icon all configured.
5. **Semantic HTML**: `<main>`, `<banner>`, `<section>`, `<article>` roles applied where appropriate.
6. **Form method="dialog"**: All dialogs use proper form submission.

### Weaknesses / Recommended Checks
1. **Tab panel role**: View toggle buttons lack `aria-controls` and panels lack `role="tabpanel"`.
2. **Portion conversion input**: `#unit-convert-input` lacks explicit label or aria-label.
3. **Glyph-only buttons**: Share presets (½, ⅓, ¼) and emoji buttons need verification for accessible names.
4. **Aria-label hardcoding**: Some labels (barcode, grocery-text) are in French, not i18n'd via data-i18n.
5. **Inline style check**: Hydration/activity buttons should be verified for 44×44 minimum size.
6. **Explain dialog**: Dynamic content in `#explain-body` may need aria-live or aria-updated.

---

**End of Surface Inventory**
