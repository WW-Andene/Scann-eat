# Audit — §N Internationalization (i18n)

**Block:** D A11y / UX Flows / i18n
**Dimension:** §N (Locale coverage, translation correctness, RTL, lang-specific typography)
**Date:** 2026-04-24

---

## F-N-01 · [HIGH] [CONFIRMED] · 8 hardcoded French aria-labels bypass i18n

**Location:** `public/index.html` — bare-text aria-labels that lack `data-i18n-aria-label`:

| Line | Element | Hardcoded label |
|---|---|---|
| 120 | `#profiles-switch-select` | `aria-label="Changer de profil"` |
| 148 | `#reminder-hydration-every` | `aria-label="Fréquence (heures)"` |
| 436 | manual barcode input | `aria-label="Code-barres"` |
| 465 | view-toggle tablist | `aria-label="Vue"` |
| 528 | `#fasting-target` | `aria-label="Durée"` |
| 541 | `#weekly-bars` | `aria-label="Graphique barres 7 jours"` |
| 547 | `#monthly-bars` | `aria-label="Graphique barres 30 jours"` |
| 708 | `#grocery-text` | `aria-label="Liste de courses (texte)"` |

**Evidence:**
When a user switches to English in Settings, `applyStaticTranslations()` walks `[data-i18n]` elements and updates `textContent`. But `aria-label` attributes without `data-i18n-aria-label` are not touched. These 8 strings remain in French even when the UI is English.

**Impact:**
- Screen-reader users who chose EN hear a mix: "Change profile" (translated), "Changer de profil" (French, screen reader with FR voice may mispronounce in EN context).
- Severity amplified because i18n is a product promise; silent failures break the trust.

**Recommendation:**
Two-step fix:
1. Add `data-i18n-aria-label="key"` to each of the 8 elements (match an existing i18n key or add one).
2. Extend `applyStaticTranslations()` to walk `[data-i18n-aria-label]` and update `aria-label` attribute (may already exist — verify).

Keys to reuse or add:
- `profileSwitchA11y: "Change profile" / "Changer de profil"`
- `hydrationFreqA11y: "Frequency in hours" / "Fréquence en heures"`
- `barcodeInputA11y: "Barcode" / "Code-barres"`
- etc.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-N-02 · [MEDIUM] [CONFIRMED] · `{n} scan(s)` parenthetical-plural bypasses the plural-rules machinery

**Location:** `public/core/i18n.js` — multiple keys use English/French parenthetical-plural pattern:

```js
exportHistoryDone: '{n} scan(s) exporté(s)'   // FR
exportHistoryDone: '{n} scan(s) exported'     // EN
healthExported: '✓ Health export downloaded ({n} entries).'  // EN (no plural!)
```

**Evidence:**
The codebase has working plural-rules (42 `_one`/`_other` pairs like `streakDays_one`/`streakDays_other`). But `exportHistoryDone`, `healthExported`, `recentOverflow` and at least a dozen other numeric-bearing keys don't use it.

`{n} scan(s) exporté(s)` is French-legal but awkward typography. `{n} scan(s) exported` with EN plural rules would be `1 scan exported` / `2 scans exported` — which is what plural-rules could emit.

**Impact:**
- Inconsistent voice: streak uses pretty pluralization ("🔥 3 jours de suite"), export counter uses clumsy pluralization ("3 scan(s) exporté(s)").
- Languages where `(s)` doesn't work (Russian, Polish, Arabic) will read this weirdly.

**Recommendation:**
Migrate the dozen offending keys to `_one`/`_other` variants. Example:
```js
exportHistoryDone_one:   '{n} scan exporté',
exportHistoryDone_other: '{n} scans exportés',
```
`t('exportHistoryDone', { n: count })` — already dispatches to the correct variant per `Intl.PluralRules(currentLang)`.

**Effort:** Small–Medium.
**Risk:** None.
**Preserves features:** Yes (improves).

---

## F-N-03 · [MEDIUM] [CONFIRMED] · ES/IT/DE beta coverage at 2.9% — user exposure needs expectation-setting

**Location:** `public/core/i18n.js:1435–1503`, language picker in settings.

**Evidence (from inventory 04):**
- ES/IT/DE have 20 keys each (~2.9% vs FR/EN 684).
- Covered keys: settings language/theme, common CTAs (close, cancel, save), a handful of dashboard buttons, install banner.
- All other strings fall through to EN per the fallback chain.
- Settings label shows "(partiel · EN fallback)" — honest about it.

**Impact:**
- A user picking German sees: "Einstellungen" (settings header) but "Quick Add" (Quick Add button — EN fallback) in the same dashboard. Jarring.
- Dashboard macro labels remain EN. Grade verdicts remain EN. Error messages remain EN.
- The "(partial)" tag sets expectation — but a user doesn't realize the fallback is EN, not DE.

