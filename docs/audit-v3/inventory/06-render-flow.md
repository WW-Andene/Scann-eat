# Render-Flow Map (06)

## 1. App Boot Sequence

Order of initialization on app.js load (line 70 onwards):

1. **Imports** (lines 1–53): All features, data stores, presenters, helpers.
2. **localStorage shim** (lines 59–68): Protect setItem/removeItem from quota errors.
3. **Top-level DOM refs** (lines 70–123): Cache 45+ element IDs.
4. **Helper functions** (lines 160–350+): `loadEngine()`, `toast()`, `getBarcodeDetector()`, `compressImage()`.
5. **Core render + queue logic** (lines 364–2000+): Scan pipelines, event listeners.
6. **Feature inits** (lines 3172–3278): Call in order:
   - `initHydration({ t, getProfile, waterGoalMl, todayISO })`
   - `initActivity({ t, getProfile, toast, ... })`
   - `initWeight({ t, toast, ... })`
   - `initReminders({ t, toast, nextOccurrenceMs, listWeight })`
   - `initVoiceDictate({ t, currentLang, parseVoiceQuickAdd, logEvent })`
   - `initScanner({ t, errorEl, show, getBarcodeDetector, scanImage, addBarcodeOnly })`
   - `initInstallBanner({ show, hide })`
   - `initBackupIO({ t, show, hide, ... })`
   - `initRecipeIdeas({ t, getMode, getKey, loadEngine })`
   - `initSettingsDialog({ t, setLang, applyStaticTranslations, ... })`
   - `initMenuScan({ t, defaultMealForHour, logQuickAdd, renderDashboard })`
   - `initTemplatesDialog({ t, toast, ... })`
   - `recipesDialog = initRecipesDialog({ t, toast, ... })`
   - `initQaAutocomplete({ t, show, hide, ... })`
   - `initProfileDialog({ t, show, hide, ... })`
   - `initFasting({ t, currentLang, show, hide, ... })`
7. **Appearance init** (called inside feature inits via `initAppearance()`):
   - `applyTheme()` reads `localStorage.getItem('scanneat.theme')` → sets `document.documentElement.dataset.theme`
   - `applyReadingPrefs()` reads font size/family/motion → applies `classList` toggles on body
   - Registers `window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme)`
8. **First renders** (lines 4082–4102):
   - `renderQueue()` — show offline queue count
   - `updatePendingBanner()` — show pending scan banner
   - `renderRecentScans()` — populate scan history list
   - `maybeShowOnboarding({ t })` — show or skip onboarding dialog
   - `applyViewToggle('week')` or `renderDashboard()` — apply saved view preference or render day view
   - `scheduleReminders()` — arm meal + hydration timers
   - Async: check if logged in last 3 days → add `body.returning-user` class

---

## 2. Render Function Inventory

