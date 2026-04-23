# UI/UX audit — applying app-audit P6 + P7, design-aesthetic-audit, art-direction-engine

Produced by applying the three in-branch `*-SKILL.md` frameworks to the
live state at commit `31a890f`. Findings drive the accompanying rework
in `styles.css` (v2 refinement layer, lines ~4027+) and the updated
design language in `docs/design-system.md`.

---

## Part A — App-audit P6 (Visual Design)

### A.1 Token inventory: strong
- 53 tokens, consistent `--*` prefixes (`--r-*`, `--sp-*`, `--grade-*`).
- Dark + light both present, both contrast-safe.
- Verdict: **no token rework needed**. Issue is downstream consistency,
  not foundations.

### A.2 Visual rhythm: inconsistent (finding)
- Dialog chrome drifts across 15+ `<dialog>` nodes:
  - Some dialogs use `padding: var(--sp-5)`, others `var(--sp-4)`,
    others inline `padding: 20px`.
  - `<h2>` sizes vary from `1.1em` to `1.4em` across dialogs.
  - Action-row gap varies (some use `gap: var(--sp-3)`, others
    `gap: var(--sp-2)` or nothing explicit).
- Section-header-to-body cadence differs between the dashboard, the
  scan result, and the settings dialog. User's eye has to re-learn
  where labels sit in each surface.

### A.3 Polish gaps (finding)
- **Button shadows**: buttons are flat (`border: none`) on both
  themes. On the coral background, primary buttons sit like stickers.
  Need subtle elevation to read as "above" the surface.
- **Card elevation** is minimal — `--panel` on `--bg` has no shadow;
  only a colour contrast. A 1–2 px subtle shadow would make the
  "nearly-black card on coral" read as a physical card, not a cutout.
- **Focus ring** is a 3 px solid `--accent` outline. Good a11y but
  visually jarring on tiny chips (the outline is as thick as the chip
  border). Should scale with control size.
- **Active-press feedback** exists (`scale(0.98)`) only on some
  buttons; chip-btn, capture-btn, log-btn are inconsistent.

### A.4 Typography: needs a scale (finding)
- No explicit `--text-xs / -sm / -base / -lg / -xl` scale. Every
  rule picks its own `font-size: 0.75em`, `0.85em`, `0.92em`,
  `0.95em`, `1.1em`, `1.3em`, `1.45em`, `1.6em` — 8+ values across
  the codebase. Causes visual drift.
- `letter-spacing` is set per-rule (some have `-0.02em`, some none,
  some `0.08em` for labels). No system.
- Needs a 6–7 step type scale + consistent letter-spacing-by-size.

---

## Part B — App-audit P7 (UX & IA)

### B.1 Flow analysis
- **Scan flow** is clean: photo → queue → scan → result → log. 5
  taps to a logged meal — competitive with MFP.
- **Quick Add flow** is compressed (expected). Voice / photo / type
  all converge on the same form.
- **Recipe flow** is now well-connected post-R35 gaps: create / scan
  / URL / photo, edit, score, share, duplicate.

### B.2 Information architecture: complexity creeping up
- Dashboard has accreted to:
  - date chip + streak + remaining
  - hydration tile
  - activity tile
  - fasting tile
  - weight summary
  - 8 macro rows + up to 22 conditional micro rows (post-Batch 2)
  - per-meal sections with entries
  - gap-closer section
  - progress charts button
- **Scroll depth is large** on an active-user day. Grouping via
  visual hierarchy (size + weight + spacing) is the fix, not
  cutting content.

