# Audit — §DTA Design Token Architecture

**Block:** A Foundation
**Dimension:** §DTA (design-aesthetic-audit-SKILL)
**Source inventory:** `docs/audit-v3/inventory/02-tokens-and-css.md`
**Date:** 2026-04-24

---

## F-DTA-01 · [HIGH] [CONFIRMED] · Ten tokens defined but never referenced

**Location:** `public/styles.css` (various `:root` / `[data-theme]` blocks around lines 4170, 4478, 4529+)

**Evidence (from inventory 02 §1.12):**
Ten tokens carry zero `var(--name)` references anywhere in the stylesheet:
`--motion-exit`, `--motion-nav`, `--r-badge`, `--r-btn`, `--r-card`, `--r-modal`, `--sp-8`, `--surface-hover`, `--surface-pressed`, `--text-3xl`.

Several are **purpose-named** (`--r-btn`, `--r-card`, `--r-modal`, `--r-badge`), indicating an intended naming plan that components never adopted. Others are scale extensions (`--sp-8`, `--text-3xl`) added for headroom but unused.

**Impact:**
- Misleading design-system doc: the component vocabulary points at tokens components don't actually reach for.
- New contributors see `--r-btn` and use it → immediate inconsistency with the 90 existing buttons that use `--r-pill` / `--r-md` directly.
- `--surface-hover` / `--surface-pressed` are load-bearing in the v2 tonal-elevation narrative (docs/art-direction-brief.md §INTERACTION) but no component honors them — hover states fall back to hand-rolled overrides.

**Recommendation:**
Two paths, one commit each:
1. **Adopt or delete.** For each unused token, either (a) migrate ≥1 component to use it (so it earns its place) or (b) delete the declaration.
2. **Target:** components that already have hand-rolled hover bg should switch to `var(--surface-hover)` / `var(--surface-pressed)`. Buttons should use `var(--r-btn)` consistently. This alone retires 4 of 10.

**Effort:** Medium (one commit per token family, ~10 call-sites each).
**Risk:** Low — pure refactor within token scope; visual output identical if the token values match current hand-rolled values.
**Preserves features:** Yes (no behavior change).

---

## F-DTA-02 · [HIGH] [CONFIRMED] · 92 raw `font-size` declarations bypass the `--text-*` scale

**Location:** `public/styles.css` — 92 occurrences; examples at lines 178, 232, 266–269, 287–288, 334, 355, 375, 498, 601, 621, 691, …

**Evidence (from inventory 02 §5):**
The v2 type scale defines `--text-xs..3xl` (7 steps). But 92 CSS declarations use raw `font-size: 18px` / `font-size: 1.4em` / `font-size: 20px` — including the base `<h1>..<h4>` rules (`1.55em`, `1.25em`, `1.05em`, `1em`) and the `body.font-size-large/xlarge` modifiers (`20px` / `22px`).

**Impact:**
- Changing `--text-lg` from `1.2rem` to `1.25rem` does NOT change headings or the 90 other raw sizes → the scale is advisory, not authoritative.
- The "reading prefs" (`font-size-large/xlarge`) use absolute px that override every relative `rem` value → the whole scale collapses for accessibility-oriented users.

**Recommendation:**
Three-step migration:
1. **Quick win**: replace the base `<h1..h4>` em values with `--text-xl`, `--text-lg`, `--text-base`, `--text-base`. One commit, ~4 lines.
2. Migrate `font-size-large/xlarge` to scale via `:root { font-size: 1.125rem; }` / `1.25rem` so every `rem`-based token inflates proportionally.
3. Sweep the remaining 87 raw values per-feature in separate commits; acceptable literals are components quoting a display number (e.g., giant grade badge). Everything else → token.

**Effort:** Large cumulative, Small per commit.
**Risk:** Medium — visual output shifts at each migrate step; screenshot sweep advisable.
**Preserves features:** Yes (reading behaviour preserved if rem root is proportional).

---

## F-DTA-03 · [HIGH] [CONFIRMED] · 28 transition rules use hardcoded ms values instead of motion tokens

**Location:** `public/styles.css` — 28 occurrences matching `transition[^;]*[0-9]+m?s`.

**Evidence (from inventory 02 §4):**
The motion-token set exists (`--motion-fast` 100, `--motion-base` 140, `--motion-enter` 200, `--motion-loop` 1000 + `--speed-ui` alias + `--ease-ui`). But 28 transition rules hardcode literal ms: `180ms`, `200ms`, `160ms`, `140ms`, `120ms`. Example: `.app-toast { transition: opacity 180ms ease, transform 180ms ease; }` (line 131).

**Impact:**
- Changing `--motion-base` from 140ms to 160ms leaves 28 components at their pinned speeds — the "one speed, one easing" claim in `docs/design-system.md §Motion` is false in practice.
- Inconsistent motion feel: 180ms toast fade vs 140ms button press vs 120ms chip hover → the character-brief's "snappy" claim becomes audible as stutter.

**Recommendation:**
Single sweep commit: grep `transition.*[0-9]+ms`, replace literals with the nearest token (`100ms → --motion-fast`, `140ms → --motion-base`, `200ms → --motion-enter`, `150ms → --motion-exit` — this also rescues unused tokens from F-DTA-01). Easing `ease` / `ease-out` → `var(--ease-ui)`.