| Function | Surface ID | Inputs (State Sources) | Triggers (Events) |
|----------|-----------|----------------------|-------------------|
| `renderQueue()` | `#queue` | IDB queue-store | app.js boot, after enqueue/removePending |
| `renderAudit(data)` | `#qa-ai-status`, `#result`, `#result-source`, `#result-confidence` | scanImage result | barcode scan finish, profile save, compare-next click |
| `renderAllergens(product)` | `#allergens` | product.allergens | renderAudit |
| `renderSparseHint(data)` | `#sparse-hint` | data.warnings | renderAudit |
| `renderPairings(data)` | `#pairings`, `#pairings-copy-btn`, `#pairings-share-btn` | IDB pairings-store, product | renderAudit (async findPairings) |
| `renderIngredients(product)` | `#ingredients` | product.ingredients | scanImage finish |
| `renderNutrition(product)` | `#nutrition` | product.nutrition | scanImage finish |
| `renderList(id, items, emptyLabel)` | any `#*` | items array | used by renderIngredients, renderAllergens, renderList |
| `renderAdditiveSummary(product)` | `#additive-summary` | product.additives | renderAudit |
| `renderPersonalScore(audit, product)` | `#personal-score`, `#personal-score-modal` | IDB profile, audit data | renderAudit (calls computePersonalScore) |
| `updateReadAloudButton()` | `#read-aloud-btn` | result visibility | renderAudit, resetScanState |
| `renderRecentScans()` | `#recent-scans` | IDB scan-history-store, filter/sort state | app.js boot, history search input, grade select, delete/clear |
| `renderMealPlan()` | `#meal-plan-rows`, `#meal-plan-empty` | IDB meal_plan-store | meal-plan-btn click |
| `renderDayNote()` | `#day-note-input` | localStorage `scanneat.dayNote.YYYY-MM-DD` | app.js boot, renderDashboard, day-note input |
| `updateLogPreview(product)` | `#log-preview` | product + quick-add state | product loaded for logging |
| `renderCustomFoodsList()` | `#custom-foods-list` | IDB custom-food-store | custom-foods-btn click, save/delete CF |
| `renderProfilesUI()` | `#profiles-list` | IDB profiles-store | settings-dialog open |
| `renderDashboard()` | `#dashboard`, `#dashboard-date`, `#dashboard-remaining`, `#dashboard-rows`, `#dashboard-streak` | IDB consumption, weight, activity; IDB profile; localStorage fasting/hydration | app.js boot, logEntry, deleteEntry, clearDate, profile save, weight save, activity save, day toggle |
| `renderWeeklyView()` | `#chart-container`, `#weekly-rows` | IDB consumption, profile | week view toggle |
| `renderMonthlyView()` | `#chart-container`, `#monthly-rows` | IDB consumption, profile | month view toggle |
| `renderGapCloser(totals, targets)` | inline in renderDashboard | totals, targets | renderDashboard |
| `renderLineChart(container, values, opts)` | any container | values array | renderProgressCharts, renderWeeklyView, renderMonthlyView |
| `renderProgressCharts()` | `#progress-weight-chart`, `#progress-kcal-chart`, `#progress-water-chart` | IDB weight, consumption; localStorage hydration | progress-btn click |
| `renderFasting()` | `#fasting-status`, `#fasting-start`, `#fasting-stop` | localStorage `scanneat.fasting` + `scanneat.fasting.start_ms` | renderDashboard, fasting init, timer tick |
| `renderHydration()` | `#hydration-input` | localStorage `scanneat.hydration.YYYY-MM-DD` | renderDashboard |
| `renderActivity()` | `#activity-table` | IDB activity-store | renderDashboard |
| `renderWeightSummary(profile)` | `#weight-summary` | IDB weight-log + profile | renderDashboard, weight save |

**Features with exported render functions:**
- `features/hydration.js`: `renderHydration()`
- `features/activity.js`: `renderActivity()`
- `features/weight.js`: `renderWeightSummary(profile)`
- `features/fasting.js`: `renderFasting()`

---

## 3. Presenter Contract

All from `public/core/presenters.js` (pure, no DOM, no i18n in the function itself):

