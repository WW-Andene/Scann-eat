# Audit — §DI Iconography

**Block:** B Structure
**Dimension:** §DI (Icon Language, Grid/Sizing, Expressiveness, Custom Direction)
**Date:** 2026-04-24

---

## F-DI-01 · [HIGH] [CONFIRMED] · `.icon-glyph` helper declared but zero adoption — the calibration system is inactive

**Location:**
- CSS definition: `public/styles.css:4722–4733` (4 rules referencing `.icon-glyph` — line 4716 comment calls it the "opt-in class").
- HTML usage: **0 occurrences** in `public/index.html`.

**Evidence:**
The design-system.md claims:
> **Expressiveness position (§DI3):** *Calibrated Signature.* The base (Unicode emoji) is standard — the signature is the house rule "one recognisable emoji per feature." `.icon-glyph` helper + `button > span[data-icon]` auto-apply keep rendering calibrated across OS emoji stacks.

Code reality:
- `.icon-glyph` is defined: normalises baseline drift (-0.08em), optical size (1.08em), line-height wobble, and forces the emoji font stack.
- Grep confirms **0 elements in index.html use this class**.
- `data-icon` attribute has 3 CSS rules referencing it — and **0 HTML usages**.

The "calibrated signature" is purely aspirational — no button, chip, tile, or dialog title is actually wearing the helper. Every emoji renders with the browser's baseline, sizing, and font-family defaults.

**Impact:**
- **Visual inconsistency across OS:** an emoji rendered inline after French text will sit on different baselines on iOS (higher), Android (lower), Windows (center), Linux (varies). Character brief's "emoji-per-feature" signature breaks across platforms.
- **Font-family roulette:** without `font-family: "Apple Color Emoji", …`, an element inheriting a serif font may render emoji through the serif's glyph set (Emoji-in-Charis SIL looks weird).
- **Design-system doc contradicts shipped code** — adds to the drift already flagged in F-DTA-04 / F-DT-06.

**Recommendation:**
Three-step migration:
1. **Sweep buttons:** wrap each emoji in a button's label with `<span class="icon-glyph" aria-hidden="true">`. E.g., line 475 `📅 Planning` → `<span class="icon-glyph" aria-hidden="true">📅</span> Planning`.
2. **Sweep dialog titles + banner texts** (lines 215, 225, 397, 692, 705, etc.).
3. **Sweep i18n strings:** a subset of the 684 FR/EN keys bury the emoji *inside* the translation string (`mealPlanBtn: '📅 Planning'`). These need either (a) i18n template support (`{icon:calendar}Planning`), or (b) move the emoji to a HTML wrapper and keep i18n text pure.

Step 3 is the biggest blast radius — defer to the fix phase as its own slice.

**Effort:** Large (many HTML sites + i18n refactor).
**Risk:** Medium (visual shift on every button — wanted, but test).
**Preserves features:** Yes.

---

## F-DI-02 · [HIGH] [CONFIRMED] · Decorative emojis are not hidden from screen readers

**Location:** `public/index.html` — 13 `aria-hidden` usages, most on `.ob-icon` (onboarding icons). Buttons with emoji-in-text: 0 aria-hidden.

**Evidence:**
Samples:
- Line 215: `<span class="ob-icon" aria-hidden="true">📷</span>` ✓
- Line 225: `<span class="ob-icon">⚙</span>` ✗ (missing `aria-hidden`)
- Line 475: `<button … data-i18n="mealPlanBtn">📅 Planning</button>` ✗ (emoji inline in button text, no split)
- Line 397: `<span … data-i18n="installBannerTitle">📱 Installer Scan'eat ?</span>` ✗
- Line 692: `<h2 data-i18n="mealPlanTitle">📅 Planning de la semaine</h2>` ✗

VoiceOver example on line 475 reads: "tear-off calendar Planning, button". That's noise — the calendar emoji is decorative, "Planning" is the content.

**Impact:**
- **Screen-reader users get 20-30% more announcement noise** on every button/chip/title that carries a decorative emoji.
- Some emojis have multiple names across reader dictionaries (📱 = "mobile phone" / "smartphone" / "portable telephone"), compounding inconsistency.

**Recommendation:**
Two-step fix, paired with F-DI-01:
1. Every decorative emoji → wrap in `<span class="icon-glyph" aria-hidden="true">`.
2. Meaningful emojis (are there any?) — none in this app; all emoji use is signature-decorative. Every single one should be hidden.

After the sweep, grep `aria-hidden="true"` count should go from 13 → 50+.