**Effort:** Medium (one grep + systematic edit).
**Risk:** Low — token values match literals within 20ms; indistinguishable to users.
**Preserves features:** Yes.

---

## F-DTA-04 · [MEDIUM] [CONFIRMED] · Docs / design-system drift — 53 vs 88 tokens

**Location:** `docs/design-system.md §Tokens`.

**Evidence (from inventory 02 §1):**
Doc line: *"53 tokens total. Theme switching flips the `data-theme` attribute…"*. Actual count: **88** unique custom properties across 6 `:root`/`[data-theme]` blocks.

Doc also says `--bg: #F54B5E vibrant coral` (dark) and `#F8C8CF pale coral paper` (light). Current code: `#E84A5F` and `#F6D0D6` respectively — the values were refined ("calmer than prior #F54B5E" per in-file comment) and the doc wasn't updated.

**Impact:**
- New contributors follow stale values, reintroducing retired colors.
- Audit trail: `DECISIONS.md` has no record of the refinement, so the decision is only visible as a code comment.
- Meta-failure: the design system IS the single-source-of-truth per `ADR-0003`; the doc contradicting the code breaks that contract.

**Recommendation:**
1. Run a one-shot regen: script that reads the current `:root` block and emits the token tables into `docs/design-system.md`. Commit as `docs: regen design-system tokens from source`.
2. Add a `DECISIONS.md` entry retroactively for the `--bg` refinement (Tier-1).
3. Consider adding this regen to `build.mjs` so the doc can't drift again.

**Effort:** Small (script is grep + template fill).
**Risk:** None — pure doc.
**Preserves features:** N/A.

---

## F-DTA-05 · [MEDIUM] [CONFIRMED] · 57 raw hex colors outside token declarations

**Location:** `public/styles.css` — top offenders: `#1B1B1F` (10), `#FFFFFF` (6), `#fff` (4), `#E54B5E` (4), `#FF6B45` (3), `#F8C8CF` (3), `#B0431F` (3), `#000` (3), `#FFFDF7` (2), `#FAF5E9` (2), plus 26 singletons.

**Evidence (from inventory 02 §5):**
Most duplicate existing token values (`#1B1B1F` IS `--panel`/dark or `--text-on-bg`, `#FFFFFF` IS `--panel`/light). A few are exotic: `#FF8867`, `#FF7E5F`, `#F5EFDF`, `#E0552F`, `#D94458` — used once each.

**Impact:**
- Theme switching fails silently on literal uses — a component referencing `#1B1B1F` stays dark even when the user switches to light.
- The `--accent-hover` / `--accent-focus` tokens (F-DTA-01 adjacent) exist *because* of the exotic singletons — but the tokens are barely used (1 reference each).

**Recommendation:**
1. Audit each exotic (count ≤ 2) singleton: is it a one-off that needs a token, or a mistake where a token exists?
2. Sweep obvious duplicates: `#1B1B1F` → `var(--panel)` or `var(--text-on-bg)`, `#FFFFFF`/`#fff` → `var(--panel)` (light) or `#fff` where truly theme-locked.
3. Add a lint rule (or at least a `npm run audit:colors` grep) to block raw hexes in future PRs outside the `:root` block.

**Effort:** Medium (careful per-site decision for each hex).
**Risk:** Medium — replacing a hex with the wrong token flips the color in theme switch.
**Preserves features:** Yes if done correctly.

---

## F-DTA-06 · [LOW] [CONFIRMED] · Token declarations scattered across 5 `:root` blocks

**Location:** `public/styles.css` — `:root` / `[data-theme]` declarations at lines 12–13, 4170–4171, 4409–4410, 4478–4479, 4529–4531, 4576…

**Evidence (from inventory 02 §1):**
The CSS file has six separate token-declaring blocks, each adding a slice: surfaces + text + accent + radii + spacing (first block), typography + motion + elevation (middle blocks), tension/tile/meal accents + scroll scrims (tail blocks).

Each block is authored as a "Step N — §… added" delta.

**Impact:**
- A contributor searching for `--sp-6` finds only the first block; to know if there's a later override, they have to re-grep.
- Design-system.md readers see one table; code readers see six blocks. Mental model mismatch.
- Unused tokens (F-DTA-01) hide in the later blocks.

**Recommendation:**
1. Consolidate the 6 blocks into 2: one for `:root, [data-theme="dark"]` (all dark values), one for `[data-theme="light"]` (all light values). Keep the inline comments explaining the rationale for tricky values.
2. Place both at the top of `styles.css` so every subsequent rule is authored against a visible token inventory.

**Effort:** Small (one commit, ~100 lines moved).
**Risk:** Low — if done carefully, same values, same declaration order per theme.
**Preserves features:** Yes.

---

## Dimension scorecard — §DTA
| Metric | Value |
|---|---|
| Findings | 6 (HIGH×3, MEDIUM×2, LOW×1) |
| CRITICAL | 0 |
| Quickest win | F-DTA-04 (doc regen, Small effort, 0 risk) |
| Highest impact | F-DTA-03 (motion unification, Medium effort, Low risk) |
| Biggest undertaking | F-DTA-02 (font-size migration, Large effort in aggregate) |