| Export | Signature & Output |
|--------|-------------------|
| `computeConfidence(data)` | `→ 'high' \| 'medium' \| 'low'` (tints source chip) |
| `snapshotFromData(data)` | `→ { name, grade, score, ingredients }` (compare feature) |
| `timeAgoBucket(msAgo)` | `→ { kind, n? }` (time-ago for i18n lookup) |
| `defaultMealForHour(hour)` | `→ 'breakfast' \| 'lunch' \| 'snack' \| 'dinner'` |
| `parseVoiceQuickAdd(transcript)` | `→ { meal?, text, suggestRecipe? }` (voice-dictate) |
| `waterGoalMl(profile)` | `→ number` (hydration target) |
| `weeklyRollup(entries, endIso)` | `→ { daily: [...], totals, ... }` (7-day summary) |
| `monthlyRollup(entries, endIso)` | `→ { weeks: [...], totals, ... }` (30-day summary) |
| `formatWeeklyShare(rollup, opts)` | `→ string` (shareable text) |
| `formatMonthlyShare(rollup, opts)` | `→ string` (shareable text) |
| `formatDailySummary(totals, targets, burned, opts)` | `→ string` (daily note) |
| `pctClass(pct)` | `→ 'low' \| 'ok' \| 'high' \| 'excess'` (bar color) |
| `dashboardRowsFrom(totals, targets)` | `→ [{ key, value, target, unit, bar }]` (dashboard list rows) |
| `formatRecipeShare(recipe, opts)` | `→ string` (shareable recipe) |
| `formatTemplateShare(template, opts)` | `→ string` (shareable template) |
| `weekOverWeekDelta(current, prior)` | `→ { pct, delta, dir }` (week-over-week) |
| `topFoods(entries, opts)` | `→ [{ name, kcal, count }]` (top 5 logged) |
| `filterScanHistory(items, opts)` | `→ [items]` (filter by grade/date/text) |
| `summarizeScanHistory(items)` | `→ { byGrade, ... }` (history summary) |
| `formatPairingsShare(hit, opts)` | `→ string` (shareable pairing) |
| `fastingStatus(startMs, nowMs, targetHours)` | `→ { elapsed, remaining, pct, label }` (fasting timer) |
| `buildLineChartPath(values, opts)` | `→ SVG path string` (chart rendering) |
| `laplacianVariance(luma, width)` | `→ number` (image sharpness) |
| `sharpnessVerdict(variance)` | `→ 'ok' \| 'blurry'` (image quality) |
| `entriesToDailyCSV(entries)` | `→ CSV string` (backup export) |
| `nextOccurrenceMs(hhmm, nowMs)` | `→ ms` (next reminder time) |
| `entriesToHealthJSON(entries)` | `→ JSON object` (health export) |
| `logStreakDays(entries, todayIso)` | `→ number` (consecutive-day count) |
| `weightForecast(currentKg, goalKg, weeklySlopeKg)` | `→ { days, date }` (ETA to goal) |
| `closeTheGap(totals, targets, foodDB)` | `→ [{ food, kcal, macros }]` (gap-closer suggestions) |

---

## 4. State Sources & Consumption

### IndexedDB Stores

| Store | Reader Function | Consumers (render fns) |
|-------|-----------------|----------------------|
| `consumption` | `listAllEntries()`, `listByDate(date)`, `groupByMeal(meal)`, `deleteEntry(id)`, `putEntry(entry)` | renderDashboard, renderWeeklyView, renderMonthlyView, renderProgressCharts, renderPersonalScore |
| `weight_log` | `listWeight()`, `deleteWeight(id)`, `logWeight(entry)`, `summarizeWeight()`, `weeklyTrend()` | renderDashboard, renderWeightSummary, renderProgressCharts |
| `activity` | `listActivityByDate(date)`, `deleteActivity(id)`, `logActivity(entry)`, `buildActivityEntry()` | renderDashboard, renderActivity |
| `scan_history` | `listScans()`, `findScanByBarcode(bc)`, `saveScan(entry)`, `deleteScan(id)`, `clearScans()` | renderRecentScans, scanImage (cache check) |
| `recipes` | `listRecipes()`, `saveRecipe(r)`, `deleteRecipe(id)`, `aggregateRecipe(r)` | initRecipesDialog (UI) |
| `meal_templates` | `listTemplates()`, `saveTemplate(t)`, `deleteTemplate(id)`, `expandTemplate(t)` | initTemplatesDialog (UI) |
| `meal_plan` | `getMealPlan()`, `getDayPlan(date)`, `setSlot(date, meal, slot)`, `clearDay(date)` | renderMealPlan |
| `custom_foods` | `listCustomFoods()`, `saveCustomFood(cf)`, `deleteCustomFood(id)`, `buildCustomFood(cf)` | renderCustomFoodsList, initQaAutocomplete |
| `profiles` (IDB) | `listProfiles()`, `activeProfile()`, `saveProfile(p)`, `switchProfile(id)`, `deleteProfile(id)` | renderProfilesUI |

