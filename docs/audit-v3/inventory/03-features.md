# Feature Preservation Ledger (03)

**Date:** 2026-04-24
**Purpose:** Per app-audit Law 4 — every fix must preserve working features. This is the list the fix phase re-checks after every batch.

---

## 1. Feature modules under `public/features/` (24 JS modules + README)

| # | Module | Purpose | DOM surface(s) | Persistence | Exports |
|---|---|---|---|---|---|
| 1 | `activity.js` | Exercise log + MET calc | `#activity-tile`, `#activity-dialog` + entries list | IDB `activity` | `renderActivity`, `initActivity` |
| 2 | `appearance.js` | Theme + reading prefs | `<html data-theme>`, `<body class>` | LS `scanneat.theme`, `scanneat.fontSize`, `scanneat.fontFamily`, `scanneat.motion` | `applyTheme`, `applyReadingPrefs`, `applyAppearance`, `initAppearance` |
| 3 | `backup-io.js` | JSON backup + Health/CSV export | Settings section | Driver over IDB + LS; no own keys | `initBackupIO` |
| 4 | `csv-import.js` | MFP/Cronometer CSV import | Settings section + file input | Writes into IDB `consumption` | `parseCsvLine`, `detectFormat`, `parseCsvImport` |
| 5 | `day-notes.js` | Free-text day notes | `#day-note-wrap` | LS `scanneat.note.YYYY-MM-DD` | `getDayNote`, `setDayNote`, `listDayNoteDates`, `DAY_NOTE_MAX_CHARS` |
| 6 | `fasting-history.js` | Completed-fast log + streak | (drives data for fasting tile) | LS `scanneat.fasting.history` | `buildFastCompletion`, `listFastHistory`, `saveFastCompletion`, `clearFastHistory`, `computeFastStreak` |
| 7 | `fasting.js` | IF countdown timer | `#fasting-tile` | LS `scanneat.fasting.start`, `.target` | `renderFasting`, `initFasting` |
| 8 | `grocery-list.js` | Ingredient aggregator | `#grocery-dialog` | Pure function; reads from meal-plan | `aggregateGroceryList`, `formatGroceryList` |
| 9 | `hydration.js` | Glasses-of-water counter | `#hydration-tile` | LS `scanneat.hydration.YYYY-MM-DD` | `renderHydration`, `initHydration` |
| 10 | `install-banner.js` | PWA install prompt | `#install-banner` | LS `scanneat.installBanner.snoozedUntil` | `initInstallBanner` |
| 11 | `keybindings.js` | Global keyboard shortcuts | document-level | None | `initKeybindings` |
| 12 | `meal-plan.js` | 7-day forward plan | `#meal-plan-dialog` | LS `scanneat.mealPlan` (auto-prune > 7 days) | `weekDates`, `getDayPlan`, `setSlot`, `clearDay`, `clearAll`, `planRecipes`, `MEAL_PLAN_MEALS`, `isoToday` |
| 13 | `menu-scan.js` | Restaurant menu dish picker | `#menu-scan-dialog` | No own state | `openMenuScan`, `initMenuScan` |
| 14 | `onboarding.js` | First-run tour | `#onboarding-dialog` | LS `scanneat.onboarded` | `maybeShowOnboarding` |
| 15 | `profile-dialog.js` | User profile editor | `#profile-dialog` | LS `scanneat.profile` | `initProfileDialog` |
| 16 | `qa-autocomplete.js` | Quick-Add typeahead | Quick-Add input + suggestion list | Reads food-db + custom-foods + history | `initQaAutocomplete` |
| 17 | `recipe-ideas.js` | LLM recipe cards | `#recipe-ideas-dialog` | No own state | `openRecipeIdeas`, `openPantryIdeas`, `initRecipeIdeas` |
| 18 | `recipes-dialog.js` | Recipe list + editor | `#recipes-dialog`, `#recipe-edit-dialog` | IDB `recipes` | `initRecipesDialog` |
| 19 | `reminders.js` | Local meal/hydration reminders | Settings dialog + Notification API | LS `scanneat.reminders.*` | `scheduleReminders`, `initReminders` |
| 20 | `scanner.js` | Live barcode scanner | `#camera-dialog` + BarcodeDetector | None | `openCameraScanner`, `closeCameraScanner`, `initScanner` |
| 21 | `settings-dialog.js` | Settings root | `#settings-dialog` | Reads every LS key | `initSettingsDialog` |
| 22 | `templates-dialog.js` | Meal templates | `#templates-dialog`, `#tpl-name-dialog` | IDB `meal_templates` | `initTemplatesDialog` |
| 23 | `voice-dictate.js` | Web Speech → Quick-Add | Quick-Add mic button | None | `initVoiceDictate` |
| 24 | `weight.js` | Weight log + forecast | `#weight-summary`, `#weight-dialog` | IDB `weight` | `renderWeightSummary`, `initWeight` |

