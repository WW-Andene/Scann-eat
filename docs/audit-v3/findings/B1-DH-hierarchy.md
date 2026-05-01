# Audit — §DH Hierarchy & Gestalt

**Block:** B Structure
**Dimension:** §DH (Visual Hierarchy, Heading Semantics, Gestalt Grouping)
**Date:** 2026-04-24

---

## F-DH-01 · [MEDIUM] [CONFIRMED] · Dashboard tiles have no semantic heading structure

**Location:** `public/index.html` — `#daily-dashboard` contents (lines 462–570).

**Evidence:**
The dashboard holds 6 "tile" surfaces: `#dashboard-streak`, `#dashboard-remaining`, `#weight-summary`, `#fasting-tile`, `#hydration-tile`, `#activity-tile`, plus `#dashboard-rows` and `#dashboard-log`.

Only ONE `<h2>` exists in the dashboard (line 464: "Aujourd'hui · date"). The tiles themselves:
- `#hydration-tile` uses `aria-labelledby="hydration-label"` ✓ (pattern that works)
- `#dashboard-streak`, `#dashboard-remaining`, `#weight-summary`, `#fasting-tile`, `#activity-tile` — no `<h3>`, no `aria-labelledby`, no `role="region"` — they're visual blocks with no semantic boundary.

**Impact:**
- **Screen reader flow:** A user arrowing through the dashboard hears "140 calories" then "12 minutes" then "68 kg" then "3 glasses" in a flat stream. No "Remaining", "Fasting", "Weight", "Hydration" section headings. Can't jump between sections via rotor.
- **Landmark economics:** `daily-dashboard` is one big bucket; screen-reader users who want to "skip to weight" can't.
- **Keyboard nav:** Tab order threads through buttons but skipping between tiles requires landing on a button — no per-tile boundary.

**Recommendation:**
One of two patterns, applied uniformly to every tile:
- **Option A (light touch):** Wrap each tile in a `<section aria-labelledby="tile-X-label">` with a visually-hidden `<h3 id="tile-X-label">` containing the tile name.
- **Option B (semantic + visible):** Add a visible `<h3>` inside each tile (with `--text-xs` or `.sr-label` class depending on whether the design wants to show it).

Tile names to use (from i18n keys): `streakLabel`, `remainingLabel`, `weightSummaryLabel`, `fastingLabel`, `hydrationLabel`, `activityLabel`.

Hydration's existing pattern (`aria-labelledby` to an inline label) is the model — apply it to the other 5.

**Effort:** Small (6 tiles × 2 lines).
**Risk:** None — additive.
**Preserves features:** Yes.

---

## F-DH-02 · [MEDIUM] [CONFIRMED] · 11 `<section>` siblings in `<main>` — no landmark regions, no aria-labelledby

**Location:** `public/index.html` — `<main>` direct children.

**Evidence:**
Every section in main:
```
alternatives  comparison  daily-dashboard  error  gap-closer  monthly-view
pairings      recent-scans  result  status  weekly-view
```
11 sections. None carry `role="region"` or `aria-labelledby` to their visual heading.

**Impact:**
- WAI-ARIA: a `<section>` is only promoted to a landmark when it has an accessible name. Currently these render as generic DIV-like regions in the a11y tree.
- Screen-reader rotor shows 2 landmarks total (banner + main) when it should show 8+ (main → sub-landmarks for dashboard, result, recent-scans, gap-closer, pairings, alternatives at minimum).
- Jump-to-result after a scan is impossible via rotor.

**Recommendation:**
For each section that has a visible heading nearby, add `aria-labelledby` to the existing heading's id. Sections without a heading get a visually-hidden `<h2>` or an `aria-label="…"` fallback.

Mapping (propose):
| Section | heading source |
|---|---|
| `daily-dashboard` | h2 "Aujourd'hui · date" → add id, reference it |
| `result` | grade + product name — add `aria-label` from product name or a visually-hidden h2 |
| `recent-scans` | visually-hidden "Scans récents" h2 |
| `gap-closer` | existing h3 `gap-closer-title` — promote reference |
| `pairings` | visually-hidden h2 |
| `alternatives` | visually-hidden h2 |
| `comparison` | visually-hidden h2 |
| `weekly-view`, `monthly-view` | visually-hidden h2 |
| `error` | `role="alert"` instead of `role="region"` |
| `status` | `role="status"` + `aria-live` (already present) |

**Effort:** Small.
**Risk:** None — additive.
**Preserves features:** Yes.

---

## F-DH-03 · [LOW] [CONFIRMED] · Two `<h1>` elements in DOM (one in noscript)

**Location:** `public/index.html:18` + `:40`.

**Evidence:**
- Line 18: `<h1>Scan'eat</h1>` inside `<noscript>` fallback content.
- Line 40: `<h1>Scan'eat</h1>` inside `<header role="banner">` — the shipped UI.

