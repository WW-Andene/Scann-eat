# Decision Registry

> Per `app_development_SKILL.md §I.4`. Every Tier-1 (cheap to reverse) and
> Tier-2 (expensive to reverse) autonomous decision lands here. Tier-0 decisions
> (naming a local variable, file organisation internal to a module) do not.
> Tier-3 decisions (irreversible) should never appear here — those must be
> "stop and ask" events. The entries below are a retrofit: pulled from the
> commit history on `claude/improve-ocr-ingredient-parsing-zxgSf`, converted to
> the skill's ADR-lite format.

## [2026-04-22] Empirical pairing source: Ahn 2011 recipe-corpus (s3), not molecular-compound backbone (s2)

**Tier:** 2
**Context:** First-cut `pairings.js` was hand-written from memory with an
incorrect "Sourced from Larousse" claim. Needed a real source that also
produced useful output.
**Options considered:**
  - Ahn 2011 backbone (s2 molecular-similarity CSV) — pro: the paper's headline
    structure. Con: dominated by alcoholic beverages, poor fit for Mediterranean
    home cooking (paper itself documents this in §3).
  - Ahn 2011 recipe corpus (s3 CSV of 56,498 published recipes) — pro: empirical
    co-occurrence in actual cookbooks; produces "tomate → basilic" as expected.
    Con: larger data, cuisine-biased toward US/Italian.
  - Licensed databases (Foodpairing, Flavor Network commercial) — rejected:
    licensing not established; cost unknown.
**Decision:** s3 recipe corpus with PPMI × √count scoring.
**Rationale:** Peer-reviewed, open-access, and produces culinarily-meaningful
output. PPMI suppresses ubiquitous staples; √count prefers well-evidenced
pairs.
**Reversal cost:** Low — `tools/generate-pairings.mjs` could be re-pointed at
a different input file.
**Revisit trigger:** If Foodpairing / Larousse commercial API becomes accessible
with a defensible licence.

## [2026-04-22] IDB schema v6: add `activity` store for exercise logging

