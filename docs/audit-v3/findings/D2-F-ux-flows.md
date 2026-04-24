# Audit — §F UX Flows

**Block:** D A11y / UX Flows / i18n
**Dimension:** §F (Primary user flows per docs/flows.md)
**Date:** 2026-04-24

---

## F-F-01 · [MEDIUM] [CONFIRMED] · Onboarding dialog has 4 slides but lacks progress clarity

**Location:** `public/index.html:213–243` (onboarding dialog).

**Evidence:**
```
<div class="ob-dots" aria-hidden="true">
  <span class="ob-dot active"></span><span></span><span></span><span></span>
</div>
<button id="ob-skip">Passer</button>
<button id="ob-next">Suivant</button>
```

- 4 slides, indicator dots shown but `aria-hidden="true"` — screen-reader users get no progress feedback.
- No "Slide 1 of 4" textual indicator.
- No Previous button — user can only advance, never go back to re-read slide 1 after reaching slide 2.
- "Suivant" doesn't change to "Commencer" on the final slide — user doesn't know the tour is about to close.

**Impact:**
- First-run UX — the app's first impression. Missing cues = frustration: "how many more slides?", "can I go back?"
- Screen-reader users lose their place in the tour entirely.

**Recommendation:**
1. Progress label: visible + AT-friendly: "Étape 1 sur 4" / "Step 1 of 4".
2. Add "Previous" button (hidden on slide 1).
3. Final-slide button text: "Commencer" / "Start" instead of "Suivant".
4. Change `ob-dots` from `aria-hidden="true"` to `role="tablist"` with each dot role="tab" — or leave hidden but add the text progress.

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes.

---

## F-F-02 · [HIGH] [CONFIRMED] · Barcode scan error paths are thin

**Location:** `public/app.js` scan pipeline (661 `renderAudit`) + `public/features/scanner.js`.

**Evidence (from inventory 06 §Error paths + flows doc):**
The happy path has excellent phase messaging ("Lecture du code…" → "Recherche du produit…" → "Calcul du score…"). The failure paths are terse:
- **Barcode not in OFF:** fallback to LLM identify, but no explicit message during fallback.
- **Network offline during scan:** queued in IDB `pending_scans`, banner appears — but only `pending-text` announces.
- **Camera permission denied:** falls to file picker, but no actionable guidance on how to grant camera later.
- **BarcodeDetector API unsupported:** file picker shown, no explanation that live scanning isn't available here.

Per inventory 04 (copy §3), empty / error states are often flat.

**Impact:**
- First-time users on a browser without BarcodeDetector (Firefox, older Safari) silently miss live scanning and don't know it's a browser limitation, not a bug.
- Users denying camera once get no path to re-permission.
- Offline users don't know the scan is queued — the pending-banner is subtle.

**Recommendation:**
Write explicit copy + behaviour for each error path:
1. "Ton navigateur ne lit pas les codes-barres en direct — utilise le sélecteur de photo à la place." (one-liner under the disabled scan button).
2. Camera-denied state: show the Settings → Site Permissions path or a `navigator.permissions.query()`-driven re-request button.
3. Offline scan: the pending banner should say "Scan en attente (hors ligne). Réessaiera automatiquement." with a prominent position — currently easy to miss.
4. BarcodeDetector fallback: not silent; toast or inline hint.

**Effort:** Medium (copy + conditional UI).
**Risk:** Low.
**Preserves features:** Yes.

---

## F-F-03 · [MEDIUM] [CONFIRMED] · Food-photo multi-item flow auto-logs without preview — silent drift risk

**Location:** `public/api/identify-multi.ts` + `public/app.js` multi handler + `docs/flows.md §4`.

**Evidence (from inventory 03 + flows):**
> "Multi-item plate → recipe: /api/identify-multi returns up to 8 items… Each item is logged as its own entry (**auto**)."

User takes a photo → LLM returns 5 items → all 5 are logged immediately → user sees "✓ 5 items logged" toast.

**Impact:**
- If the LLM hallucinates a 6th item or mis-identifies one, the entry is already in IDB before the user can object.
- No preview + confirm step before the log.
- Contradicts the more careful "Menu scan" flow (flows §5) which IS preview + pick.

**Recommendation:**
Insert a preview step similar to menu-scan: after `identifyMultiFood` returns, open a dialog with check-list of detected items. User can uncheck any mis-identified items before confirming. Default: all checked. If user taps "Log selected" → log. Matches the menu-scan pattern and reduces rollback friction.

