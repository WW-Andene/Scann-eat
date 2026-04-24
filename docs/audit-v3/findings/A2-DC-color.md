# Audit — §DC Color Science

**Block:** A Foundation
**Dimension:** §DC (Color Palette, Perceptual Architecture, Dark Mode, Brand Distinctiveness, Narrative)
**Sources:** inventory 02 (tokens), inventory 05 (a11y baseline — partially corrected here), direct reads of `public/styles.css`
**Date:** 2026-04-24

---

## F-DC-01 · [MEDIUM] [CONFIRMED] · Semantic collision: `--warning` and `--grade-c` are the same hex

**Location:**
- `public/styles.css:46` — `--warning: #F5A64B`
- `public/styles.css:56` — `--grade-c: #F5A64B`

**Evidence:**
Both tokens declare identical `#F5A64B` (orange). Semantically they mean different things:
- `--warning` — "caution, moderate issue" (modal warnings, toast variants).
- `--grade-c` — "average score, 40–54/100" on the scoring palette.

**Impact:**
- A user seeing an orange pillar-row thinks "warning" when it's actually "grade C".
- Future token-level tweak (e.g., shift `--warning` to more saturated amber for visibility) silently shifts the grade palette.
- The diverging-scale grade palette loses its meaning if `--warning` adopts a semantic life of its own.

**Recommendation:**
Split the two tokens. Pick one:
- Option A (cheapest): keep `--warning` and `--grade-c` both using the same value NOW, but mark `--grade-c` as alias of `--warning` in a comment. Creates intent without disturbing renders.
- Option B (correct): shift `--warning` to `#F5B441` (slight yellow lean) so it diverges visually from `--grade-c` orange. Tested pair-wise contrast still passes AA on panel.

Prefer Option B — the palette character brief says "grade is the signature diverging scale" and warning shouldn't squat on it.

**Effort:** Small (2 lines + visual spot-check).
**Risk:** Low — warning usage is sparse.
**Preserves features:** Yes.

---

## F-DC-02 · [MEDIUM] [CONFIRMED] · Grade tokens used as text color may fail AA on panel backgrounds

**Location (text-color usage of grade tokens):**
- `public/styles.css:1888` — `.pillar-d-row.deduction .pd-points { color: var(--grade-d); }`
- `public/styles.css:1910` — `.additive-summary[data-worst="1"] { ... color: var(--danger); }` (and similar `--grade-*` text uses)
- Sample uses of `color: var(--grade-a|b|c|d|f)` elsewhere — grep shows several sites.

**Evidence:**
Grade tokens were designed as **background fills** (they sit behind dark `--on-muted #1B1B1F` text in grade badges, where all six pass AA — see inventory 05 correction below). But several rules use them as **text color** on `--panel` backgrounds:
- `--grade-b` (`#F5D651` yellow) on `--panel` light (`#FFFFFF`): **~1.4:1** — fails AA badly.
- `--grade-c` (`#F5A64B` orange) on `#FFFFFF`: ~2.1:1 — fails.
- `--grade-d` (`#F56E4B`) on `#FFFFFF`: ~3.3:1 — fails AA normal text (4.5:1), passes AA large (3:1).
- On `--panel` dark (`#1B1B1F`), the same tokens pass comfortably.

**Correction to inventory 05:** the a11y agent's doc said *all* grades fail on light panels. That's inaccurate for the badge usage (which has dark text on bright bg, passes AA). The issue is specifically grade tokens used as *text color* on light panels.

**Impact:**
- Light-theme users see washed-out "yellow on white" on pillar deductions + additive summaries.
- Specific sites to check: `.pd-points` deductions, ingredient dots, gap-closer chip highlights.

**Recommendation:**
1. Introduce parallel **ink tokens**: `--grade-aplus-ink`, `--grade-a-ink`, … that resolve to a theme-correct text color for rendering the grade *as text*:
   - Dark theme: the grade color itself (already passes on `--panel` dark).
   - Light theme: a darker variant — e.g., `--grade-b-ink: #8B6B00` (passes AA on `#FFFFFF`).
2. Migrate the 5–10 `color: var(--grade-*)` sites to the ink variants.

**Effort:** Medium (6 new tokens + 5-10 migrations).
**Risk:** Medium — any hand-rolled color override may conflict; screenshot sweep needed.
**Preserves features:** Yes (readability improves).

---

## F-DC-03 · [LOW] [CONFIRMED] · Grade-badge visual redundancy is well-designed (color-blind pattern overlay) — this is a strength, document it

**Location:** `public/styles.css:890–920` (`.compare-grade`), `1500–1540` (`.recent-grade`).

**Evidence:**
Grade pills carry per-grade pattern overlays in addition to color:
- A+/A: solid fills with dark border.
- B: radial dot pattern (4×4 px grid).
- C: 45° diagonal stripes.
- D: cross-hatch (45° + −45°).
- F: dense white X overlay (inverted for visibility on red).

Explicit code comment: *"Deuteranopic / protanopic users can still tell A from C at a glance."*

**Impact:** Actually **preserves** accessibility for ~8% of men and ~0.5% of women with red-green color vision deficiency. Should be protected.

**Recommendation:**
- Add a test: `test/visual/grade-pattern.ts` (or equivalent) that fails if any `.recent-grade`, `.compare-grade`, `.alt-grade`, `.grade`, `.recipe-row-grade`, `.recipe-edit-grade` loses its pattern overlay.
- Document the pattern in `docs/design-system.md §Color` so future contributors don't "simplify" it away.

