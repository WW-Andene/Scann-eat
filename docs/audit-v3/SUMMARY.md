# Scann-eat — UI/UX Audit v3 — Summary

**Scope:** Full-depth audit across 17 design-aesthetic / UX / a11y / i18n / character dimensions.
**Method:** `design-aesthetic-audit-SKILL` + `app-audit-SKILL` "full deep design audit" scope.
**Run from zero:** Prior 34 `audit-round-*.md` files intentionally ignored.
**Date:** 2026-04-24
**Branch:** `claude/understand-project-YS4EK`

---

## 1 · Executive outcome

**95 findings** — **zero CRITICAL**, **14 HIGH**, **54 MEDIUM**, **27 LOW**.

The app's visual language is **architecturally sound** (good tokens, honoring WCAG 2.3.3 motion, paper-grain signature craft, color-blind pattern overlays, aria landmarks wired, live regions extensive). Where it fails is **adoption consistency** — a rich token system whose components don't uniformly use it, an emoji-per-feature signature whose calibration helper has zero HTML refs, a character brief whose decision filters exist only in docs.

The **dominant pattern** across every block is *"evolution layers that never collapsed"* — design passes added new tokens, components, or helpers, but legacy sites were left untouched. The fix phase is less "redesign" than "finish what was started".

No previous fixes were destructive. Everything is recoverable.

---

## 2 · Findings dashboard

### By block × severity

| Block | Dimensions | Findings | HIGH | MED | LOW | Document |
|---|---|---|---|---|---|---|
| A Foundation | §DTA · §DC · §DT · §DM | 25 | 5 | 13 | 7 | `findings/A*-*.md` |
| B Structure | §DH · §DSA · §DCO · §DI | 22 | 4 | 11 | 7 | `findings/B*-*.md` |
| C UX | §DST · §DRC · §DCVW · §DDV | 21 | 0 | 14 | 7 | `findings/C*-*.md` |
| D A11y + Flows + i18n | §G · §F · §N | 21 | 4 | 12 | 5 | `findings/D*-*.md` |
| E Character + Style | §DS · §DP · §DBI | 6 | 1 | 4 | 1 | `findings/E1-*.md` |
| **Total** | **17** | **95** | **14** | **54** | **27** | |

### All 14 HIGH findings

| ID | Summary | Effort | Block |
|---|---|---|---|
| F-DTA-01 | 10 tokens defined but never referenced | Medium | A |
| F-DTA-02 | 92 raw font-size declarations bypass --text-* | Large (sweep) | A |
| F-DTA-03 | 28 transition rules use hardcoded ms | Medium | A |
| F-DT-01 | Google Fonts @import render-blocking | Small | A |
| F-DM-01 | Motion tokens only partially adopted | Medium | A |
| F-DCO-01 | `.chip-btn` defined in 3 evolution layers | Medium | B |
| F-DCO-03 | Inputs have focus-visible but no hover / disabled / invalid | Small | B |
| F-DI-01 | `.icon-glyph` helper: 4 CSS rules, 0 HTML refs | Large | B |
| F-DI-02 | Decorative emojis not hidden from screen readers | Large | B |
| F-G-01 | Dialog form controls lose focus ring | Small | D |
| F-G-02 | Touch targets below WCAG AAA 44×44 | Medium | D |
| F-F-02 | Barcode scan error paths thin | Medium | D |
| F-N-01 | 8 hardcoded French aria-labels bypass i18n | Small | D |
| F-CS-02 | 10 backdrop-filter sites vs "glass-demoted" brief | Medium | E |

---

## 3 · Compound chains

Findings that amplify each other. Fixing the chain anchor usually unblocks several findings at once.

### Chain A — "Evolution layers never collapsed"
- `F-DTA-06` five `:root` token blocks
- `F-DCO-01` `.chip-btn` three rule blocks
- `F-DCO-06` no `.card` base class (10+ ad-hoc cards)
- `F-DTA-04` docs/design-system.md claims 53 tokens, actual 88
- `F-DT-06` type scale in doc stale vs code

**Anchor:** `F-DCO-01`. Once the pattern ("collapse each component into one canonical rule block") is applied to `.chip-btn`, the same sweep applies to the others.

**Fix cascade:** F-DCO-01 → F-DCO-06 → F-DTA-06 → regen doc → F-DTA-04 + F-DT-06.

### Chain B — "Scale + token bypass"
- `F-DTA-02` 92 raw `font-size`
- `F-DTA-03` 28 hardcoded `transition Nms`
- `F-DTA-05` 57 raw hex colors
- `F-DT-02` 11 line-heights untokenized
- `F-DT-03` 10 letter-spacings untokenized
- `F-DM-01` motion tokens only partially adopted
- `F-CS-01` character-brief filters unenforced