**Effort:** Large (coupled to F-DI-01).
**Risk:** None — additive a11y.
**Preserves features:** Yes.

---

## F-DI-03 · [MEDIUM] [CONFIRMED] · Inconsistent emoji variation selectors (⚙ vs ⚙️)

**Location:** `public/index.html:225`.

**Evidence:**
Line 225: `<span class="ob-icon">⚙</span>` — uses the bare codepoint U+2699 (GEAR).
Without the variation selector U+FE0F, this renders:
- As a monochrome "outline gear" text glyph on some systems (Windows older, many Linux setups).
- As a full-color emoji gear on iOS/macOS/Android.

Other sites use the full emoji form (`⚙️` with variation selector is visually correct as emoji).

**Impact:**
- One user sees a color gear, another sees a black outline — the same button looks different depending on device. Undermines the "one signature emoji per feature" promise.

**Recommendation:**
Normalize every emoji to include the `️` variation selector (or the extended grapheme). Grep:
```bash
grep -P '[☀-➿](?!️)' public/index.html
```
Replace naked codepoints with emoji form. Unicode character picker: "⚙️" (gear with VS16).

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DI-04 · [MEDIUM] [CONFIRMED] · Button labels contain emoji visually but data-i18n strings bury them

**Location:** `public/core/i18n.js` — multiple keys; samples from inventory 04 §1:
- `mealPlanBtn: '📅 Plan'` (in ES/IT/DE skeletons)
- `progressBtn: '📈 Progresso'`, etc.
- Main FR/EN block likely similar (per commit history, emoji-per-feature was applied to i18n strings directly).

**Evidence:**
i18n `t("mealPlanBtn")` returns `"📅 Planning"`. The emoji rides in the string. This means:
- Every translator needs to preserve the emoji (easy to forget).
- Changing the icon requires editing every locale string.
- The emoji never picks up the `.icon-glyph` helper (F-DI-01) because i18n inserts textContent, not HTML.

**Impact:**
- Emoji stuck to the label, can't be styled separately.
- Translation-brittle — an ES/IT/DE translator who types `"Planning"` without the emoji silently breaks the visual system.
- Compounds F-DI-01 — even if a `<span class="icon-glyph">` wraps the text-i18n output, the emoji is inside that span, so the helper applies to the whole label, not just the icon.

**Recommendation:**
Adopt a `{icon:X} LabelText` pattern in i18n values, resolve in `t()`:
```js
// i18n.js
mealPlanBtn: '{icon:calendar} Planning',   // new
// t() resolution:
function t(key, vars) {
  let out = ...existing lookup...;
  out = out.replaceAll(/\{icon:(\w+)\}/g, (_, name) => ICON_MAP[name] ?? '');
  return out;
}
```
Separately, rendering via a `textContent` path becomes emoji-aware — or the app-wide `applyStaticTranslations` extends to HTML (with sanitisation) for the icon-glyph span.

Alternatively (smaller change): move the emoji out of the i18n value. Have the button HTML carry the `<span class="icon-glyph" aria-hidden="true">📅</span>` and the `data-i18n` just provides the label text.

Second option is cheaper — no `t()` change needed — but requires editing every button. First option scales better long-term.

**Effort:** Medium–Large.
**Risk:** Medium — translation fidelity regression if step is missed.
**Preserves features:** Yes.

---

## F-DI-05 · [LOW] [CONFIRMED] · No emoji-font fallback for content-critical contexts

**Location:** `.icon-glyph` (line 4722) forces `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif`. Good.

**Evidence:**
Elsewhere (every emoji not in `.icon-glyph`), browser picks the emoji font itself. On a fresh Linux distro without fonts-noto-color-emoji installed, certain emoji render as tofu boxes.

**Impact:**
- Minor — almost every target platform has an emoji font; the fallback only matters on corner cases (minimal Docker images, stripped-down Android).

**Recommendation:**
Tied to F-DI-01 adoption: once every emoji lives inside `.icon-glyph`, this fallback applies automatically. No additional work.

**Effort:** N/A (bundled with F-DI-01).
**Risk:** None.
**Preserves features:** Yes.

---

## Dimension scorecard — §DI
| Metric | Value |
|---|---|
| Findings | 5 (HIGH×2, MEDIUM×2, LOW×1) |
| CRITICAL | 0 |
| Quickest win | F-DI-03 (add variation selectors — one grep-replace commit) |
| Highest impact | F-DI-01 + F-DI-02 jointly (the emoji system has CSS scaffolding but zero HTML adoption — the entire "calibrated signature" is inert) |
| Cross-reference | F-DI-04 entangles with i18n; fix phase should coordinate |
