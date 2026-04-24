# Audit — §DST State Design

**Block:** C UX
**Dimension:** §DST (Empty, Loading, Error, Success state design)
**Date:** 2026-04-24

---

## F-DST-01 · [LOW] [CONFIRMED] · Skeleton loaders are well-implemented — protect

**Location:** `public/styles.css:1732–2215` (+ `@keyframes skeleton-shimmer`).

**Evidence:**
```css
.dashboard-rows[aria-busy="true"]::before { /* gradient shimmer */ }
.dashboard-entries[aria-busy="true"]::before, ::after { ... }
@media (prefers-reduced-motion: reduce) { /* kill shimmer */ }
```
- Uses `aria-busy="true"` to signal state (ARIA-compliant).
- CSS-only, no JS toggling classes.
- Shimmer gradient uses `--panel-2` → `--panel-3` → `--panel-2` — palette-coherent.
- Reduce-motion kills the shimmer per WCAG 2.3.3.
- Skeleton variants: `.skeleton-card`, `.skeleton-progress`, `.sk-full/wide/short` for width presets.

**Impact:** Prevents Cumulative Layout Shift (CLS) on cold dashboard load — content lines up before data arrives. A core craft detail.

**Recommendation:**
- Document in `docs/design-system.md §States`.
- Add a regression test (or CSS pin comment): *"`aria-busy` skeletons are load-bearing — don't replace with spinners"*.

**Effort:** Trivial (documentation).
**Risk:** None.
**Preserves features:** Yes — protects a strength.

---

## F-DST-02 · [MEDIUM] [CONFIRMED] · 38 empty-state copy keys but tone is inconsistent (flat vs actionable)

**Location:** `public/core/i18n.js` — 38 keys matching `*Empty`.

**Evidence (samples from inventory 04):**
| Key | Tone | Offers CTA? |
|---|---|---|
| `dashEmpty` | flat ("Rien de loggé aujourd'hui.") | No |
| `recipeIdeasEmpty` | explanatory ("Pas d'idée cette fois — cet ingrédient est peut-être trop spécifique.") | Partial (explains cause) |
| `menuScanEmpty` | flat ("Aucun plat lisible sur la photo.") | No |
| `pantryEmpty` | imperative ("Ajoute au moins un ingrédient.") | Yes |
| `groceryEmpty` | flat ("Aucune recette à compiler.") | No |
| `customFoodsEmpty` | explanatory + CTA ("Pas encore d'aliment personnalisé — ajoute-en un pour l'utiliser dans tes repas.") | Yes |
| `recipeEmpty` | explanatory + 3 CTAs ("crée-en une, scanne une photo ou importe depuis un lien.") | Yes |

Of 38 `*Empty` keys sampled, roughly half offer a next step, half don't.

**Impact:**
- Users hitting a flat empty state wonder "what now?" — churn risk especially on first-use.
- `customFoodsEmpty` and `recipeEmpty` show the mature pattern; extending it to `dashEmpty`, `groceryEmpty`, `menuScanEmpty` would lift first-run UX.

**Recommendation:**
1. Write a house rule in `docs/design-system.md §States §Empty`:
   > Every empty state has three parts: **(1) state name + (2) reason/context + (3) one primary next step** (even if that step is "upload a photo" or "scan a product").
2. Rewrite the 15-20 flat keys per the template. Example:
   ```diff
   - dashEmpty: 'Rien de loggé aujourd\'hui.'
   + dashEmpty: 'Rien de loggé aujourd\'hui. Scanne un produit ou ajoute un repas rapidement avec le bouton + ci-dessus.'
   ```
3. Consider a visual pattern too — §DST1 says empty states should be *designed compositions* (illustration/icon + title + hint + CTA). Today empty states are typically just text.

**Effort:** Small–Medium (copy + small CSS pattern for the empty block).
**Risk:** None.
**Preserves features:** Yes (improves them).

---

## F-DST-03 · [MEDIUM] [CONFIRMED] · No dedicated `.empty` component — each empty state is inline HTML + CSS

**Location:** Grep shows only `.flag-col li.empty` (line 3873 — for ingredient flag columns). No generic `.empty-state` / `.empty-card` component class.

**Evidence:**
When a dialog or surface is empty, the code hides the main content and reveals a `<p>` or `<div>` with the empty-copy text. No consistent layout, no icon slot, no CTA slot.