**Impact:**
- With JS disabled, the noscript h1 shows; JS-enabled users never see it.
- Screen readers consider noscript content in their DOM — *technically* two h1 elements exist.
- Most screen-reader rotors only announce the visible h1; minor concern.

**Recommendation:**
Change the noscript `<h1>` to `<h2>` OR wrap the whole noscript block in a `<section aria-labelledby="noscript-title">` with the heading kept. Trivial.

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-DH-04 · [LOW] [CONFIRMED] · `progress-dialog` demonstrates a clean h2→h3 pattern — spread it

**Location:** `public/index.html:642–654`.

**Evidence:**
```html
<h2 id="progress-dialog-title">Progrès</h2>
<h3 class="progress-section-title" data-i18n="progressWeight">Poids (kg)</h3>
<h3 class="progress-section-title">Calories / jour</h3>
<h3 class="progress-section-title">Hydratation (ml)</h3>
```

This is the clearest sectioning pattern in the codebase — dialog title + per-section h3 labels.

**Impact:** A good convention that isn't generalised. Settings dialog (with 8+ sections) would benefit; Profile dialog (with 6+ fieldsets) uses `<legend>` which is fine but inconsistent with Progress.

**Recommendation:**
Document in `design-system.md §Accessibility` as the canonical dialog-section pattern. Optionally spread to Settings and Recipes-edit dialogs in a later sweep.

**Effort:** Trivial (documentation).
**Risk:** None.
**Preserves features:** Yes (documents a strength).

---

## F-DH-05 · [MEDIUM] [CONFIRMED] · Visual hierarchy of dashboard tiles is equal-weight by default — the KPI doesn't stand out

**Location:** `public/styles.css` — `.dashboard-tile`, `.tile` (grep for actual class).

**Evidence (inventory-level):**
From the commit history (`ba6a2f1 Ship — dashboard tile focal hierarchy (§E2 from app-audit)`, `80be199 Structural — dashboard tile grid`), recent work tried to address this. Current state per inventory 03:
- Six tiles (streak, remaining, weight, fasting, hydration, activity) rendered in a grid.
- `#dashboard-remaining` is conceptually the daily KPI ("how many kcal left").

The recent commit `f4ec0a1 Refine 6 — dashboard-remaining as the daily KPI banner` suggests it's been elevated — needs visual verification in the audit.

**Impact (pending visual audit):**
If tiles are visually equal-weight, a first-time user's eye has no focal point → the "information dense" dashboard feels like a wall of numbers.

**Recommendation:**
Deferred to **Phase 2C §DH visual re-scan** (requires launching the app to screenshot). For now: open question — is `#dashboard-remaining` ACTUALLY the tallest / most saturated / most centered tile? If not, promote it.

**Effort:** TBD after visual check.
**Risk:** Medium (could break recent design work).
**Preserves features:** Yes.

---

## F-DH-06 · [LOW] [CONFIRMED] · 11 section siblings under `<main>` without a grouping rhythm

**Location:** `public/index.html` — sections appear in this DOM order:
```
status → daily-dashboard → result → alternatives → comparison
→ pairings → recent-scans → weekly-view → monthly-view → gap-closer → error
```
(roughly; inspect for exact order)

**Evidence:**
These are not all equal-citizen sections:
- `status`, `error` are **transient** notifications.
- `result`, `alternatives`, `comparison`, `pairings` are **scan-result** sub-regions; they only render after a scan.
- `daily-dashboard`, `recent-scans`, `weekly-view`, `monthly-view`, `gap-closer` are **home-screen** surfaces.

The DOM treats all 11 as siblings. CSS hides the result bundle until a scan happens.

**Impact:**
- When none of result/alternatives/comparison/pairings is populated, they still occupy DOM space (usually `hidden`). Screen readers see 11 siblings; visual users see 4.
- Semantically, `result`+`alternatives`+`comparison`+`pairings` are a *group*. There's no `<article>` or `<section>` wrapping them.

**Recommendation:**
Wrap scan-result sections in one `<article id="scan-result-article" aria-labelledby="result-product-name">`:
```html
<article id="scan-result-article" aria-labelledby="result-product-name">
  <section id="result"> ... </section>
  <section id="alternatives"> ... </section>
  <section id="comparison"> ... </section>
  <section id="pairings"> ... </section>
</article>
```
This is also a structural invitation to hide the whole group with one `hidden` attribute instead of four.

**Effort:** Small.
**Risk:** Low — must verify CSS doesn't depend on the sibling flat-list layout.
**Preserves features:** Yes.

---

## Dimension scorecard — §DH
| Metric | Value |
|---|---|
| Findings | 6 (MEDIUM×3, LOW×3) |
| CRITICAL | 0 |
| HIGH | 0 |
| Quickest win | F-DH-03 (noscript h1 → h2, one line) |
| Highest impact | F-DH-01 + F-DH-02 (every landmark + tile gets a name → screen reader rotor usable) |
| Deferred | F-DH-05 (needs visual inspection) |