### localStorage Keys

| Key | Reader | Consumers (render fns) |
|-----|--------|----------------------|
| `scanneat.groq_key` | `getKey()`, `localStorage.getItem(LS_KEY)` | scanViaDirect, initSettingsDialog |
| `scanneat.theme` | `localStorage.getItem(LS_THEME)` | applyTheme() → every boot |
| `scanneat.font_size` | `localStorage.getItem(LS_FONT_SIZE)` | applyReadingPrefs() → every boot |
| `scanneat.font_family` | `localStorage.getItem(LS_FONT_FAMILY)` | applyReadingPrefs() → every boot |
| `scanneat.motion` | `localStorage.getItem(LS_MOTION)` | applyReadingPrefs() → every boot |
| `scanneat.mode` | `getMode()` | scanImage (pick direct/server mode) |
| `scanneat.hydration.YYYY-MM-DD` | `getHydrationMl(date)` | renderProgressCharts, renderHydration |
| `scanneat.fasting` | `getState()` in features/fasting.js | renderFasting |
| `scanneat.fasting.start_ms` | fasting.js | renderFasting |
| `scanneat.dayNote.YYYY-MM-DD` | `getDayNote(date)` | renderDayNote |
| `scanneat.streakFired` | app.js check | renderDashboard (milestone pulse) |
| `scanneat.compare_armed` | app.js check | armComparison/resetScanState |
| `scanneat.compare_prev` | app.js snapshot | maybeRenderComparison |
| `scanneat.dismissed_update` | app.js check | PWA update banner |
| `scanneat.prefs` | `getSetting()` | settings-dialog |
| `scanneat.telemetry` | telemetry.js | telemetry export |

---

## 5. Event Wiring

### Top-Level Event Listeners (document.body / window scope)

| Event | Handler | Trigger | Final Render |
|-------|---------|---------|--------------|
| `window.online` | `retryPending()` | network restored | `updatePendingBanner()` |
| `document.visibilitychange` (line 2479) | Resume pending badge + hidden-state sync | tab becomes visible | `updatePendingBanner()` |

### Scan & Result UI Events

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#scan-btn` | click | `scanImage()` | Sets queue from fileInput → `scanViaServer()` or `scanViaDirect()` → render suite |
| `#reset-btn` | click | `resetScanState()` | Hides result/error, clears queue, calls `updateReadAloudButton()` |
| `#file-input` | change | Compress & add to queue | Adds to `queue[]` array |
| `#barcode-live-btn` | click | `openCameraScanner()` | Shows camera-dialog, starts stream |
| `#camera-close` | click | `closeCameraScanner()` | Hides camera-dialog |
| `#manual-barcode-form` | submit | Add barcode to queue | Adds to queue, calls `scanImage()` |
| `#compare-next-btn` | click | `armComparison(lastData)` | Saves to localStorage, enables compare UI |
| `#compare-clear` | click | Clear comparison state | Hides comparison rows |

### Result Detail Events

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#recipe-ideas-btn` | click | `openRecipeIdeas()` | Shows recipe ideas dialog (from recipe-ideas.js) |
| `#pairings-copy-btn` | click | Copy pairings text | Via `shareOrCopy()` |
| `#pairings-share-btn` | click | Share pairings | Via `shareOrCopy()` |
| `#add-to-recipe-btn` | click | Opens recipes-dialog | Via `recipesDialog.showModal()` |
| `#read-aloud-btn` | click | Read result aloud | Via voice-dictate feature |