**Anchor:** `F-CS-01` (enforcement script). Once `audit-ruler.sh` fails CI on raw values, drift stops. Then F-DM-01 + F-DTA-03 single sweep. Then F-DTA-02 + F-DT-02 + F-DT-03 — type pass.

### Chain C — "Emoji calibration inert"
- `F-DI-01` `.icon-glyph` 0 HTML refs
- `F-DI-02` decorative emoji not aria-hidden
- `F-DI-03` `⚙` missing variation selector
- `F-DI-04` emoji baked into i18n strings
- `F-CS-03` signature "emoji per feature" not enforced

**Anchor:** `F-DI-04` (separate emoji from i18n string). Once emoji lives in HTML (wrapped in `.icon-glyph` + `aria-hidden`), F-DI-01 + F-DI-02 + F-CS-03 are resolved together.

### Chain D — "A11y landmark absence"
- `F-DH-01` dashboard tiles no heading/label
- `F-DH-02` 11 `<section>` siblings no aria-labelledby
- `F-DH-06` scan-result cluster no `<article>` wrapper
- `F-G-04` `<header>` + `<main>` no explicit aria-label
- `F-G-07` `role="tablist"` incomplete

**Anchor:** Adopt the `aria-labelledby` pattern already used on `#hydration-tile` across every section + tile. One PR covers all five.

### Chain E — "Focus-state incompleteness"
- `F-G-01` dialog inputs lose focus ring
- `F-DCO-03` inputs no hover / disabled / invalid
- `F-G-02` small touch targets

**Anchor:** Single "input state refresh" PR that adds the missing rules + restores focus rings.

### Chain F — "i18n attribute bypass"
- `F-N-01` 8 hardcoded aria-labels
- `F-DI-04` emoji in translation strings
- `F-N-04` appName hardcoded

**Anchor:** Extend `applyStaticTranslations()` to also process `[data-i18n-aria-label]` + `[data-i18n-placeholder]` + wrap appName. One function change.

---

## 4 · Quick wins (15 items, each Trivial–Small effort, zero regression risk)

Recommended as a single "low-risk warmup" commit batch before the larger refactors.

| ID | One-liner | Effort |
|---|---|---|
| F-DT-04 | `.pa-row.veto-row font-weight: 900 → 700` | 1 line |
| F-DC-04 | dark-theme `--accent-ink #1B1B1F → #0E0E11` (AA pass) | 1 line |
| F-DT-05 | add `--font-mono` token; migrate 2 sites | Trivial |
| F-DI-03 | emoji variation-selector sweep (`⚙` → `⚙️`) | Small grep+replace |
| F-DH-03 | noscript `<h1>` → `<h2>` | 1 line |
| F-DDV-03 | `.dash-bar` 1px border in light theme | 1 line |
| F-N-04 | `<h1 data-i18n="appName">Scann-eat</h1>` | 1 line |
| F-N-05 | `detectDefaultLang` last return: `'en' → 'fr'` | 1 line |
| F-CS-04 | add warm×data-dense note to CONTRIBUTING.md | Docs |
| F-DSA-01 | document paper-grain as protected | Docs |
| F-DM-06 | document grade-reveal as signature motion | Docs |
| F-DST-01 | document skeleton as protected | Docs |
| F-DST-04 | document success-burst triggers | Docs |
| F-DRC-03 | document desktop two-pane layout | Docs |
| F-G-05 | document `<html lang>` sync + add pinning test | 1 test |

---

## 5 · Recommended remediation roadmap

### Batch 1 — Warmup (Quick wins, 1 PR)
Sweep all 15 quick-wins above into one commit. No risk, aligns doc with code, pins working behaviour.
**Effort:** ~½ day.
**Blast radius:** zero user-visible change beyond 3 tiny visual tweaks.

### Batch 2 — HIGH block (7 commits)
Close each HIGH finding that isn't part of a chain:

| Commit | Finding | Effort |
|---|---|---|
| fix: move font `<link>` to index, drop @import | F-DT-01 | S |
| fix: restore focus rings in dialog inputs | F-G-01 | S |
| fix: input state matrix (hover/disabled/invalid) | F-DCO-03 | S |
| fix: i18n aria-labels via `data-i18n-aria-label` | F-N-01 | S |
| fix: touch targets ≥ 44×44 on icon-only btns | F-G-02 | M |
| fix: scan error path copy + fallbacks | F-F-02 | M |
| fix: audit backdrop-filter sites, reduce to 2 | F-CS-02 | M |

**Effort:** ~2–3 days.
**Blast radius:** focus ring visible on more inputs; 3 hardcoded FR aria-labels now translate; slightly different scan error UX.

