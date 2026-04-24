# Audit — §DCVW Copy × Visual Alignment

**Block:** C UX
**Dimension:** §DCVW (Voice, Microcopy, Copy ↔ Visual Coherence)
**Date:** 2026-04-24

---

## F-DCVW-01 · [MEDIUM] [CONFIRMED] · CTA verb forms drift between imperative-tu and infinitive

**Location:** `public/core/i18n.js` — samples:

| Key / sample | FR form | Notes |
|---|---|---|
| `tagline` | "Photographie une étiquette → note de 0 à 100" | imperative tu |
| Photo capture | "Prendre / choisir une photo" | infinitive |
| Scan | "Scanner un code-barres" | infinitive |
| Log | "Logger cette portion" | infinitive (and anglicism) |
| `save` | "Sauvegarder" | infinitive |
| Onboarding | "Photographie une étiquette" | imperative tu |

**Evidence:**
The app's character brief says *"Voice: warm + casual + moderately expressive. Sage + Caregiver + Lover tertiary."* Caregiver and Lover archetypes lean towards **direct address** ("Photographie") while Sage leans towards **neutral instruction** ("Scanner"). Code ships both.

**Impact:**
- Users feel the voice *flickers*: tutorial copy is tu-form ("Photographie"), buttons are infinitive ("Scanner"), dialog titles are noun-only ("Réglages", "Profil").
- Inconsistency makes microcopy feel machine-translated rather than house-voiced.

**Recommendation:**
Declare one CTA voice rule in `docs/design-system.md §Copy §Voice`:
> **CTAs:** use the imperative tu-form in FR (*"Scanne"*, *"Photographie"*, *"Enregistre"*). Use imperative in EN (*"Scan"*, *"Photograph"*, *"Save"*).
> **Section titles / dialog titles:** noun-only (*"Réglages"*, *"Profil"*).
> **Helper hints:** declarative tu-form (*"Scanne un code-barres pour un verdict rapide"*).

Then sweep the 50-100 action-verb keys to conform. This is copy work, not code work.

**Effort:** Large (copy review of ~80 keys × 2 languages = 160 strings).
**Risk:** Low (pure copy; no code change).
**Preserves features:** Yes.

---

## F-DCVW-02 · [MEDIUM] [CONFIRMED] · Three verbs for "delete-ish" — `Supprimer`, `Effacer`, `Retirer`

**Location:** `public/core/i18n.js` — destructive action keys:

| Verb | Keys | Scenario |
|---|---|---|
| `Supprimer` | `deleteEntry`, `deleteTemplate`, `deleteWeightEntry`, `customFoodDelete`, `recipeDelete`, `activityDelete` | Delete a record |
| `Effacer` | `clear`, `clearToday`, `mealPlanClearDay`, `fastingHistoryClear` | Clear / wipe a day or history |
| `Retirer` | `removePhoto`, `recipeRemoveComp`, `hydrationMinus` | Remove an ingredient / glass / photo |

**Evidence:**
The distinction seems intentional:
- `Supprimer` — a named record is destroyed (entry, template, recipe).
- `Effacer` — a time-scoped collection is reset (today, history).
- `Retirer` — a subitem is detached from a parent (photo from entry, ingredient from recipe).

But:
- Not all FR speakers instinctively parse that three-way split.
- `clearToday` and `clear` could arguably be `Supprimer tout` — ambiguous.
- EN translations collapse all three to "Delete" / "Clear" / "Remove" — same ambiguity.

**Impact:**
- Users may hesitate before tapping, unsure which is destructive and to what degree.
- Confirmation prompts (F-DCVW-03 below) only appear on some — inconsistent safety net.

**Recommendation:**
Either:
- **A (document):** Keep the three-way split; add a house rule: "Supprimer = named record, Effacer = timed collection, Retirer = detach subitem."
- **B (simplify):** Collapse to two — `Supprimer` (record-level deletes) and `Retirer` (reversible subitem detach). `Effacer` becomes `Supprimer tout`.

Prefer B — two clearer categories are easier than three nuanced ones. Separate commit.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes (copy-only).

---

## F-DCVW-03 · [MEDIUM] [CONFIRMED] · Confirmation warnings applied unevenly on destructive actions

**Location:** `public/core/i18n.js`.

**Evidence:**
- `mealPlanClearDayConfirm`: "Effacer le plan de ce jour ? **Cette action est irréversible.**"
- `mealPlanClearConfirm`: "Effacer tout le planning ?" — **no irréversible warning**.
- `fastingHistoryClear`: no confirm key found (may be inline).
- `clearToday`: no confirm key found.