### Logging Events

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#log-btn` | click | Log entry to consumption | Calls `logEntry()` → `renderDashboard()` |
| `#quick-add-btn` | click | Parse text in `#qa-input` | Calls `logQuickAdd()` → `renderDashboard()` |
| `#qa-save` | click | Save quick-add entry | Calls `putEntry()` → `renderDashboard()` |
| `#qa-photo-input` | change | Compress photo → LLM scan | Async `scanImage()` flow via photo |
| `#qa-photo-multi-input` | change | Multi-photo LLM scan | Async `scanImage()` flow |
| `#qa-photo-menu-input` | change | Menu photo scan | Async `scanImage()` flow |
| `#qa-save-tpl` | click | Save quick-add as template | Calls `saveTemplate()` → `renderMealPlan()` (if visible) |
| `#copy-yesterday` | click | Copy yesterday's entries | Calls `logQuickAdd(...)` for each → `renderDashboard()` |
| `#clear-today-btn` | click | Clear today's entries | Calls `clearDate()` → `renderDashboard()` |

### Settings & Profile Events

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#settings-btn` | click | Open settings dialog | Shows `#settings-dialog` |
| `#settings-save` | click | Save theme/lang/key | Calls `setSetting()`, `applyTheme()`, `setLang()` → `renderDashboard()` |
| `#settings-theme` | change | Apply theme | Calls `applyTheme()` |
| `#profile-btn` | click | Open profile dialog | Shows `#profile-dialog` (from profile-dialog.js) |
| `#profiles-save` | click | Save profile | Calls `saveProfile()` → `renderProfilesUI()`, `renderDashboard()`, `renderAudit()` |
| `#profiles-switch` | click | Switch active profile | Calls `switchProfile()` → `renderProfilesUI()`, `renderDashboard()` |
| `#profiles-delete` | click | Delete profile | Calls `deleteProfile()` → `renderProfilesUI()` |

### History & Custom Foods

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#history-search` | input | Filter scan history | Calls `renderRecentScans()` |
| `#history-grade` | change | Filter by grade | Calls `renderRecentScans()` |
| `#clear-history-btn` | click | Erase all scans | Calls `clearScans()` → `renderRecentScans()` |
| `#export-history-btn` | click | Export scans as JSON | Via `shareOrCopy()` |
| `#custom-foods-btn` | click | Show custom foods dialog | Shows `#custom-foods-dialog` |
| `#cf-save` | click | Save custom food | Calls `saveCustomFood()` → `renderCustomFoodsList()` |
| `#recent-scans` (delegate) | click on row | Select scan for detail view | Calls `renderAudit()`, populates result |

### Dashboard & Views

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#day-toggle` / `#week-toggle` / `#month-toggle` | click | Switch view | Calls `applyViewToggle()` → `renderDashboard()`, `renderWeeklyView()`, or `renderMonthlyView()` |
| `#progress-btn` | click | Show progress charts | Shows `#progress-dialog`, calls `renderProgressCharts()` |
| `#meal-plan-btn` | click | Show meal plan | Shows `#meal-plan-dialog`, calls `renderMealPlan()` |
| `#day-note-input` | input | Save day note | Calls `setDayNote()`, updates localStorage |

### Offline Queue

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#pending-retry` | click | Retry pending scans | Calls `retryPending()` → `updatePendingBanner()` |
| `#update-install-btn` | click | Install PWA update | SW update flow |
| `#update-dismiss-btn` | click | Dismiss update banner | Hides banner, saves to localStorage |

### Async/Feature Dialogs

| Element ID | Event | Handler | Calls |
|-----------|-------|---------|-------|
| `#meal-plan-dialog` | open | Populate meal plan | `renderMealPlan()` |
| `#templates-dialog` | (from feature) | Manage meal templates | Via `initTemplatesDialog()` |
| `#recipes-dialog` | (from feature) | Manage recipes | Via `initRecipesDialog()` |
| `#pantry-dialog` | (from recipe-ideas) | Show pantry list | Generated by recipe-ideas feature |
| `#grocery-dialog` | (from grocery-list) | Show grocery list | Generated by aggregateGroceryList |

---

## 6. DOM Mutation Counts (No innerHTML Replacements; All DOM Building)

### By render function:

