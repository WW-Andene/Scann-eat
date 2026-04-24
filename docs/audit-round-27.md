# Audit — Round 27

Two real bugs in `/features/meal-plan.js`.

## Fix/improve (real)
- **R27.1** `pruneOld` cutoff used UTC day; now local via
  `localDateISO`. Users in negative UTC offsets had their oldest
  retained day pruned hours early.
- **R27.2** `isoToday()` at the `weekDates` default-arg branch was a
  **runtime-breaking bug**: `export { localDateISO as isoToday }
  from '../core/dateutil.js'` is a re-export, not a local import, so
  `isoToday` was never bound in the module scope. Calling
  `weekDates()` with no args threw `ReferenceError: isoToday is not
  defined`. Caught in tests only because every test passes a
  `startDate`. Fixed by proper local import + using `localDateISO()`
  directly at the callsite.

## Arc state
- Tests: 567 passing.