---

## 2. Features still inline in `app.js` (4103 lines)

21 `render*` + 3 `update*` functions live in `app.js`:

| Line | Function | Surface | Notes |
|---|---|---|---|
| 364 | `renderQueue()` | `#queue` | Pending-scan retry list |
| 625 | `updatePendingBanner()` | `#pending-banner` | Pending-count indicator |
| 661 | `renderAudit(data)` | `#result` | Post-scan product card (grade + score + verdict) |
| 800 | `renderAllergens(product)` | `#allergens` | Annex II detection list |
| 819 | `renderSparseHint(data)` | sparse-data hint in result | OFF data completeness nudge |
| 858 | `renderPairings(data)` | `#pairings` | Ahn-2011 chips row |
| 1029 | `renderMealPlan()` | meal-plan-dialog body | 7-day grid |
| 1428 | `renderIngredients(product)` | ingredient list | |
| 1452 | `renderNutrition(product)` | nutrition table | |
| 1493 | `renderList(id, items, emptyLabel)` | generic list helper | |
| 1550 | `renderAdditiveSummary(product)` | additives tier | |
| 1620 | `updateReadAloudButton()` | TTS button state | |
| 1731 | `renderPersonalScore(audit, product)` | personal-score panel | |
| 1861 | `renderRecentScans()` | `#recent-scans` | Last 30 products |
| 2203 | `renderProfilesUI()` | settings → profiles | Multi-profile snapshots |
| 2548 | `updateLogPreview(product)` | Log-this panel | |
| 3068 | `renderCustomFoodsList()` | `#custom-foods-dialog` | |
| 3288 | `renderDayNote()` | `#day-note-wrap` | |
| 3353 | `renderWeeklyView()` | `#weekly-view` | 7-day rollup |
| 3460 | `renderMonthlyView()` | `#monthly-view` | 30-day chart |
| 3591 | `renderDashboard()` | `#daily-dashboard` | **Master dashboard render** |
| 3907 | `renderGapCloser(totals, targets)` | `#gap-closer` | Close-the-gap chips |
| 3958 | `renderLineChart(container, values, opts)` | generic SVG chart | |
| 4013 | `renderProgressCharts()` | `#progress-dialog` | 30-day charts |

**Master orchestrator** is `renderDashboard` (3591) — calls into every tile + the feature `render*` functions.

---

## 3. Data layer surfaces

| File | Key exports | Storage |
|---|---|---|
| `data/activity.js` | `logActivity`, `listActivityByDate`, `deleteActivity`, `buildActivityEntry`, `estimateKcalBurned`, `sumBurned`, `ACTIVITY_TYPES` | IDB `activity` |
| `data/consumption.js` | `logEntry`, `logQuickAdd`, `listByDate`, `listAllEntries`, `deleteEntry`, `clearDate`, `dailyTotals`, `todayISO`, `groupByMeal`, `MEALS`, `putEntry` | IDB `consumption` |
| `data/custom-food-db.js` | `buildCustomFood`, `listCustomFoods`, `saveCustomFood`, `deleteCustomFood` | LS `scanneat.customFoods` |
| `data/food-db.js` | `FOOD_DB`, `searchFoodDB`, `reconcileWithFoodDB` | Constant |
| `data/meal-templates.js` | `saveTemplate`, `listTemplates`, `deleteTemplate`, `expandTemplate`, `templateKcal` | IDB `meal_templates` |
| `data/pairings.js` | `findPairings`, `matchPairings` | Constant |
| `data/profile.js` | `getProfile`, `setProfile`, `hasMinimalProfile`, `bmrMifflinStJeor`, `tdeeKcal`, `bmi`, `bmiCategory`, `dailyTargets`, `MACRO_PRESETS`, etc. | LS `scanneat.profile` |
| `data/queue-store.js` | `enqueue`, `listPending`, `remove`, `countPending` | IDB `pending_scans` |
| `data/recipes.js` | `saveRecipe`, `listRecipes`, `deleteRecipe`, `aggregateRecipe`, `buildRecipeProductInput` | IDB `recipes` |
| `data/scan-history.js` | `saveScan`, `listScans`, `deleteScan`, `clearScans`, `findScanByBarcode` | IDB `history` |
| `data/weight-log.js` | `logWeight`, `listWeight`, `deleteWeight`, `summarize`, `weeklyTrend` | IDB `weight` |