### Batch 3 — Chain A: "Evolution layers" consolidation (1 PR, atomic)
Collapse `.chip-btn` into one rule block; extend pattern to `.grade`, `.score-card`, `.meal-section`, `.dash-row`, `.pairing-chip`. Consolidate 6 `:root` blocks into 2. Retire unused tokens. Regen `design-system.md`. Unblocks Chain B's enforcement.
**Effort:** ~1–2 days.
**Blast radius:** CSS-only; visual diff spot-check needed.

### Batch 4 — Chain B: Token enforcement + sweep (3 commits)
- `ci: add audit-ruler.sh as pre-commit` (F-CS-01).
- `fix: motion token unification` (F-DM-01 + F-DTA-03 joint sweep).
- `fix: font-size scale adoption` (F-DTA-02 — the big one; one commit per component family).
**Effort:** ~2 days.
**Blast radius:** audible on all transitions (durations shift ±10ms, imperceptible); visible on any component whose raw-px doesn't quite match `--text-*`.

### Batch 5 — Chain C: Emoji calibration (1 larger PR)
Adopt `{icon:name}` template in `t()` + refactor ~30 i18n values. Wrap every emoji in `<span class="icon-glyph" aria-hidden="true">`.
**Effort:** ~2 days.
**Blast radius:** every button/title that carries a decorative emoji. Needs visual regression sweep.

### Batch 6 — Chain D: Landmarks + tablist (1 PR)
Add `aria-labelledby` to every tile + section. Complete tablist pattern for view-toggle. Add `<article>` wrapper for scan-result cluster.
**Effort:** ~1 day.
**Blast radius:** no visual change; screen-reader rotor gains 8+ landmarks.

### Batch 7 — UX Flow polish (4 commits)
- F-F-01 onboarding progress + back button.
- F-F-03 multi-item photo confirm step.
- F-F-04 grocery per-ingredient source.
- F-F-06 + F-F-07 gap-closer celebration + recipe-save.
**Effort:** ~2 days.
**Blast radius:** net-positive UX; low-risk additions.

### Batch 8 — Remaining MEDIUM (copy + doc-heavy)
The 40+ MEDIUM findings that aren't in chains. Split by author energy; not blocking ship.

### Batch 9 — Defer / decide (product-owner needed)
- F-N-03 ES/IT/DE beta coverage — expand / prune / defer.
- F-DRC-02 tablet layout — design goal?
- F-CS-06 "farmer's market" metaphor granularity.

---

## 6 · User-owner decisions requested

Before Phase 4 starts, **3 calls** need to be made:

1. **Scope cap.** Do all 6 batches land in this audit cycle, or only Batches 1–4 (warmup + HIGH + Chain A + Chain B)? Batches 1–4 represent ~6 days of work and cover every HIGH plus the two anchor chains.
2. **Character preservation.** Recommended default: preserve. If "reinvent" is on the table, that's a Tier-2 decision that rewrites half the findings. Confirm preserve.
3. **Fix-pass intensity.** Recommended: Batches 1 + 2 + 3 + 4 next, Batches 5–7 in a follow-up cycle. Batch 8 (MEDIUM mop-up) is opt-in.

---

## 7 · Audit doc inventory (for cross-reference)

| File | Size |
|---|---|
| `inventory/01-surfaces.md` | 25 KB |
| `inventory/02-tokens-and-css.md` | 12 KB |
| `inventory/03-features.md` | 14 KB |
| `inventory/04-copy.md` | 9 KB |
| `inventory/05-accessibility.md` | 30 KB (2 claims retracted) |
| `inventory/06-render-flow.md` | 29 KB |
| `findings/A1-DTA-tokens.md` | 7 KB |
| `findings/A2-DC-color.md` | 7 KB |
| `findings/A3-DT-typography.md` | 8 KB |
| `findings/A4-DM-motion.md` | 8 KB |
| `findings/B1-DH-hierarchy.md` | 7 KB |
| `findings/B2-DSA-surface.md` | 6 KB |
| `findings/B3-DCO-components.md` | 9 KB |
| `findings/B4-DI-iconography.md` | 7 KB |
| `findings/C1-DST-states.md` | 7 KB |
| `findings/C2-DRC-responsive.md` | 6 KB |
| `findings/C3-DCVW-copy-visual.md` | 7 KB |
| `findings/C4-DDV-dataviz.md` | 7 KB |
| `findings/D1-G-accessibility.md` | 10 KB |
| `findings/D2-F-ux-flows.md` | 7 KB |
| `findings/D3-N-i18n.md` | 8 KB |
| `findings/E1-character-style.md` | 8 KB |
| `SUMMARY.md` (this file) | — |

---

## 8 · Gate

**Phase 3 ends here.** Phase 4 (fix CRITICAL/HIGH) begins on your signal — default is Batch 1 (quick wins). Say "proceed with batch 1" or redirect to a different batch, or ask for changes to this summary before I touch code.
