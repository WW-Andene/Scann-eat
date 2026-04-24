# Audit — §DCO Component Character

**Block:** B Structure
**Dimension:** §DCO (Buttons, Inputs, Cards, Navigation, Modals, Toasts)
**Date:** 2026-04-24

---

## F-DCO-01 · [HIGH] [CONFIRMED] · `.chip-btn` defined three times across evolution layers — declaration drift risk

**Location:** `public/styles.css:429–444`, `:4326–4341`, `:4598+`.

**Evidence:**
Three separate `.chip-btn { … }` rule blocks:

**Block A (line 429 — original):**
```css
.chip-btn {
  background: transparent;
  color: var(--text);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--r-pill);
  padding: 10px 16px;
  font-size: var(--text-sm, 0.85rem);
  min-height: 40px;
  font-weight: 500;
}
```

**Block B (line 4326 — "Step N" overlay):**
```css
.chip-btn {
  min-height: 40px;
  border-radius: var(--r-pill);
  font-size: var(--text-sm);
  font-weight: 600;   /* ← was 500 in Block A */
  letter-spacing: 0;
  box-shadow: none;
}
```

**Block C (line 4598 — transitions):**
```css
.chip-btn, .dash-entry-del, …, .act-entry-del {
  transition: transform var(--motion-fast) var(--ease-ui),
              background var(--motion-base) var(--ease-ui),
              color var(--motion-base) var(--ease-ui);
}
```

Block B overrides Block A's `font-weight: 500 → 600`. A contributor editing Block A would not discover Block B until a render diff appeared.

**Impact:**
- **Silent rule conflicts:** changing Block A's `padding` does nothing on `.chip-btn.compact` because Block B redefines padding in `.compact`.
- **Spec archaeology:** the cascade reads like a commit log, not a specification.
- This is the structural flaw behind design-system drift — F-DTA-04 (doc mentions 53 tokens), F-DT-06 (stale type scale), and F-DTA-06 (5 `:root` blocks) are all the same pattern.

**Recommendation:**
Commit: *"styles: consolidate .chip-btn into a single rule block"*.
- Merge blocks A + B into one authoritative rule at the top of the components section.
- Move the shared transition (Block C) to a single `transition:` declaration on the consolidated rule.
- Delete the now-empty override blocks. Pin the final declaration with a header comment: *"Canonical — if you're editing two places, one of them is wrong."*

Generalize: do the same for `.grade`, `.score-card`, `.meal-section`, `.dash-row`, `.pairing-chip` — any class with ≥ 2 declaration blocks.

**Effort:** Medium.
**Risk:** Medium — visual regression surface. One component per commit; eyeball each.
**Preserves features:** Yes.

---

## F-DCO-02 · [MEDIUM] [CONFIRMED] · Button press-scale values vary by component (design drift)

**Location (press scales per button family):**
- `.settings-btn:active { transform: scale(0.94); }` — line 361
- `.capture-btn:active { transform: scale(0.985); }` — line 688
- `.log-btn:active { transform: scale(0.985); }` — line 3557
- `.chip-btn:active` — scale via the shared transition block (4598+) — check exact value
- `.chip` (generic) — no documented press scale, relies on default

**Evidence:**
Three distinct press-feedback scales in the shipped component set: `0.94`, `0.985`, and whatever `.chip-btn` implements. See cross-ref **F-DM-03** (5 press-scale values in total).

**Impact:**
- Tactile feel is inconsistent: settings-btn snaps harder (0.94) than capture/log buttons (0.985). Users don't consciously notice but can sense "buttons behave differently" — undermines the character brief's unified interaction promise.

**Recommendation:**
Post F-DM-03 adoption (`--scale-press: 0.96`, `--scale-press-sm: 0.94`): audit each button and pick the right token.
- `.settings-btn` (icon, tiny target) → `--scale-press-sm` = 0.94 ✓
- `.capture-btn`, `.log-btn` (hero CTAs) → `--scale-press` = 0.96 (slightly stronger than current 0.985 — more tactile)
- `.chip-btn` → `--scale-press` = 0.96

**Effort:** Small (after F-DM-03).
**Risk:** Low — 1–2 pt scale diff imperceptible but more unified.
**Preserves features:** Yes.

---

## F-DCO-03 · [HIGH] [CONFIRMED] · Inputs have focus-visible state but no consistent hover / disabled / invalid treatment

**Location:** `public/styles.css:398–400` + `4452–4454` (duplicate-layer pattern similar to F-DCO-01).

**Evidence:**
- `input:focus-visible, select:focus-visible, textarea:focus-visible` rules exist (covered twice).
- No `:hover` rule for inputs — hovering a text field shows no feedback.
- No `:disabled` rule for inputs beyond the token default — disabled state relies on browser default opacity.
- No `:invalid` / `:required` styling — client-side validation is silent visually.
- No `::placeholder` rule until line 4843 — placeholders inherit the text color (probably fine, but worth a unified `--text-placeholder` token).

**Impact:**
- Users can't tell a required field from an optional one — WCAG 3.3.2 (Labels or Instructions) wants visual + textual hints.
- Disabled form controls look nearly identical to enabled — risk of users trying to interact.
- The Profile dialog (6+ fieldsets with numeric inputs) is where this bites hardest — no immediate feedback on invalid BMR inputs or nonsensical macro splits.