---

## 4. Dialog ↔ feature mapping

| Dialog | Owning module | Opener button id | Close mechanism |
|---|---|---|---|
| `#settings-dialog` | `features/settings-dialog.js` | `#settings-btn` | `<form method="dialog">` + Esc |
| `#profile-dialog` | `features/profile-dialog.js` | `#profile-btn` | dialog form + Esc |
| `#onboarding-dialog` | `features/onboarding.js` | auto-open on first run | dialog form + Esc |
| `#about-dialog` | (inline app.js) | settings sub-link | dialog form + Esc |
| `#explain-dialog` | (inline app.js) | explain chips on result | dialog form + Esc |
| `#pillar-dialog` | (inline app.js) | pillar score cells | dialog form + Esc |
| `#camera-dialog` | `features/scanner.js` | `#barcode-live-btn` | `#camera-close` + Esc |
| `#quick-add-dialog` | (inline app.js + `qa-autocomplete` + `voice-dictate`) | `#quick-add-btn` | dialog form + Esc |
| `#activity-dialog` | `features/activity.js` | `#activity-add-btn` | dialog form + Esc |
| `#weight-dialog` | `features/weight.js` | `#weight-btn` | dialog form + Esc |
| `#progress-dialog` | `features/progress` (inline app.js `renderProgressCharts`) | `#progress-btn` | dialog form + Esc |
| `#templates-dialog` | `features/templates-dialog.js` | `#templates-btn` | dialog form + Esc |
| `#tpl-name-dialog` | `features/templates-dialog.js` | opened by templates-dialog | dialog form + Esc |
| `#recipes-dialog` | `features/recipes-dialog.js` | `#recipes-btn` | dialog form + Esc |
| `#recipe-edit-dialog` | `features/recipes-dialog.js` | opened from recipes-dialog | dialog form + Esc |
| `#meal-plan-dialog` | `features/meal-plan.js` + inline render | `#meal-plan-btn` | dialog form + Esc |
| `#pantry-dialog` | `features/recipe-ideas.js` | "Avec ce que j'ai" btn in recipes-dialog | dialog form + Esc |
| `#recipe-ideas-dialog` | `features/recipe-ideas.js` | pairings btn + pantry | dialog form + Esc |
| `#menu-scan-dialog` | `features/menu-scan.js` | photo-menu flow | dialog form + Esc |
| `#custom-foods-dialog` | (inline app.js) | custom-foods btn | dialog form + Esc |
| `#grocery-dialog` | (inline + `grocery-list.js`) | "Liste de courses" btn | dialog form + Esc |

**Total: 21 dialogs.** Six are still inline (about, explain, pillar, quick-add, custom-foods, progress).

---

## 5. User stories → implementation mapping (from docs/01-prd.md)

