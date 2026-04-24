# Audit — Round 20

Backup / restore audit. Two real data-integrity bugs fixed.

## Fix/improve (real)
- **R20.1 (real data-integrity bug)**: `saveTemplate` always
  regenerated the row's id — which meant backup/restore broke
  meal-plan slot references. A meal-plan slot stores
  `{ kind: 'template', id }`; after a restore the `id` no longer
  matched any template, and the slot silently became an orphan
  reference. `saveTemplate` now accepts and preserves the caller-
  supplied id (same contract as `saveRecipe`).
- **R20.2 (real undercount bug)**: the "N items imported" status
  line after restore omitted activity entries from the count. A
  backup with 500 consumption + 200 activity rows reported 500
  instead of 700. Fixed to include `data.activity?.length` in the
  sum.

## New features/elements

(R20 is heavier on fixes by design — the data integrity work is
the core scope.)

## Arc state

- Tests: 567 passing.
- Meal-plan slot references now survive backup/restore.
- Activity-count accuracy restored for v2 backups.
