# Copy Quality Inventory (04)

**Source:** `public/core/i18n.js` (1598 lines, 77 KB)
**Date:** 2026-04-24
**Method:** Direct grep + awk + targeted Reads. Facts only.

---

## 1. Shape of `STRINGS`

```js
export const STRINGS = {
  fr: { ... 684 keys ... },     // lines 10–717 (main block)
  en: { ... 684 keys ... },     // lines 718–1427 (main block)
};
STRINGS.es = { ~20 keys };      // lines 1435–1462 (skeleton)
STRINGS.it = { ~20 keys };      // lines 1463–1489 (skeleton)
STRINGS.de = { ~20 keys };      // lines 1490–1503 (skeleton)
```

- **FR + EN are parallel:** both have 684 keys each (awk count).
- **ES/IT/DE are skeletons:** ~20 UI-shell keys apiece — explicitly documented at line 1430:
  > "We only ship a small hand-translated set of UI-shell keys … every other key falls through to the English block via the fallback chain."

The skeleton covers: `settingsLanguage`, `theme*`, `settings`, `close`, `cancel`, `save`, `quickAdd`, `recipesBtn`, `customFoodsBtn`, `weightBtn`, `progressBtn`, `mealPlanBtn`, `installBanner*`.

### Fallback chain (lines 1534–1568)
```
t(key) → STRINGS[currentLang][key]
       → STRINGS.en[key]
       → STRINGS.fr[key]
       → key (literal)
```
Plural-aware via `Intl.PluralRules(currentLang)` checking for `<key>_one` / `<key>_other` variants.
`{varname}` template slots replaced via `replaceAll`.

### Default language (lines 1508–1520)
- Reads `localStorage.scanneat.lang` first.
- Else navigator.language (first 2 chars); if no STRINGS table matches, defaults to **`en`** (not `fr`).
- FR only becomes default if explicit navigator or saved preference.

### `applyStaticTranslations` (line 1584)
- **DOES** sync `document.documentElement.lang = currentLang` on every call.
  ⇒ *Correction: inventory 05 (a11y) initially flagged "lang never syncs" as CRITICAL — that finding is incorrect. Lang DOES sync.*

---

## 2. Voice sample (FR vs EN, 20 representative keys)

| Key | FR | EN | Notes |
|---|---|---|---|
| `appName` | _not in dict — hardcoded "Scan'eat" in HTML_ | same | |
| `tagline` | "Photographie une étiquette → note de 0 à 100" | "Photograph a label → score out of 100" | Imperative; tu-form implicit |
| `settingsKey` | "Clé API Groq" | "Groq API key" | Noun-style label |
| `settingsKeyHint` | "Stockée uniquement sur ton appareil (localStorage). Nécessaire dans l'APK ou en mode direct." | "Stored only on your device (localStorage). Required inside the APK or in direct mode." | **Tu-form** in FR |
| `modeAuto` | "Auto (serveur, fallback direct)" | "Auto (server, fallback direct)" | Parenthetical note |
| `install` | "Installer" | "Install" | CTA, no caps |
| `recipeIdeasEmpty` | "Pas d'idée cette fois — cet ingrédient est peut-être trop spécifique." | "No ideas this time — this ingredient may be too specific." | Em-dash; offers reason |
| `menuScanEmpty` | "Aucun plat lisible sur la photo." | "No legible dishes on the photo." | Flat; no "try again" hint |
| `exportHistory` | "Exporter l'historique" | "Export history" | Verb+noun; FR has article |
| `exportHistoryDone` | "{n} scan(s) exporté(s)" | "{n} scan(s) exported" | Parenthetical plural — NOT using the plural-rule machinery |
| `exportHistoryEmpty` | "Aucun scan à exporter" | "No scans to export" | |
| `csvImportUnknown` | "Format CSV non reconnu. Supporté : exports MyFitnessPal et Cronometer Servings.csv." | "CSV format not recognised. Supported: MyFitnessPal exports and Cronometer Servings.csv." | FR uses space-before-colon (correct FR typography) |
| `telemetryExported` | "✓ Journal exporté (.txt)" | "✓ Log exported (.txt)" | Checkmark emoji used as success icon |
| `recentOverflow` | "{shown} affichés sur {total}. L'export contient tout." | "{shown} shown of {total}. The export contains everything." | Two-sentence; vars interpolated |
| `onboarding3Title` | "Configurable, hors ligne, exportable" | "Configurable, offline, exportable" | Trio rhythm |
| `healthExported` | (not sampled) | "✓ Health export downloaded ({n} entries)." | |
| `settings` | "Réglages" | "Settings" | Noun |
| `theme` | "Thème" | "Theme" | |
| `save` | "Sauvegarder" | (sampled under CTA "Save") | |

**FR voice observation (fact):** tu-form consistently used ("ton appareil"). Not vous-form. Sentence case, not title case. Em-dashes and ellipses used. Space-before-colon follows French typography.

**EN voice observation (fact):** British spelling ("recognised" not "recognized"). Casual + direct. Same sentence case as FR.

---

## 3. Error + empty-state copy (pattern grep)