From index.html (line 444+):
```html
<div class="skeleton-card">...</div>  <!-- loading -->
```
No equivalent `<div class="empty-card">`.

**Impact:**
- Contributors adding a new feature invent a new empty-state treatment each time.
- The character brief's "blank-notebook-page" treatment (commit message `923483e Move 4 — empty states as blank-notebook-page compositions`) ships unevenly.

**Recommendation:**
Define a reusable component:
```html
<div class="empty-state">
  <span class="empty-state-icon" aria-hidden="true">🍎</span>
  <h3 class="empty-state-title" data-i18n="...Empty.title">…</h3>
  <p class="empty-state-body" data-i18n="...Empty.hint">…</p>
  <button class="chip-btn accent empty-state-cta" data-i18n="...Empty.cta">…</button>
</div>
```
Plus CSS — `.empty-state { padding: var(--sp-7); text-align: center; … }`.

Migrate the 15-20 `*Empty` keys to the triple `…Empty.title` / `.hint` / `.cta` naming.

**Effort:** Medium (new pattern + per-feature adoption).
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DST-04 · [MEDIUM] [CONFIRMED] · Success moments exist as keyframes but aren't documented / consistently triggered

**Location:** `@keyframes scanneat-success-burst` (line 5204), `scanneat-milestone-pulse` (line 5975), `scanneat-grade-land` (line 4638).

**Evidence:**
Commit history flags success moments ran as part of the design polish:
- `609938d Move 5 — milestone success moments wired (A+ scan + streak days)`

So success bursts exist, and they're triggered for A+ scans + streak milestones. But:
- No documented list of WHEN a success burst fires.
- No test pinning the triggers.
- Easy to regress silently when refactoring the scan pipeline.

**Impact:**
- A signature "dopamine hit" — earning an A+ grade or hitting a streak milestone — is invisible to future contributors unless they trace commit history.

**Recommendation:**
1. Document in `docs/design-system.md §Motion §Signature Moments`:
   - When: scanning a product that scores A+.
   - When: hitting streak day N (3, 7, 14, 30).
   - When: completing a 16h fast for the first time in a week.
   - (etc. — enumerate the actual triggers)
2. Centralize the triggering logic in `public/core/presenters.js` or similar — one function `emitMilestoneMoment(kind)` — so the renderers don't each re-implement.

**Effort:** Small (doc) + Medium (consolidation).
**Risk:** Medium — changes the render path; regression-prone.
**Preserves features:** Yes (protects them).

---

## F-DST-05 · [MEDIUM] [CONFIRMED] · Loading state for async LLM operations is ad-hoc

**Location:** Scan/photo/menu pipelines in `public/app.js` — status messages at `#status`, `#qa-ai-status`.

**Evidence (from inventory 06):**
The scan pipeline has a "phase cycle" (1.5s rotating text in `#status`): "Lecture du code…" → "Recherche du produit…" → "Calcul du score…". Good contextual progress.

Elsewhere (photo identify, menu scan, recipe suggestions):
- Text-only `#qa-ai-status` updates ("Analyse en cours…").
- No skeleton, no progress bar, no percent.
- If the LLM is slow (10+ seconds), the user sees a flashing dot or a stale line.

**Impact:**
- Perceived slowness → users tap scan again, duplicate requests.
- Character brief says "snappy interaction"; 10s of pure text updates reads as "hung".

**Recommendation:**
1. For every async LLM call, show a skeleton OR progress indicator at the destination surface (not just the status line).
2. For photo identification: fade in a "photo-frame skeleton" with a soft pulse, resolving to the actual card once identify returns.
3. For long-running (>3s) operations: rotate a 3-step phase message ("Analyse de l'image…", "Identification de l'aliment…", "Reconciliation avec la base CIQUAL…").

**Effort:** Medium.
**Risk:** Low.
**Preserves features:** Yes.

---

## Dimension scorecard — §DST
| Metric | Value |
|---|---|
| Findings | 5 (MEDIUM×4, LOW×1) |
| CRITICAL | 0 |
| HIGH | 0 |
| Documented strength | F-DST-01 (skeleton loaders); F-DST-04 (success keyframes) |
| Quickest win | F-DST-01 + F-DST-04 (documentation of existing strengths) |
| Highest impact | F-DST-03 (empty-state component — unblocks future features) |
