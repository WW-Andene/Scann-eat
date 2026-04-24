# Audit — §DS Style Coherence · §DP Design Personality · §DBI Brand Identity

**Block:** E Character + Style
**Dimensions:** §DS, §DP, §DBI (§DIL skipped — app has zero illustration surface)
**Source of truth:** `docs/design-system.md §Character brief (v2)` + `docs/art-direction-brief.md`
**Date:** 2026-04-24

The character brief states:
> *"This app's design reads as a warm, precise food ledger. The strongest expression is the coral-paper + cream-card two-tone with tabular numerics and diverging-scale grade badges. It should never feel clinical, corporate, or 'premium glass'."*

This audit measures drift between that brief and the shipped code.

---

## F-CS-01 · [MEDIUM] [CONFIRMED] · Character brief is well-written — ship it as a contributor test filter

**Location:** `docs/design-system.md §Character tests (decision filters)` — the ✓/✗ on/off-character filter.

**Evidence:**
The doc already has decision filters:
- ✓ *"On character — a new surface uses `--panel` or `--panel-2`, with `--elev-1` neutral OR `--elev-1-tonal` coral shadow."*
- ✗ *"Off character — a new surface uses pure `#ffffff`, pure `#000000`, or a chromatic non-coral gradient. Reject."*
- ✓ *"On character — a new interaction finishes in ≤ 220ms with a single easing (`--ease-ui`)."*
- ✗ *"Off character — a custom easing, bounce physics, or a transition > 400ms. Reject."*
- ✓ *"Type values come from `--text-xs..3xl`."*
- ✗ *"Ad-hoc `font-size: 0.92em`. Reject; add to scale if the size genuinely recurs."*

These filters are excellent. But they live in a doc that contributors open once. There's no CI / PR enforcement.

**Impact:**
- The 92 raw `font-size` values (F-DTA-02), 57 raw hex colors (F-DTA-05), 28 hardcoded `transition Nms` (F-DTA-03) are all off-character per this same doc — the violations are documented, not prevented.

**Recommendation:**
Add a `docs/audit-ruler.sh` script that runs the decision filters as grep tests:
```bash
# Off-character checks
COUNT=$(grep -cE 'font-size:\s*[0-9]' public/styles.css)
[ "$COUNT" -le 8 ] || { echo "Raw font-size violations: $COUNT (allowed ≤8)"; exit 1; }
# ... etc for hex, ms, etc.
```
Add to `npm test` or as a pre-commit hook.

**Effort:** Small.
**Risk:** None.
**Preserves features:** Yes.

---

## F-CS-02 · [HIGH] [CONFIRMED] · "Paper-dominant, glass demoted" claim vs 10 `backdrop-filter` sites

**Location:** Character brief vs `public/styles.css` — per F-DSA-03.

**Evidence:**
Character brief (§Material):
> *"Paper dominant — cream panels, 2% grain overlay, shadow cast from a fixed overhead light. … **Glass demoted**: dialogs read as 'paper cover with a tint', not frosted iOS sheets."*

Code reality:
- 10 `backdrop-filter` sites (F-DSA-03).
- Dialog `::backdrop` uses `blur(12px)` — the skill's minimum quality threshold for "real" glass.
- The `--blur-glass` token exists (blur amount) but isn't consistently used.

**Impact:**
- The more glass usage, the more the app drifts from paper toward "premium iOS glass".
- Character brief's stated rejection *"Frosted-glass cards (Apple sheet / iOS premium)"* is contradicted in spots.

**Recommendation:**
Audit every `backdrop-filter`:
1. Dialog `::backdrop` (scrim) — this is PAPER if the blurred content is paper — retain.
2. Cards with `backdrop-filter` — REJECT per character brief. Migrate to solid `--panel` or `--panel-2`.
3. Toasts with semi-transparent backgrounds — consider `--panel` solid.

Target: reduce `backdrop-filter` count from 10 to ≤ 2 (backdrop scrim + camera-dialog overlay maybe).

**Effort:** Medium.
**Risk:** Low — visual shift toward paper feel (aligns with brief).
**Preserves features:** Yes.

---

## F-CS-03 · [MEDIUM] [CONFIRMED] · "Emoji-per-feature signature" is documented but unenforced

**Location:** Character brief `§Protect`:
> *"Emoji-per-feature signature."*

**Evidence (from inventory 04 + F-DI-01, F-DI-02):**
- Emojis ARE used per feature (📅 planning, 🥕 pantry, 🛒 grocery, 🎯 gap-closer, 💡 ideas, 📜 menu, 📸 photo, 📱 install, 👤 profile, ⚙ settings, 📈 progress).
- But: `.icon-glyph` helper = 0 HTML refs (F-DI-01). `aria-hidden="true"` on decorative emoji = 13 sites of many (F-DI-02).
- Emoji baked into i18n strings so every locale needs to re-carry them (F-DI-04).
- `⚙` without variation selector (F-DI-03).

The "signature" is an aspiration; the shipped calibration is inert.

**Impact (cumulative, per the three §DI findings):**
- Signature element undermined by uncalibrated rendering.
- Screen-reader noise.
- Translation brittleness.

**Recommendation:** Consolidate fix under F-DI-01 / F-DI-02 / F-DI-04 work. See those findings.

**Effort:** See §DI findings.
**Risk:** Medium (coupled to i18n refactor).
**Preserves features:** Yes.

---

## F-CS-04 · [LOW] [CONFIRMED] · Competitive positioning ("warm × data-dense" quadrant) is well-claimed — protect

**Location:** `docs/design-system.md §Competitive positioning (v2, post-§DCP)`.