**Recommendation:**
Three options:
- **A (expand coverage):** bring ES/IT/DE to ~20-30% (core dashboard + common CTAs) via a dedicated translation pass. Medium effort.
- **B (prune locales):** drop ES/IT/DE from the picker. The "mainly French-speaking" audience (per brief) doesn't need these. Small effort; honest.
- **C (defer):** keep as-is with the clearer "(partial · EN fallback)" label, add a hint in onboarding that multiple locales are beta.

Decision requires product-owner input. Default to **B** for purity unless there's evidence of ES/IT/DE users.

**Effort:** Varies.
**Risk:** None (docs + language-picker change).
**Preserves features:** Yes.

---

## F-N-04 · [LOW] [CONFIRMED] · `appName` is hardcoded in HTML, not i18n

**Location:** `public/index.html:18`, `:40`.

**Evidence:**
`<h1>Scan'eat</h1>` appears in the header. The app name itself is a brand; likely should not translate. But:
- Tagline IS i18n'd (`tagline` key).
- The name is read by screen readers in whatever the html lang is; a user with DE lang will hear "scann-eat" with German phonetics.

**Impact:**
- Minor. Brand names typically stay untranslated.
- Consistency argument: having one i18n key `appName` makes the rename future-proof — if the product rebrands, one key update vs editing every HTML occurrence.

**Recommendation:**
Optional. If applied: `<h1 data-i18n="appName">Scan'eat</h1>` and `appName: 'Scan'eat'` (same in every locale). Zero runtime effect, future-proof for rebrands.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-N-05 · [LOW] [CONFIRMED] · Default language `en` when nav lang unsupported — conflicts with "French-first" brief

**Location:** `public/core/i18n.js:1519` — `return 'en';` at the end of `detectDefaultLang()`.

**Evidence:**
```js
function detectDefaultLang() {
  const saved = localStorage.getItem(LS_LANG);
  if (SUPPORTED_LANGS.includes(saved)) return saved;
  const nav = (navigator.language || 'fr').toLowerCase().slice(0, 2);
  if (STRINGS[nav]) return nav;
  return 'en';  // ← default fallback
}
```
- A user with navigator lang 'pt' or 'ja' → STRINGS['pt'] doesn't exist → default to EN.
- Per README: "A PWA for **French-speaking users**". First-line of brand.
- Would expect default to be FR for unknown nav locales.

**Impact:**
- Minor: users who don't have FR/EN/ES/IT/DE nav get English, which then cascades EN→FR→key. So they see EN. Design brief says French audience, so maybe they SHOULD see French.
- The `fr` branch in fallback chain (`t()` function: currentLang → en → fr → key) is a backup to EN — FR is never the primary fallback.

**Recommendation:**
Switch: default unknown lang to 'fr' to honor the brand. Or keep current — but document the decision.

```js
// Last line of detectDefaultLang():
return 'fr';  // brand default per docs/00-brief.md
```

Or make it configurable via a build-time constant.

**Effort:** Trivial.
**Risk:** None (1 line).
**Preserves features:** Yes.

---

## F-N-06 · [MEDIUM] [CONFIRMED] · No RTL support, no `dir` attribute handling

**Location:** `public/index.html:2` — `<html lang="fr">` with no `dir=` attribute (defaults to LTR).

**Evidence:**
- Not a problem for FR/EN/ES/IT/DE — all LTR.
- Future Arabic / Hebrew / Persian locale would require:
  - `<html dir="rtl">` for RTL languages.
  - CSS logical properties (`margin-inline-start` instead of `margin-left`) where ordering matters.
  - Icon flips for chevrons, arrows.

Currently CSS uses `margin-left`/`right` literally (inventory 02 doesn't specifically count these but they exist).

**Impact:**
- Strictly a future concern. Current 5 locales all LTR.
- Documenting the gap prevents silent drift when a future contributor tries to add Arabic.

**Recommendation:**
1. Document in `ASSUMPTIONS.md`: "Scan'eat is LTR-only. Adding RTL locales requires (a) adopting CSS logical properties, (b) setting `<html dir>` from currentLang, (c) icon flip rules."
2. Low-effort prep: for every NEW rule, prefer logical properties (`padding-inline`, `margin-block`, `border-inline-end`). Don't migrate existing rules — too much blast.

**Effort:** Trivial (documentation).
**Risk:** None.
**Preserves features:** Yes.

---

## Dimension scorecard — §N
| Metric | Value |
|---|---|
| Findings | 6 (HIGH×1, MEDIUM×3, LOW×2) |
| CRITICAL | 0 |
| Quickest win | F-N-04 (appName wrap) or F-N-05 (default FR) — both 1 line |
| Highest impact | F-N-01 (8 hardcoded aria-labels — silent i18n failure) |
| Deferred | F-N-03 (ES/IT/DE coverage decision — product owner) |
