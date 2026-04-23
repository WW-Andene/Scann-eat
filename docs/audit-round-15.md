# Audit — Round 15

Same D1–D8 rubric. Round 15 closes another silent French-text leak
(this one in the additive-explanation dialog) and lights up a real
new interaction: the recent-scans summary chip's grade buckets are
now tappable filter shortcuts.

## D1 — Format & Conventions

- **TODO/FIXME count**: 0.
- **i18n keys**: +3 (`sourceLabel` × EN+FR, `recentSummaryFilter` ×
  EN+FR — 4 entries; counted as 3 keys).
- **Plural contract**: unchanged at 11 plural-aware keys.

## D2 — Health & Hygiene

- **`public/app.js`**: +27 lines (clickable summary buttons replace
  the plain-text node).
- **`public/core/i18n.js`**: +4 entries.
- **`public/styles.css`**: +27 lines (new `.recent-summary-grade`
  button rule + flex layout for the chip row).
- **Click listeners in app.js**: 61 → 61 (new buttons attach in the
  render loop, same shape as the existing scan-history items).

## D3 — Optimization

- `public/` total 876 KB → **879 KB** (+3 KB).
- Summary chip rebuilds on every `renderRecentScans()` call — same
  cadence as the list itself. No polling, no extra IDB read.
- Toggle behavior: clicking the active grade clears the filter,
  saving a trip through the grade `<select>` for users who want to
  go back to "all".

## D4 — Structure

- The summary chip went from "plain text node" to "structured row
  of accessible buttons". Each button carries `data-grade` (data
  contract for tests + future hooks), `aria-label` (screen-reader),
  and `aria-pressed` (toggle state).

## D5 — Logic & Correctness

- **R15.1 (real i18n bug)**: additive-explanation dialog hard-coded
  `Source : ${info.source}` with French label. EN users opening any
  additive's "Why?" dialog saw a French word at the head of the
  scientific reference. Fixed via `t('sourceLabel')` — text content
  itself stays as scientific reference data (locale-neutral).
- **R15.6 (real new interaction)**: each grade bucket in the
  recent-scans summary chip is now a button that filters the list
  to that grade. Clicking the active grade clears the filter
  (toggle). Powered by the existing `<select id="history-grade">`
  + `renderRecentScans()` plumbing — no new state, no new render
  path. Faster than the two-tap select-and-pick flow on a phone.
- **R15.2 (a11y)**: each summary button has both `aria-label`
  (descriptive) and `aria-pressed` (toggle state) — screen-reader
  users and keyboard users both get a coherent affordance.

## D6 — State & Data Integrity

- No new IDB stores, no schema change, no new state.
- Filter state still owned by the `<select>` value; the buttons
  read + write it.

## D7 — Error Handling

- `historyGradeSelect` falsy guard preserved (button click is a
  no-op if the select isn't on the page — matches the existing
  module-level optional-chain pattern).

## D8 — Async & Concurrency

- No new timers, no new fetches.
- Click handler synchronously sets the `<select>` value, then calls
  `renderRecentScans()` (async; awaits internal IDB read).

## Cycle summary — Round 15

**Fix/improve (real, user-visible):**
1. R15.1 Additive-explanation `Source :` now `t('sourceLabel')` — EN
   users no longer see a French word in their additive Why? dialogs.
2. R15.2 Summary-chip grade buttons carry both `aria-label` and
   `aria-pressed` — first-class a11y from day one.
3. R15.3 `summaryEl.textContent = ''` on each render so the buttons
   don't accumulate across re-renders.

**New features/elements (real, user-visible):**
4. R15.6 Recent-scans summary chip becomes interactive — each grade
   bucket is a one-tap filter shortcut. Toggling on the active
   grade clears the filter back to "all".
5. R15.7 New `.recent-summary-grade` CSS rule with hover, focus, and
   active states. Tap target ≥ 28 px tall.
6. R15.8 New i18n entries `sourceLabel` + `recentSummaryFilter`
   (EN + FR).

## Round-15 action items

| Severity | Item | Fix |
|----------|------|-----|
| Low | Additive `concern` text + `source` text are still French in the engine bundle — proper i18n needs DB-level translations | Out of scope; would need bilingual additives DB |
| Low | Grade buckets show counts from unfiltered `all`, but filter applies to visible list — could add a "(filtered: 3 visible)" hint | Defer; users can read the visible list directly |

No critical / major findings. Round 15 closes one more silent
French-leak bug and adds a real one-tap filter interaction users
will actually reach for.