| Function | `createElement` | `appendChild` | `classList` | Pattern |
|----------|----------------|-------------|-----------|---------|
| `renderAudit()` | ~15 | ~15 | 3–4 | Build result card, nested elements |
| `renderIngredients()` | ~8 | ~8 | 0 | Build ingredient list |
| `renderNutrition()` | ~20 | ~20 | 2 | Build nutrition table, color bars |
| `renderDashboard()` | ~40–50 | ~40–50 | 6–8 | Build dashboard rows (loop), milestone pulse class |
| `renderLineChart()` | ~30 | ~30 | 0 | SVG path + axis labels |
| `renderPersonalScore()` | ~10 | ~10 | 2 | Build score card |
| `renderAllergens()` | ~5 | ~5 | 0 | Via renderList helper |
| `renderPairings()` | ~8 | ~8 | 0 | Build pairing rows |
| `renderList()` | 3–5 | 3–5 | 0 | Generic list template |
| `renderRecentScans()` | ~30 | ~30 | 2 | Build history rows (loop) |
| `renderCustomFoodsList()` | ~20 | ~20 | 0 | Build custom food rows |
| `renderDayNote()` | 2 | 0 | 0 | Text update only |
| **Total in app.js** | **137** | **141** | **18** | No `innerHTML = ` used anywhere |

**Key pattern:** All renders use DOM APIs (createElement, appendChild, textContent). Zero bulk HTML string replacements (innerHTML = ...).

---

## 7. Async Pipelines (Happy Paths)

### A. Barcode Scan Pipeline

```
User: click #scan-btn
  ↓
scanImage()
  │
  ├─ Hide #error, #result; show #status
  │
  ├─ If barcode detected:
  │    └─ Try cache: await findScanByBarcode(bc)
  │         └─ If cached, use snapshot → skip LLM
  │
  ├─ Else, choose mode (direct/server/auto):
  │    ├─ [direct] await loadEngine() → await parseLabel() + fetchFromOFF()
  │    ├─ [server] await fetch('/api/score')
  │    └─ [auto] try server first, fallback to direct if getKey() exists
  │       • statusText cycles through phases: "Ingredients" → "Nutrition" → "Scoring"
  │       • Phase cycling stopped when server responds
  │
  ├─ lastData = data
  ├─ maybeRenderComparison(data)         [populate #comparison if armed]
  ├─ renderAudit(data)                   [#qa-ai-status, #result chip]
  │  ├─ renderAllergens(product)         [#allergens]
  │  ├─ renderAdditiveSummary(product)   [#additive-summary]
  │  ├─ renderPersonalScore(audit)       [#personal-score]
  │  └─ (async) findPairings() → renderPairings()   [#pairings]
  ├─ renderIngredients(product)          [#ingredients]
  ├─ renderNutrition(product)            [#nutrition]
  ├─ show(#result)
  └─ await persistToHistory(data)        [save to IDB scan_history]
       └─ (async) renderRecentScans()     [repaint history table]

Error catch (line 588):
  ├─ Hide #status
  ├─ Check navigator.onLine OR network error regex
  ├─ If network:
  │    └─ await enqueueCurrent() → updatePendingBanner()
  │         └─ show(#pending-banner)
  │         └─ Update #pending-text
  └─ show(#error) with message
```

**Key awaits:**
- Line 561: `await findScanByBarcode()` (IDB)
- Line 568/569/571: `await scanViaDirect()` / `await scanViaServer()` (LLM/OFF/server)
- Line 587: `await persistToHistory()` (IDB + async renderRecentScans)

**UI states during scan:**
1. Click: hide result, show status
2. LLM phase cycling (1.5s intervals) on statusText
3. Done: hide status, show result

---

### B. Food Photo Pipeline (voice/quick-add/menu)