**Recommendation:**
Add a unified input-state block:
```css
input:not(:disabled):hover,
select:not(:disabled):hover,
textarea:not(:disabled):hover {
  border-color: var(--border-strong);
}
input:disabled, select:disabled, textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--panel-3);
}
input:invalid:not(:placeholder-shown),
select:invalid {
  border-color: var(--danger);
}
::placeholder { color: var(--muted); opacity: 1; }
```
Extend the profile dialog's existing macro-sum validation to use `:invalid` styling.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DCO-04 · [MEDIUM] [CONFIRMED] · Toast component lacks a documented role / ARIA pattern beyond `role="status"`

**Location:** `public/styles.css:112+` (`.app-toast`), `public/app.js toast()` helper.

**Evidence (from inventory 01 + 05):**
- Toast element has `role="status"` + `aria-live="polite"`.
- Variants: `[data-variant="warn"]`, `[data-variant="error"]`, `[data-variant="ok"]` — each adds a 4px left inset stripe.

Missing:
- Error toasts (`data-variant="error"`) should use `role="alert"` (or `aria-live="assertive"`) for urgency — currently they're polite like success toasts.
- Undo action button (`.app-toast-action`) has no keyboard indication when it appears — focus doesn't auto-move to it, and the toast auto-dismisses in 2.6s which may be faster than a keyboard user can tab to it.

**Impact:**
- Blind users don't hear errors urgently — they're read when the screen-reader reaches a pause, after any in-progress announcement finishes.
- Undo action inaccessible to keyboard-only users under 2.6s (WCAG 2.2.1 Timing Adjustable).

**Recommendation:**
1. When `data-variant="error"` is set, also set `role="alert"` dynamically (JS).
2. When a toast includes an `.app-toast-action`, extend the auto-dismiss to at least 10s (WCAG recommendation) OR pause the timer while the toast has keyboard focus.
3. Add `aria-label="Notification action"` to the action button.

**Effort:** Small.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DCO-05 · [MEDIUM] [CONFIRMED] · Four button families with overlapping visual language

**Location:** `.settings-btn`, `.chip-btn`, `.capture-btn`, `.log-btn`, plus `.secondary` modifier.

**Evidence:**
The component DNA (design-system.md) says:
> **Card · Chip · Row** — everything else composes from these three.

In practice the button surface has:
- `.settings-btn` — icon button (gear, profile).
- `.chip-btn` — general pill; `+.accent` = primary action, `+.compact` = smaller.
- `.capture-btn` — the big scan-label hero button.
- `.log-btn` — log-this button at end of scan flow.
- `.secondary` — modifier class used cross-family.

Five classes for four visual shapes. The design-system.md declares three primitives; the code ships five.

**Impact:**
- Contributor question "which button should I use for X?" has no canonical answer.
- `.capture-btn` and `.log-btn` share 90% of their rules (both have `filter: brightness(1.05)` on hover, `scale(0.985)` on active) but are two separate classes.

**Recommendation:**
Consolidate to three:
- `.btn.icon` = icon-only (replaces `.settings-btn`).
- `.btn.chip` = pill button (`.chip-btn`); modifiers `.accent` + `.compact` stay.
- `.btn.hero` = large display CTA (replaces `.capture-btn` + `.log-btn`); modifier `.scan` / `.log` for any per-context tweak.

Migrate in 3 separate commits (one per family). Keep old class names as aliases during the migration: `.capture-btn, .btn.hero.scan { … }`.

**Effort:** Large (systematic HTML + CSS updates).
**Risk:** Medium — every button on every surface renders through this.
**Preserves features:** Yes.

---

## F-DCO-06 · [LOW] [CONFIRMED] · No documented card variant ladder

**Location:** `public/styles.css` — card classes scattered.

**Evidence:**
Cards-class usage per inventory 02/05:
- `.result`, `.product`, `.score-card`, `.recipe-idea-card`, `.meal-section`, `.tile`, `.hydration-tile`, `.fasting-tile`, `.activity-tile`, `.weight-tile` (?), dialog `.settings-dialog`, ... 10+ "card-like" surfaces.

No shared `.card` base class. Each declares its own padding, radius, elevation, background.

**Impact:**
- Adding a new card = reinventing the 6 rules (bg, padding, radius, shadow, border, color).
- Changes to card baseline (e.g., "bump radius from --r-md to --r-lg") require 10+ edits.

**Recommendation:**
Declare a `.card` base:
```css
.card {
  background: var(--panel);
  padding: var(--sp-5);
  border-radius: var(--r-md);
  box-shadow: var(--elev-1);
}
```
Migrate existing cards over time — one feature per commit. Variants (`.card.tile`, `.card.result`) layer on top.

**Effort:** Medium.
**Risk:** Medium (regression surface).
**Preserves features:** Yes.

---

## Dimension scorecard — §DCO
| Metric | Value |
|---|---|
| Findings | 6 (HIGH×2, MEDIUM×3, LOW×1) |
| CRITICAL | 0 |
| Quickest win | F-DCO-04 (toast role="alert" — 1 JS line) |
| Highest impact | F-DCO-01 (consolidate `.chip-btn` three-layer drift — unblocks design-system audit trail) |
| Systemic | F-DCO-01 is the SAME pattern as F-DTA-06 — "evolution layers that never collapsed" is the repo-wide tax |