Keys matching the empty/error patterns (sample — not exhaustive):
- `recipeIdeasEmpty`: FR explains + gives a possible reason. EN same.
- `menuScanEmpty`: flat "No legible dishes" — no recovery CTA.
- `exportHistoryEmpty`: "Aucun scan à exporter" / "No scans to export" — flat.
- `csvImportUnknown`: identifies unsupported + lists supported formats. Good.

Pattern observation: empty states either (a) flatly state the fact, or (b) state + reason, rarely (c) state + reason + recovery CTA. The audit should check for inconsistency.

---

## 4. Terminology consistency (fact-level — not assessment)

Sampled concepts:
| Concept | FR variants seen | EN variants seen |
|---|---|---|
| API key | `settingsKey` "Clé API Groq" | "Groq API key" |
| Save | `save` "Sauvegarder" | "Save" |
| Log / record entry | `logIt`, `logEntry`, `logBtn`, `logged` (various derived keys) | same pattern |
| Macro labels | `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `salt_g` (keys) — displayed strings include "kcal", "protéines", "lipides" | kcal, protein, carbs, fat, fiber, salt |
| Diet constraint | `diet`, `dietHalal`, `dietVegan`, `dietGlutenFree` etc. | same stems |
| Install CTA | `install`, `installBannerTitle`, `installBannerAccept` | parallel |

(Deeper grep pass deferred to audit Phase 2 §DCVW — "copy × visual alignment" is where terminology drift gets flagged.)

---

## 5. Emoji-per-feature

Sampled from keys containing emoji (selection):
| Emoji | Feature / key |
|---|---|
| 📅 | `mealPlanBtn` "Plan" |
| 🥕 | Pantry button (checked in index.html) |
| 🛒 | Grocery list btn |
| 🎯 | Gap-closer section |
| 💡 | Recipe ideas btn |
| 📜 | Menu scan |
| 📸 | Photo |
| 📱 | Install banner |
| 👤 | Profile button |
| ⚙️ | Settings button |
| 📈 | `progressBtn` "Progress" |
| ✓ | Success toast prefix |

(Design-system.md claims "one recognisable emoji per feature". Inventory confirms this pattern on the buttons surveyed. Deeper cross-check of drift deferred to audit.)

---

## 6. Length pressure — sampled longer FR strings

Notable long strings (sampled from line counts above 100 chars):
- `settingsKeyHint` FR: 102 chars — two sentences.
- `csvImportUnknown` FR: 97 chars — one sentence with colon.
- `recentOverflow` FR: 68 chars — two sentences.

These fit normal panels but can wrap awkwardly in narrow mobile chips. Audit Phase 2 §DT should check wrap behaviour.

---

## 7. Beta locale coverage (ES / IT / DE)

All three locales share the same ~20 keys (by design), covering:
- `settingsLanguage`, `theme`, `themeDark/Light/Auto`
- `settings`, `close`, `cancel`, `save`
- `quickAdd`, `recipesBtn`, `customFoodsBtn`, `weightBtn`, `progressBtn`, `mealPlanBtn`
- `installBannerTitle`, `installBannerHint`, `installBannerAccept`, `installBannerDismiss`

**Coverage %:** ~20 ÷ 684 ≈ **2.9%** per beta locale. The remaining 97.1% of strings will surface in English per the fallback chain.

| Lang | Keys | % vs FR | Notes |
|---|---|---|---|
| fr | 684 | 100.0% | Primary |
| en | 684 | 100.0% | Primary |
| es | 20 | 2.9% | Beta — EN fallback for everything else |
| it | 20 | 2.9% | Beta — EN fallback |
| de | 20 | 2.9% | Beta — EN fallback |

The language-picker in settings labels ES/IT/DE options with "(partiel · EN fallback)" / "(partial · EN fallback)" so users opting in are informed.

---

## 8. Raw numbers
| Metric | Value |
|---|---|
| Total lines (i18n.js) | 1598 |
| FR keys | 684 |
| EN keys | 684 |
| ES keys | 20 |
| IT keys | 20 |
| DE keys | 20 |
| `t()` fallback chain | currentLang → en → fr → literal |
| Plural-rules support | Yes (`Intl.PluralRules`, `_one`/`_other` suffix lookup) |
| Variable interpolation | `{name}` → `vars.name` via `replaceAll` |
| `document.documentElement.lang` sync | **Yes** (line 1585, on every `applyStaticTranslations` call) |

---

## 9. Anomalies (facts for audit)
- **`{n} scan(s)` is parenthetical-plural style in both FR/EN** rather than using the plural-rules machinery (`exportHistoryDone_one` / `_other`). The plural machinery IS implemented and used elsewhere, but this key doesn't use it. Inconsistent.
- **Hardcoded labels bypass i18n** — inventory 01 noted some aria-labels are hardcoded French (barcode input, grocery textarea). These would not translate when the user switches language.
- **Default lang is `en`** when nav lang isn't FR/EN — the README/brief implies primary audience is French, but default fallback is English.
- **No `appName` key** — "Scan'eat" is hardcoded in `<h1>`. Intentional? Or translation gap?
- **No dedicated `disclaimer` or `medicalNotMedicalAdvice` keys found in the sample** — PRIVACY.md mentions "indicative values" but where is that phrase rendered?