```
User: select image from #qa-photo-input / #qa-photo-multi-input / #qa-photo-menu-input
  ↓
Handler calls: await compressImage(file)
  ├─ Resize to MAX_DIM (1600px)
  ├─ JPEG encode at 0.85 quality
  ├─ Sharpness probe (64×64 luma) → laplacianVariance()
  └─ Return { dataUrl, base64, mime, sharpness }
  ↓
Sharpness check: if blurry, warn user before LLM
  ├─ Show toast: "Blurry image — re-shoot recommended"
  └─ Ask confirm or proceed
  ↓
Add to queue[] + call scanImage()
  [same pipeline as barcode scan above]
```

**Key calls:**
- `compressImage()` uses canvas for resize + JPEG encode
- `sharpnessVerdict()` pure computation from Laplacian variance
- Delegates to `scanImage()` for LLM part

---

### C. Menu Scan Pipeline

```
User: click "Scan Menu" → select #qa-photo-menu-input
  ↓
Feature handler (menu-scan.js):
  ├─ await compressImage(file)
  ├─ Add to queue[] with dataUrl
  ├─ Guess meal from time: defaultMealForHour(new Date().getHours())
  └─ await scanImage()
  ↓
[Barcode scan flow above]
  ↓
On result render:
  ├─ Menu items detected → populate quick-add UI
  └─ User clicks "Add [item]" → logQuickAdd(...) → renderDashboard()
```

**Key pattern:** Menu scan is just a photo pipeline with meal auto-detect prepended.

---

## 8. Error Paths

### Scan Pipeline Failures

| Trigger | Error Type | Catch Block | UI Change |
|---------|-----------|------------|-----------|
| `scanViaDirect()` LLM API 429 | `err.status === 429` | Line 513 | Toast + errorEl: "Rate limited" |
| `scanViaServer()` HTTP 429 | `res.status === 429` || `body.error === 'rate_limit'` | Line 488–489 | Toast + errorEl: "Rate limited" |
| Network down (offline mode) | `!navigator.onLine` \| regex match "network\|failed to fetch" | Line 598–600 | `await enqueueCurrent()` → `updatePendingBanner()` show, errorEl: "Offline — ..." |
| Server returned HTTP error | `!res.ok` | Line 486 | errorEl: body.error or `HTTP {status}` |
| No photos + not barcode | `payload.length === 0` | Line 504 | errorEl: "No photos" |
| No API key in direct mode | `!getKey()` | Line 505 | errorEl: "Missing Groq key" |
| Cache lookup fails (IDB) | Line 565 silent catch | (skipped) | Treated as cache miss; LLM proceeds |
| Image decompression fails | In `compressImage()` catch | Line 319 | Silent fallback; original image used |
| Barcode detection fails | In `detectBarcodeFromFile()` catch | Line 284 | Silent; barcode = null; LLM processes image |

### Queue Retry Failures

| Trigger | Error Type | Catch Block | UI Change |
|---------|-----------|------------|-----------|
| IDB read fails in `retryPending()` | `listPending()` error | Line 647 | Silent console.warn; banner stays until next tick |
| Fetch to `/api/score` fails | Network or HTTP error | Line 645 break | Stops retry loop on first failure; user can re-tap |

### Off-Canvas Failures (silent, non-blocking)

| Trigger | Catch | Behavior |
|---------|-------|----------|
| `renderRecentScans()` history load | IDB read fail | Empty history list shown |
| `renderDayNote()` load | localStorage fail | Input shows empty; save still works |
| `renderProgressCharts()` load | IDB fail | Charts div stays empty; no error shown |
| Profile render on boot | IDB read fail | Dashboard renders with null profile |

---

## 9. Debouncing / Throttling

| Pattern | Context | Purpose |
|---------|---------|---------|
| `setInterval(..., 1500)` (line 547) | Phase cycling during LLM wait | Cycle "Ingredients" → "Nutrition" → "Scoring" every 1.5s; cleared on result |
| `setTimeout(dismiss, ms)` (line 216, 262) | Toast auto-hide | 2600ms default or 6000ms for undo; `clearTimeout` resets on new toast |
| `setTimeout(0)` (line 3135) | Custom food focus | Defer focus to next tick after DOM insert |
| `setTimeout(..., 1400)` (line 3632) | Milestone pulse CSS animation | Remove pulse class after 1.4s (CSS animation duration) |
| URL.revokeObjectURL deferred (line 2020, 2290) | Canvas blob cleanup | Release blob after 5s to avoid "still in use" errors |
| No debounce on input events | `#history-search`, `#day-note-input` | Immediate renderRecentScans/setDayNote; IDB writes buffered by browser |