| Story | Surface(s) | Key code |
|---|---|---|
| US-P1-1 "Scan pasta sauce → verdict < 3s" | `#camera-dialog` → `#result` | `features/scanner.js`, `app.js` scan pipeline (661 `renderAudit`), `api/score.ts` |
| US-P1-2 "Alternative in same category if bad score" | `#alternatives` | `app.js` (render into section), `off.ts rankAlternatives` |
| US-P1-3 "Log entry → dashboard updates instantly" | `#daily-dashboard` | `data/consumption.js`, `renderDashboard` (3591) |
| US-P2-1 "Red veto on diet violation" | personal-score panel | `core/personal-score.js`, `core/diets.js`, `renderPersonalScore` (1731) |
| US-P2-2 "Plain-language veto rationale" | `#explain-dialog` | `core/explanations.js` |
| US-P2-3 "Halal/Kosher raises score" | score panel | `scoring-engine.ts` |
| US-P3-1 "Gap-closer suggestions" | `#gap-closer` | `core/presenters.closeTheGap`, `renderGapCloser` (3907) |
| US-P3-2 "Targets per sex/age/activity/BMI/goal" | profile + dashboard | `data/profile.js dailyTargets`, `renderDashboard` |
| US-P3-3 "16 mg/d iron target for menstruating" | profile life-stage | `data/profile.js` (life_stage) |
| US-P4-1 "Photograph plate → each item logged" | `#quick-add-dialog` + multi-flow | `api/identify-multi.ts`, `reconcileWithFoodDB`, `logEntry` |
| US-P4-2 "Fridge → recipes" | `#pantry-dialog` → `#recipe-ideas-dialog` | `features/recipe-ideas.openPantryIdeas`, `api/suggest-from-pantry.ts` |
| US-P4-3 "Week plan → shopping list" | `#meal-plan-dialog` → `#grocery-dialog` | `features/meal-plan.planRecipes`, `features/grocery-list.aggregateGroceryList` |
| US-P4-4 "Menu photo → pick dish" | `#menu-scan-dialog` | `api/identify-menu.ts`, `features/menu-scan.openMenuScan` |

---

## 6. Flows-to-preserve (from docs/flows.md) — fix-phase acceptance list

1. **First-run onboarding** — `#onboarding-dialog` auto-opens; name + lang + theme + API key; doesn't reappear once dismissed.
2. **Barcode scan happy path** — `#barcode-live-btn` → `#camera-dialog` → OFF → merge → score → `#result` reveals grade + personal-score + alternatives + pairings → "Log this" → dashboard refresh.
3. **Food-photo flow** — `#qa-photo-input` → compressImage → `/api/identify` → `reconcileWithFoodDB` → Quick Add prefill → log.
4. **Multi-item plate** — `#qa-photo-multi-input` → `/api/identify-multi` → reconcile → auto-log each item.
5. **Restaurant menu** — `#qa-photo-menu-input` → `/api/identify-menu` → `#menu-scan-dialog` → pick dishes → log.
6. **Pantry recipes** — `#recipes-btn` → `#recipes-dialog` → "Avec ce que j'ai" → `#pantry-dialog` → `/api/suggest-from-pantry` → `#recipe-ideas-dialog`.
7. **Meal plan → grocery list** — `#meal-plan-btn` → `#meal-plan-dialog` → "Liste de courses" → `aggregateGroceryList` → `#grocery-dialog` with Copy + Share.
8. **CSV import** — settings → file picker → `parseCsvImport` → `putEntry` → dashboard refresh.
9. **Gap-closer feedback loop** — log → dashboard → `renderGapCloser` → chips update as gaps close.

---

## 7. Raw numbers
| Metric | Value |
|---|---|
| Feature modules | 24 (+ README) |
| `render*` functions in app.js | 21 |
| `update*` functions in app.js | 3 |
| Total dialogs | 21 |
| IDB stores referenced | 7 (consumption, history, weight, activity, recipes, meal_templates, pending_scans) |
| LS keys prefixed `scanneat.` | ~20 (profile, theme, fontSize, fontFamily, motion, lang, onboarded, mealPlan, customFoods, groqKey, mode, telemetry.buffer, telemetry.enabled, fasting.start, fasting.target, fasting.history, hydration.YYYY-MM-DD, note.YYYY-MM-DD, reminders.*, installBanner.snoozedUntil) |

---

## 8. Anomalies (facts for audit)
- **Six dialogs still inline** in app.js (about, explain, pillar, quick-add, custom-foods, progress) — `features/` extraction incomplete.
- **`renderDashboard` is the master** orchestrator; any fix that changes it ripples through every tile.
- **No tests for render output** — all test files are per-feature logic, zero DOM render tests.
- **`progress-dialog` ID is referenced** but there's no `features/progress.js` — the logic is inline as `renderProgressCharts`.