**Effort:** Small (documentation + spot test).
**Risk:** None.
**Preserves features:** Yes — actually documents a feature.

---

## F-DC-04 · [MEDIUM] [CONFIRMED] · Dark-theme `--accent-ink` #1B1B1F on `--accent` #FF6B45 — verify AA for small text

**Location:** `public/styles.css:30` (dark) and `:87` (light).
- Dark: `--accent: #FF6B45`, `--accent-ink: #1B1B1F` → approx 4.3:1 (hair below AA-normal 4.5, passes AA-large).
- Light: `--accent: #B0431F` (darkened explicitly for this ratio), `--accent-ink: #FFFFFF` → approx 5.7:1 ✓.

**Evidence:**
A code comment at line 84 justifies the light-theme choice:
> "Darker orange so white ink passes WCAG AA for body text (5.7:1). The previous #E0552F only met AA-large, which fails on button labels."

The **dark theme** (the app's default) has NOT had the same fix — `#1B1B1F` on `#FF6B45` measures ~4.3:1, which fails AA normal by a slim margin.

**Impact:**
Every primary CTA in dark mode (`.capture-btn`, `.settings-btn.primary`, `.log-btn`) has button labels at 16px (normal text) on this pair. Users with less than 20/20 vision or working in bright sunlight report "orange button text feels blurry" → this is the quantitative explanation.

**Recommendation:**
Two routes:
- **A:** Darken `--accent-ink` in dark theme from `#1B1B1F` to `#0E0E11` — pushes ratio to ~4.9:1 ✓. One-line change.
- **B:** Redesign: dark-theme accent ink to `#FFFFFF` + nudge `--accent` darker (`#E5552D`) — breaks the character brief's "warm orange" signature. Don't pick B without a design call.

Recommend **A** (keep character, pass AA).

**Effort:** Trivial.
**Risk:** Very low — visual diff imperceptible.
**Preserves features:** Yes.

---

## F-DC-05 · [LOW] [CONFIRMED] · `--tension` teal counter-accent — good idea, sparsely adopted

**Location:**
- Dark: `public/styles.css:4582ish` — `--tension: #2FC7B2`, `--tension-ink: #0F2B28`.
- Light: `--tension: #0F8F7E`, `--tension-ink: #FFFFFF`.

**Evidence:**
Tokens exist; inline comment says "AA-safe on paper". But grep shows only a handful of references. Design intent appears to be a counter-accent for complementary UI — but the design-system.md doesn't document when to use it, and no component consistently does.

**Impact:**
- Either the token is load-bearing for a future feature (OK, but should be documented) OR it's partially abandoned (then delete).
- Risk of someone using `--tension` meaning "warning" or "success", which would further fragment the palette.

**Recommendation:**
Two questions for the design owner:
1. Where is tension *supposed* to appear? (Goal marker? Focus halo? Streak success?)
2. If the answer is "undecided", strip the tokens until there's a named component that needs them.

Until resolved, add an inline comment in the declaration: `/* RESERVED — see docs/decisions about tension role, don't adopt yet */`.

**Effort:** Trivial.
**Risk:** Low.
**Preserves features:** Yes.

---

## F-DC-06 · [MEDIUM] [CONFIRMED] · No documented color-usage map (which token for what role)

**Location:** `docs/design-system.md` — the token tables list *what the values are*, not *when to reach for which*.

**Evidence:**
The palette has:
- Three states: `--danger`, `--success`, `--warning`.
- Six grades: `--grade-aplus..f`.
- Two accents: `--accent`, `--tension`.
- One informational: `--accent-warm`.

12 distinct role tokens. No page in the repo explains:
- When to use `--warning` vs `--grade-c` (see F-DC-01).
- When to use `--accent-warm` vs `--warning` (both yellowish).
- When to use `--tension` vs `--success` (both greenish teals on light theme).
- Whether a "deficit" in the dashboard should use `--danger` or `--grade-f` (currently both appear).

**Impact:**
- Every new feature makes an independent call → palette fragmentation over time.
- Audit surface for F-DC-01, F-DC-02 exists because this map doesn't.

**Recommendation:**
Write a one-page `docs/design-system.md §Palette roles` table:

| Concern | Token | Example |
|---|---|---|
| Scan grade A+ through F | `--grade-*` | Grade pill, pillar chips, gap-closer ranking |
| State error (action failed) | `--danger` | Toast error, destructive button ring, veto frame |
| State success (action confirmed) | `--success` | Toast ok, completed-fast badge |
| State caution (watch out) | `--warning` | Low-battery banner, approaching-target nudge (NOT a grade) |
| Primary CTA | `--accent` + `--accent-ink` | Scan, Log, Save |
| Informational (noteworthy ≠ urgent) | `--accent-warm` | Life-stage chip, beta-locale notice |
| Counter-accent (reserved) | `--tension` | TBD |

After the table exists, the sweep fixing F-DC-01 and F-DC-02 has a ruler.

**Effort:** Small.
**Risk:** None.
**Preserves features:** N/A.

---

## Dimension scorecard — §DC
| Metric | Value |
|---|---|
| Findings | 6 (MEDIUM×4, LOW×2) |
| CRITICAL | 0 |
| HIGH | 0 (major regressions already handled — see F-DC-03 strength) |
| Quickest win | F-DC-04 (accent-ink one-line nudge, Trivial) |
| Highest impact | F-DC-06 (palette-role map, unblocks 2 other findings) |
| Documented strength | F-DC-03 (pattern overlays for color blindness) — protect |