**No explicit debounce/throttle library used.** Timings are baked into specific UI patterns (phase cycle, toast, animation cleanup).

---

## 10. Orphan Renders

### Never-Called Functions

Grep `grep "function render\|function update" /home/user/Scann-eat/public/app.js` + cross-reference calls:

- **No functions defined but never called.** Every render* and update* function is called from:
  - event handler (listener callback)
  - another render function
  - feature init injection
  - app.js boot sequence

### Removed Features

- **Old comment references:** Line 2159 mentions "initialized below with initBackupIO" — feature IS initialized (line 3196).
- **Legacy code:** Line 2675 mentions "initVoiceDictate" only used for `parseVoiceQuickAdd` presenter — voice-dictate IS fully initialized (line 3188).

**Verdict:** No orphan code found; all features actively initialized.

---

## 11. Raw Numbers

| Metric | Count | File |
|--------|-------|------|
| **render* functions** | 23 | app.js + features |
| **update*/repaint* functions** | 2 | app.js |
| **addEventListener calls** | 85 | app.js (document-rooted + element-rooted) |
| **await expressions** | 128 | app.js |
| **try/catch blocks** | 70+ | app.js |
| **createElement calls** | 137 | app.js |
| **appendChild calls** | 141 | app.js |
| **classList.* calls** | 18 | app.js |
| **innerHTML = replacements** | 0 | app.js |
| **textContent = assignments** | ~60+ | app.js (DOM text updates) |
| **setTimeout / clearTimeout** | 6 / 3 | app.js |
| **setInterval / clearInterval** | 1 / 1 | app.js (phase cycling) |
| **Lines of code in app.js** | 4103 | |
| **Lines of code in presenters.js** | 1308 | |
| **Feature modules** | 20 | /features/ |
| **Exported presenter functions** | 30+ | public/core/presenters.js |
| **IDB stores accessed** | 8 | consumption, weight, activity, scan_history, recipes, meal_templates, meal_plan, custom_foods |
| **localStorage keys** | 15+ | theme, font_size, font_family, motion, mode, hydration.*, fasting*, dayNote.*, groq_key, etc. |

---

## Key Observations (Inventory Phase)

1. **No innerHTML bulk-replace pattern:** App uses incremental DOM building (createElement + appendChild) exclusively. Zero risk of FOUC or thrashing from HTML string replacements.

2. **23 render functions, all called:** Every render* function is triggered by a concrete event, init, or upstream render. No dead code.

3. **Appearance painting is stateless:** `applyTheme()` and `applyReadingPrefs()` read localStorage once at boot and on settings save. No render-time re-reads. OS theme change (auto mode) wired to `applyTheme()` via matchMedia listener.

4. **Async cascade heavy in scan path:** scanImage → renderAudit → findPairings (nested async). Each phase awaits before the next render, preventing race conditions. Phase timer provides UX feedback during LLM wait.

5. **Error paths are feature-specific, not global:** Network errors go to queue + banner; LLM errors go to #error chip; parsing errors surface in warnings array. No global error boundary.

6. **Three main state channels:**
   - IDB (consumption, weight, activity, scans, profiles, recipes, templates, meal_plan, custom_foods)
   - localStorage (theme, prefs, hydration, fasting, day notes, transient state like compare_armed)
   - In-memory (lastData, queue[], engineMod for LLM lazy-load)

7. **Features are fully de-coupled via init injection:** Each feature (hydration, activity, weight, reminders, fasting, etc.) receives its dependencies at boot. Mutually decoupled; can be tested in isolation.