**Impact:**
- Users destroying a single day get warned; users destroying the whole plan get a shorter prompt. The more destructive action has LESS friction — inverted.

**Recommendation:**
Unify destructive confirmations:
```
[Action] [Scope] ?
[Optional explanation]
Cette action est irréversible.
```
Apply to every `…Confirm` key:
- `mealPlanClearConfirm`: "Effacer tout le planning ? Cette action est irréversible."
- Add `clearTodayConfirm`, `fastingHistoryClearConfirm` with the same template.

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DCVW-04 · [LOW] [CONFIRMED] · Anglicism `Logger` — house decision needed

**Location:** `public/core/i18n.js` — multiple keys use `Logger`, `Log`:
- `Logger cette portion`
- `Logger poids`
- `Logger un poids par jour`
- `Logger des calories sans scanner…`
- (French) `Log un poids par jour` — inconsistent! Sometimes `Log`, sometimes `Logger`.

**Evidence:**
"Logger" is a French-ified tech anglicism, widespread in dev/startup French but absent from the Larousse dictionary. Standard French alternatives: "Enregistrer", "Consigner", "Noter dans le journal".

The character brief says *"Voice: warm + casual"* — casual accepts anglicisms. But:
- Inconsistent use of `Log` vs `Logger` even within FR strings.
- "Log un poids" is ungrammatical French (no verb conjugation).

**Impact:**
- Minor for the target audience (French tech users under 40 won't blink).
- But the inconsistency — sometimes `Log`, sometimes `Logger` — reads as translation errors.

**Recommendation:**
One-line house decision in `design-system.md §Copy`: *"Use `Logger` (verb) for the diary/log action. Use `Enregistrer` only for settings-save actions."*. Then sweep the ~12 `Log`/`Logger` keys to one form.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DCVW-05 · [LOW] [CONFIRMED] · No documented voice guide → character-copy coherence is implicit

**Location:** `docs/design-system.md §Character brief (v2)` mentions voice ("warm + casual + moderately expressive, Sage + Caregiver + Lover tertiary") but no examples-driven guide.

**Evidence:**
Contributors adding a new string have no "do this / not that" template.

**Impact:**
- New keys drift toward bland / formal / inconsistent.
- PR reviewers have nothing to cite when asking for rewording.

**Recommendation:**
One-page `docs/copy-voice.md`:
- **Do:** 5 example pairs (CTA, helper, empty, error, success) showing the target voice.
- **Don't:** 5 example pairs showing common off-voice phrasings.
- **Tu-form rule**, **case rule**, **emoji-prefix rule**, **ellipsis vs em-dash rule**.

**Effort:** Small (1 page of writing).
**Risk:** None.
**Preserves features:** Yes.

---

## F-DCVW-06 · [MEDIUM] [CONFIRMED] · Visual "warm" character + data-heavy dashboard copy create tension

**Location:** dashboard text examples (from inventory 04 + 01):
- `dashboard-remaining`: "Remaining 187 kcal / 12 g sugar / 1.8 g salt"
- `gap-closer`: "Manque 12 g de fibres : amandes · 38 g · …"
- Progress chart captions: "Poids (kg)", "Calories / jour", "Hydratation (ml)"

**Evidence:**
The visual brief says "warm, not clinical" — cream paper + tabular numerics are doing the heavy lifting to keep data feeling nice. But the copy leans technical: units in parentheses, bullet separators `·`, abbreviated macros ("g fibres").

**Impact:**
- Warm visual + technical copy = a tension. Users tolerate it for serious tracking apps; first-time visitors might read it as "this feels like a spreadsheet".
- Caregiver voice archetype doesn't deliver on a sentence that says "12 g de fibres".

**Recommendation:**
Soften high-visibility copy surfaces:
- Gap-closer: "Il te manque 12 g de fibres — essaye 38 g d'amandes." (adds pronoun + verb, humanizes)
- Remaining line: "Il te reste 187 kcal pour aujourd'hui." (current text may already be close).
- Progress chart captions: "Évolution du poids", "Calories par jour", "Hydratation quotidienne".

This is copy-level, doesn't touch math.

**Effort:** Small-Medium.
**Risk:** Low.
**Preserves features:** Yes.

---

## Dimension scorecard — §DCVW
| Metric | Value |
|---|---|
| Findings | 6 (MEDIUM×4, LOW×2) |
| CRITICAL | 0 |
| HIGH | 0 |
| Quickest win | F-DCVW-03 (unify destructive confirms — 3-5 string tweaks) |
| Highest impact | F-DCVW-01 (CTA voice rule — unblocks every future string review) |
