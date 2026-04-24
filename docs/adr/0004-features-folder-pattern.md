# ADR-0004 — Feature-folder pattern under `public/features/`

**Status:** Accepted · **Tier:** 1 · **Date:** 2026-04-22

## Context

`public/app.js` was a single monolithic entry point approaching 3,500 lines
before the feature-folder restructure. It handled everything: scanning,
scoring, dashboard rendering, dialog wiring, i18n application, feature
state — no separation. Adding a new feature meant editing app.js in 4-6
places and hoping you caught them all.

The `public/data/` and `public/core/` folders were already established:
storage modules and shared pure utilities respectively. What was missing
was a home for **UI + state modules that own their own DOM surface**.

## Options considered

### Option A — Component framework (React / Vue / Svelte)

**Pros**: standard pattern for UI decomposition.

**Cons**: a framework is a major Tier-2 decision in itself; the app had
already shipped value with vanilla ES modules; migration cost is high.

### Option B — "feature folder" convention with dependency injection

**Pros**: incremental; can extract one feature at a time; no framework
added; modules stay testable without a DOM shim if their business logic
is split cleanly from the UI wiring.

**Cons**: not enforced by the toolchain — drift is possible.

### Option C — Leave app.js as a monolith

**Pros**: zero migration work.

**Cons**: onboarding friction keeps growing; the 3500-line file is where
most incidents originate during maintenance.

## Decision

**Option B — feature folder.** Each feature lives in
`public/features/<feature>.js` and exposes two things:

- `init<Feature>(deps)` — called once at boot with a dependency object:
  `{ t, toast, renderDashboard, getProfile, … }`. The module stashes
  these in module-scope and wires up its DOM event listeners.
- `render<Feature>()` — called by the dashboard render loop to paint the
  feature's DOM surface. Returns feature-specific data the dashboard may
  want (e.g. `renderActivity()` returns today's burned kcal so the
  dashboard can compute Net = consumed − burned).

Tests live in a per-feature `*-tests.ts` file at the repo root
(`activity-tests.ts`, `meal-plan-tests.ts`, …). Pure-function helpers are
the test surface; IDB / DOM glue is tested manually.

## Shipped features under this pattern

`hydration` · `fasting-history` · `day-notes` · `grocery-list` ·
`meal-plan` · `activity` · `csv-import` (no UI — pure parser, invoked
from app.js).

Remaining extraction candidates (currently still inline in app.js): weight
summary, camera-scanner, quick-add, pairings UI, recipe-ideas dialog,
profiles, reminders. Each is ~50-200 lines of inline code.

## Consequences

- Adding a feature is a three-file change: `public/features/<feature>.js`,
  a `<feature>-tests.ts` file, and a single-line addition to `app.js` to
  call `init<Feature>()` at boot.
- The service worker's SHELL list has to include each feature file — build
  regeneration handles the cache key; the SHELL list itself is
  hand-maintained.
- Tests are genuinely per-feature — a regression in activity doesn't
  cascade to fasting-history tests.
- Drift risk: a feature module that reaches for `app.js` internals via
  `document.getElementById` instead of `deps` starts to re-couple. The
  hydration / fasting-history / day-notes / grocery-list / meal-plan /
  activity modules all respect the discipline today. Keeping them as the
  reference pattern is the only enforcement mechanism we have.

## Reversal cost

Low per-feature. A module can be re-inlined into app.js by copy-pasting
the exported functions and deleting the init call. Not recommended in
practice.

## Revisit trigger

- The feature count exceeds 15 and app.js starts growing linearly again
  because of orchestration boilerplate.
- A consumer of the code asks for a framework migration (React) in which
  case the feature-folder modules port more cleanly than the monolith
  would.