**Tier:** 2
**Context:** Exercise logging (#1) needed a new persisted store alongside
`consumption`, `weight`, `recipes`, etc.
**Options considered:**
  - New store in IDB — pro: same persistence layer as everything else, works
    offline, backup/restore covers it. Con: coordinated DB_VERSION bump across
    7 sibling modules that all share `scanneat` DB.
  - localStorage — pro: no migration. Con: no indexing, size-limited, at odds
    with the rest of the data model.
**Decision:** IDB v6 bump, new `activity` store with date index.
**Rationale:** Consistent with every other time-series data in the app.
**Reversal cost:** Low if caught early; medium once users have data (would
need a v6 → v7 dropping the store and migrating to localStorage).
**Revisit trigger:** If IDB quota becomes a problem on low-end devices.

## [2026-04-22] LLM provider: Groq (Llama 4 Scout)

**Tier:** 2
**Context:** Need a vision-capable LLM for label OCR + food photo
identification + recipe suggestion. Two call modes needed: server-key (Vercel
env) and direct (user's key in the browser).
**Options considered:**
  - Groq `meta-llama/llama-4-scout-17b-16e-instruct` — pro: generous free
    tier, low latency, OpenAI-compatible API, vision + text. Con: newer model,
    less battle-tested than GPT-4o.
  - OpenAI GPT-4o / Anthropic Claude — pro: incumbent, robust. Con: no free
    tier; user-key direct-mode would push costs to the end user immediately.
**Decision:** Groq with option for either server or direct-mode keys.
**Rationale:** Free tier keeps low-traffic deployments at $0; user-key path
puts cost visibility in the user's hands.
**Reversal cost:** Low — `ocr-parser.ts` has one `callGroqVision` helper. A
swap to another OpenAI-compatible endpoint is a URL + model-name change.
**Revisit trigger:** If Groq's free tier terms change materially or if scout
model quality issues accumulate in production.

## [2026-04-22] Pantry search as a new endpoint vs. overloading suggestRecipes

**Tier:** 1
**Context:** #B3.2 needed ingredient-first recipe search. Existing
`suggestRecipes(ingredient)` accepted a single ingredient string.
**Options considered:**
  - Overload `suggestRecipes` to accept `string | string[]`. Pro: one endpoint.
    Con: two very different prompt shapes get tangled; callers have to discriminate.
  - New `suggestRecipesFromPantry(items)` + `/api/suggest-from-pantry`. Pro:
    clean separation, each prompt tuned for its task.
**Decision:** Separate function + endpoint.
**Rationale:** Prompts for the two tasks are meaningfully different —
pantry-first tells the model to USE the listed items + staples; single-
ingredient tells it to center AROUND the ingredient. Separation keeps prompt
regression bisectable.
**Reversal cost:** Trivial.
**Revisit trigger:** None expected.

## [2026-04-22] Dashboard gap-closer uses PPMI-like density ranking, half-deficit targeting

**Tier:** 1
**Context:** B4.1. Given today's gap in a "more is better" nutrient, rank
FOOD_DB suggestions by their capacity to close it.
**Options considered:**
  - Close 100% of the gap — honest math but implies "you must eat 280 g of
    lentils". Not friendly.
  - Close ~50% of the gap, sort by per-100 g density, cap grams per nutrient —
    nudges the user toward the most nutritious option at a realistic portion.
  - LLM-generated suggestions — would be opinionated but slow and requires a
    round trip for every dashboard render.
**Decision:** Half-gap heuristic, density-sorted, grams cap.
**Rationale:** Fast (pure function), honest (the math is documented in the
function header), and user-friendly.
**Reversal cost:** Trivial — `closeTheGap()` is one pure function.
**Revisit trigger:** User feedback that suggestions feel unrealistic.

## [2026-04-22] Meal plan in localStorage, not IDB

**Tier:** 1
**Context:** B4.2 — forward-looking 7-day meal plan.
**Options considered:**
  - IDB store (another DB_VERSION bump and migration).
  - localStorage at `scanneat.mealPlan`, auto-pruning dates older than 7
    days.
**Decision:** localStorage.
**Rationale:** Tiny dataset (max 7 days × 4 meals × small slot objects).
Auto-pruning keeps it below 2 KB. Avoids yet another IDB migration. Falls
through backup.js's scanneat.* sweep automatically.
**Reversal cost:** Low — migration to IDB would read the localStorage key
once and write to a new store.
**Revisit trigger:** If users ask for longer-horizon plans or cross-device
sync (which would need a server anyway).

## [2026-04-22] CSV import schemas: MyFitnessPal + Cronometer only (v1)

**Tier:** 1
**Context:** B8.2 — import historical entries from other nutrition apps.
**Options considered:**
  - Support 5-10 formats (MFP, Cronometer, Lose It, Yazio, FDDB, etc.).
  - Support 2 now (MFP + Cronometer), document the detector, let the community
    add more via PRs.
**Decision:** 2 now.
**Rationale:** MFP + Cronometer cover ~80% of serious logged-history users.
The `detectFormat(header)` pattern is extensible — a contributor adds a new
detector arm + mapper function; no schema change. Shipping more formats
without a real user who has that file is speculative.
**Reversal cost:** Trivial.
**Revisit trigger:** Any user lands with a Yazio / Lose It / Fatsecret export.

## [2026-04-22] A11y baseline: skip link + focus-visible + live regions already in place; only dashboard-remaining was missing

**Tier:** 1
**Context:** B7.2 WCAG audit. Most of the surface was already correct
(`.skip-link`, `focus-visible` rules, `aria-live` on toasts + camera + day
note counter).
**Options considered:**
  - Deep per-axe violation sweep — would need axe-core or playwright.
  - Spot audit + fix the most impactful gap (dashboard-remaining, the
    biggest runtime update a screen reader should hear).
**Decision:** Spot audit + targeted fix.
**Rationale:** Deep sweep without real screen-reader testing is theatre.
The existing infrastructure is solid; incremental attention is where the
remaining wins are.
**Reversal cost:** N/A — additive change.
**Revisit trigger:** First user report, or any new dialog / high-traffic
dynamic region that ships without explicit aria wiring.

## [2026-04-22] Fix presenter-tests hang: add `g` flag to portion regex in `parseVoiceQuickAdd`

**Tier:** 1
**Context:** B6.1. `presenter-tests.ts` had been silently hanging for weeks.
Root cause: `while ((m = portionRe.exec(text)) !== null)` with a regex that
didn't carry the `g` flag, so `.exec()` never advanced `lastIndex` — a
`continue` inside the loop hit the same match forever.
**Options considered:**
  - Rewrite the loop to manually track `lastIndex` — not idiomatic.
  - Add `g` flag to the RegExp constructor — the idiomatic fix.
  - Replace the loop with a single `matchAll` — also valid; more invasive.
**Decision:** Add `g` flag + inline comment + also accept "of" alongside
"de" in the macro-label regexes (fixed the EN-vocabulary test that had been
failing).
**Rationale:** Smallest intervention; documented so next maintainer can't
accidentally drop the flag.
**Reversal cost:** N/A.
**Revisit trigger:** Any future regex constructed in a `.exec()` loop should
follow the same pattern (noted in the header comment).

## [2026-04-22] Allergens audit: `ANNEX_II_KEYS` exported + two plural-form bugs fixed

**Tier:** 1
**Context:** B7.1. Audit found the 14 EU Annex II keys were correctly
listed, but the crustaceans + molluscs regexes only matched singular forms —
a silent-miss safety bug.
**Options considered:**
  - Rewrite every regex to include plurals via a generated suffix.
  - Spot-fix the two confirmed bugs + add structural test pinning the 14 keys.
**Decision:** Spot-fix + pin.
**Rationale:** Every rule now has a positive-example test; the structural test
pins ANNEX_II_KEYS so a future rename/drop fails CI.
**Reversal cost:** N/A.
**Revisit trigger:** If a user reports missed allergens on a specific product.