**Effort:** Medium.
**Risk:** Low.
**Preserves features:** Yes (adds a confirmation step, doesn't remove capability).

---

## F-F-04 · [MEDIUM] [CONFIRMED] · Meal plan → grocery list roundtrip has no recipe-uniqueness feedback

**Location:** `public/features/meal-plan.js` + `public/features/grocery-list.js`.

**Evidence (from flows.md §7):**
> "`aggregateGroceryList()` sums ingredients. `#grocery-dialog` opens with bullet list + textarea + Copy + Share."

What's missing:
- No indication of how many recipes contribute to the list ("3 recettes, 28 ingrédients").
- No per-ingredient source ("basilic — utilisé dans Pesto + Caprese").
- If the same ingredient appears in 3 recipes, the summed grams may surprise users ("why do I need 400g of oignon?").

**Impact:**
- Users double-check the list against their plan — adds friction.
- Shopping-list trust suffers if the math isn't transparent.

**Recommendation:**
Add a collapsible "Détails" section under each ingredient row:
```
basilic — 45 g
  ↳ Pesto (20 g) + Caprese (25 g)
```
Or at least a summary line at the top: "3 recettes · 28 ingrédients · ~1.8 kg de courses".

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes (enhances).

---

## F-F-05 · [MEDIUM] [CONFIRMED] · CSV import gives row count but no per-row failure context

**Location:** `public/features/csv-import.js` + status line in settings dialog.

**Evidence (from flows.md §8):**
> "✓ N imported (format, M skipped)"

The skipped count is shown but not which rows or why. A user with a 300-row MFP export showing "✓ 287 imported (MFP, 13 skipped)" has no way to understand what happened with the 13.

**Impact:**
- Reduces trust in the importer.
- Repeat import = same 13 rows skipped; no remediation path.

**Recommendation:**
1. After import, offer a "Voir détails" link that reveals the 13 skipped rows with reason (empty name, kcal=0, invalid date).
2. Optionally export a `scanneat-skipped-rows.csv` with the same rows + a "why" column.

**Effort:** Medium.
**Risk:** None.
**Preserves features:** Yes.

---

## F-F-06 · [LOW] [CONFIRMED] · Gap-closer feedback loop — when all targets met, hidden silently

**Location:** `public/app.js:3907 renderGapCloser`.

**Evidence (from flows.md §9):**
> "When all targets hit, panel hides."

Hidden = invisible. User who hit all targets today doesn't see a celebration, doesn't know they succeeded at the gap-closer game.

**Impact:**
- Missed positive-reinforcement moment.
- Character brief says "success moments are expressive on opt-in signature moments" — hitting every target is such a moment.

**Recommendation:**
Instead of hiding:
- Show a single "Tous les objectifs atteints aujourd'hui 🌿" success tile at the gap-closer spot.
- Optionally trigger `scanneat-success-burst` keyframe (from §DST-04) on first day-completion.

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes (enhances).

---

## F-F-07 · [MEDIUM] [CONFIRMED] · Pantry → recipe ideas → no "save this recipe" affordance

**Location:** `public/features/recipe-ideas.js` + `#recipe-ideas-dialog`.

**Evidence (from flows.md §6):**
> "Each card: name + time_min + kcal + ingredients + steps."

User sees 3 suggested recipes. Cards are read-only — no button to save to Recipes, no button to add to Meal Plan.

**Impact:**
- Valuable suggestion is lost when the dialog closes.
- User has to manually retype via Recipes → Edit.
- Disconnect between `#recipe-ideas-dialog` and `#recipes-dialog`.

**Recommendation:**
Each recipe card gets two buttons:
- "Sauvegarder" → writes to IDB `recipes` (calls `saveRecipe`).
- "Planifier" → opens `#meal-plan-dialog` with this recipe pre-selected.

**Effort:** Medium.
**Risk:** Low.
**Preserves features:** Yes (extends).

---

## Dimension scorecard — §F
| Metric | Value |
|---|---|
| Findings | 7 (HIGH×1, MEDIUM×5, LOW×1) |
| CRITICAL | 0 |
| Quickest win | F-F-06 (replace empty gap-closer with success tile) |
| Highest impact | F-F-02 (scan error paths — first-run UX depends on this) |
| Feature-extending | F-F-03, F-F-07 (add safety + persistence to existing flows) |