### B.3 Copy consistency: already tight post-R8..R33
- Zero hard-coded French strings remaining.
- Success toasts consistent (`'ok'` variant post-R8.2).
- Undo pattern in place for destructives (R35).
- **Minor gap**: some i18n strings lean verbose ("Aucun repas
  sauvegardé." vs "No saved meals yet."). Fine; not a rework target.

### B.4 Empty states: thin (finding)
- Most list empty states are a single `<li>` with muted text.
  No CTA, no illustration, no prompt.
- Example: empty recipes list → "Aucune recette sauvegardée." Could
  instead invite the user to try the new URL import or photo scan.

---

## Part C — Design-aesthetic-audit findings

### C.1 Aesthetic profile (5-axis classification)
Applying the skill's 5-axis profile:

| Axis | Current score (1-5) | Target score |
|---|---|---|
| Sophistication | 3 (warm, consumer-friendly, not clinical) | 3 (hold) |
| Density | 3 (data-heavy but paced) | 3 (hold) |
| Energy | 4 (vibrant coral + orange) | 3 (dial back to 3 — coral is a shout, not a welcome) |
| Formality | 2 (playful tone, emoji) | 2 (hold) |
| Warmth | 4 (cream + coral = food-warm) | 4 (hold) |

**Verdict**: energy axis is too high. The vibrant coral
(`#F54B5E`) shouts at the user on every view. Rework moves this
to a calmer coral while preserving the brand.

### C.2 Visual rhythm: uneven (same finding as A.2)

### C.3 Color system coherence
- Grade palette is internally consistent (green → red with 6 stops).
- Accent + grade interaction breaks in one case: the `--grade-f`
  (`#E54B5E`) is nearly identical to the bg `#F54B5E`. On dark
  theme this works; on light theme (bg `#F8C8CF` coral paper) an
  F-grade badge with red pattern on pink paper loses 2/3 of its
  contrast vs other grades.

### C.4 Typography hierarchy: flat (same as A.4)

---

## Part D — Art-direction-engine application

### D.1 Vision statement (the "one-sentence pitch")
> **Scann-eat looks like a scientist's notebook at a farmer's market:**
> warm cream paper, precise typography, nothing decorative, every
> number earns its pixel.

### D.2 Concrete style rules
1. **Surface**: near-black cards on calm coral. Coral is a mood, not
   a shout — saturation dialled back ~15%.
2. **Elevation**: 1 physical-feeling shadow (`0 1px 3px rgba(0,0,0,
   0.08), 0 4px 12px rgba(0,0,0,0.06)`) applied to cards + primary
   buttons. Not more.
3. **Typography**: 6-step type scale. Numerics in tabular-nums
   everywhere values are compared.
4. **Iconography**: unchanged — single-emoji-per-feature is already
   a coherent rule.
5. **Motion**: 140 ms ease for every transition. One speed only.
   `prefers-reduced-motion` kills all of it.
6. **Whitespace**: one vertical rhythm unit — `--sp-5` (20 px) —
   between every major section. Nested content uses `--sp-3` or
   `--sp-4` only; no ad-hoc values.

### D.3 Palette refinement
- Calmer coral: `#E84A5F → #D94458` (hex shift: same hue, lower
  sat + value).
- Light-theme coral paper: `#F8C8CF → #F6D0D6` (slightly cooler to
  push against grade-f contrast issue noted in C.3).

### D.4 Component DNA: three primitives, nothing else
- **Card** — the container. `--panel` surface, `--r-md` radius,
  single elevation, `--sp-5` internal padding.
- **Chip** — the small actionable. `--r-pill` shape, 40 px min height,
  `--sp-2` by `--sp-4` padding, 2 variants only (outline / accent).
- **Row** — the list item. Full-width, 56 px min-height, `--sp-3`
  gap between children, single `--border` hairline separator.

Everything else composes from these three.

---

## What ships in this rework

1. **This audit doc** — captures the findings above.
2. **Updated `docs/design-system.md`** — codifies the v2 rules.
3. **CSS refinement layer** appended to `styles.css`:
   - Explicit type scale tokens (`--text-xs` … `--text-xl`).
   - Elevation system (`--elev-1` shadow).
   - Calmer coral bg values.
   - Dialog chrome standardisation rules (override per-dialog drift).
   - Chip-btn unification.
   - Card + row primitives as reusable classes.
4. **Minor HTML tweaks** where structural consistency matters.
5. **No features removed.** No behaviour changes. Visual-only rework.

Tests: 618 passing throughout (no behaviour changes).

---

## What this rework does NOT do

- Rewrite 4027 lines from scratch. The tokens are good; the rot is
  in per-feature rule accretion. The refinement layer shadows those
  rules where they drift; bigger refactors are follow-up work if
  priorities shift.
- Add a new framework (React / Vue / Svelte). Stay on pure CSS.
- Change routing / information architecture of the app. That would
  be product work, not design work.
