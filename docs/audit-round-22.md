# Audit — Round 22

Recipe-ideas + pantry audit. Two real bugs fixed.

## Fix/improve (real)
- **R22.1 (real regression since R9.1)**: the pantry-submit handler
  calls `recipesDialog?.close()` to hide the Recipes dialog behind
  the new cards view. R9.1 changed `recipesDialog` from a DOM
  element to a module handle that exposes
  `{ setLastIdentifiedPlate, renderRecipesList }` — no close method.
  Optional chaining silently no-op'd the call. The Recipes dialog
  stayed open over the Pantry Ideas cards, pushing the feature
  below the fold. Fixed by reaching for the DOM element directly.
- **R22.2 (error-path consistency)**: recipe-ideas fetcher now
  translates 429 responses to `t('errRateLimit')` (direct + server
  paths). Previously the user saw a generic "failed" toast on
  rate-limit, suggesting to abandon the feature instead of retry.
  Matches the `identifyViaModePath` pattern from app.js.

## Arc state
- Tests: 567 passing.
- Error messaging is now consistent across all three LLM-backed
  flows (identify food, identify multi, identify menu, suggest
  recipes, suggest from pantry).