**Evidence:**
> *"Occupied quadrant: Warm × Data-dense. Rivals cluster at Clinical-dense (Cronometer), Warm-curated (Yuka), or neutral (MyFitnessPal). The warm-dense quadrant is … 'scientist's notebook at a farmer's market' territory — coral paper, tabular numerics, emoji-per-feature, grade-pattern overlay. No direct competitor plants a flag here."*

This is a strong positioning claim supported by the concrete craft choices. Both visually and voice-wise, the app does sit in an uncommon spot (most nutrition apps are medical-cold or marketing-fluffy).

**Impact:**
- An asset: the visual identity is distinctive enough that a user seeing a screenshot side-by-side with Yuka / MyFitnessPal can tell Scann-eat apart.
- Protect against "clean up" refactors that reintroduce clinical neutrality.

**Recommendation:**
Codify: add to `CONTRIBUTING.md`: *"Scann-eat lives in the warm × data-dense quadrant. Reject PRs that push toward clinical (stripped color, grayscale), marketing-warm (muted numeric precision), or premium-glass (frost instead of paper)."*

**Effort:** Trivial.
**Risk:** None.
**Preserves features:** Yes.

---

## F-CS-05 · [MEDIUM] [CONFIRMED] · Character drift in dialog chrome — too many "settings-dialog" class reuses

**Location:** `public/index.html` — 7 dialogs use `class="settings-dialog"`:

From inventory 01 surfaces / grep:
- `#settings-dialog`
- `#profile-dialog`
- `#onboarding-dialog`
- `#quick-add-dialog`
- `#activity-dialog`
- `#weight-dialog`
- `#templates-dialog`

**Evidence:**
`.settings-dialog` became the generic dialog shell — 7 dialogs share the class. But the character brief claims:
> *"Settings dialog — Standard modal shape for every feature's settings"*

What shipped: seven dialogs use "settings-dialog" styling — including ones that aren't settings (Quick-Add, Weight, Templates).

**Impact:**
- Class name is misleading — new contributors might refactor `.settings-dialog` thinking they're only editing settings.
- Suggests the design system has one modal style, not seven — which is fine, but the class should be renamed.

**Recommendation:**
Rename: `.settings-dialog` → `.modal-dialog` (or `.ct-modal` / `.dialog-shell`). Keep `.settings-dialog` as alias for one release. Update the 7 dialogs' class lists.

Separately: if distinct modals need variants (large vs small, form-heavy vs pick-list), add modifiers (`.modal-dialog.dense`, `.modal-dialog.compact`).

**Effort:** Small.
**Risk:** Medium — CSS change ripples.
**Preserves features:** Yes.

---

## F-CS-06 · [MEDIUM] [CONFIRMED] · Sensory vocabulary ("notebook at a farmer's market") is not backed by sufficient granularity

**Location:** Character brief opening line. Supporting docs: `art-direction-brief.md`.

**Evidence:**
The headline vision is evocative: "a scientist's notebook at a farmer's market". But concrete implementation of that metaphor is:
- Cream paper (`--panel` light = `#FFFDF7`) ✓
- 2% grain overlay (F-DSA-01) ✓
- Tabular numerics (`--num-feat`) ✓
- Polaroid-tilt scrapbook rotations (F-DM-04) ✓
- Dotted-leader table-of-contents style (commit `bb24a2c Design Move G`)
- Ruled-notebook page for scan result (commit `cab22ed Move 1`)
- Paper-ledger entries for recent scans (commit `50b817d Design Move F`)

That's the **farmer's notebook** half. The **market** half is less concrete — where's the "market" feel? Perhaps the warm coral (market awning)? Hand-drawn imperfections in rotations? Scrapbook feel?

**Impact:**
- Vision is partially realized. Notebook metaphor is strong; farmer's-market layer is implicit/weak.
- Future moves could lean into market: receipt-tape separators, handwritten-pen stamp moments, paper-price-tag badge styles.

**Recommendation:**
This is a DESIGN DIRECTION call, not an audit fix. Flag to design owner:
- Question: does "farmer's market" mean anything concrete in the current UI beyond the coral hue?
- If yes: document the concrete "market" elements.
- If no: either remove the farmer's market half from the vision statement (simplify to "scientist's notebook") or add one or two concrete market touches in next design sprint.

**Effort:** N/A (strategic decision).
**Risk:** N/A.
**Preserves features:** Yes.

---

## Dimension scorecard — §DS/§DP/§DBI combined
| Metric | Value |
|---|---|
| Findings | 6 (HIGH×1, MEDIUM×4, LOW×1) |
| CRITICAL | 0 |
| Quickest win | F-CS-04 (add quadrant note to CONTRIBUTING.md) |
| Highest impact | F-CS-02 (glass audit — realigns with character brief) |
| Design-owner | F-CS-06 (farmer's-market metaphor granularity) |

---

## Phase 2E scorecard

Combined into this single file. §DIL (illustration) skipped — zero illustration surface in app (emoji only).

---

## Phase 2 GRAND TOTAL

| Block | Dimensions | Findings | CRIT | HIGH | MED | LOW |
|---|---|---|---|---|---|---|
| A Foundation | §DTA §DC §DT §DM | 25 | 0 | 5 | 13 | 7 |
| B Structure | §DH §DSA §DCO §DI | 22 | 0 | 4 | 11 | 7 |
| C UX | §DST §DRC §DCVW §DDV | 21 | 0 | 0 | 14 | 7 |
| D A11y+Flows+i18n | §G §F §N | 21 | 0 | 4 | 12 | 5 |
| E Character+Style | §DS §DP §DBI | 6 | 0 | 1 | 4 | 1 |
| **Total** | **17 dimensions** | **95** | **0** | **14** | **54** | **27** |

Zero CRITICAL findings. 14 HIGH — the meaningful work queue for Phase 4.
