# Audit — Round 25

Data-integrity sweep. One real silent bug found + fixed across
two call paths.

## Fix/improve (real)
- **R25.1 (real data-integrity bug, both entry paths)**: `buildEntry`
  and `buildQuickAdd` both stamped the `date` field with
  `new Date(now).toISOString().slice(0, 10)` — the UTC day, not the
  user's local day. A user in UTC−5 logging a meal at 9 pm local
  (2 am UTC the next day) saw the entry filed under **tomorrow's**
  date. It showed up in tomorrow's dashboard, not today's; it was
  counted in tomorrow's rollup, weekly, monthly; and the "diary
  complete" chip missed it for today.
  Fixed by routing through `localDateISO(now)` from
  `/core/dateutil.js` — the same helper already used by `todayISO()`
  and every other date-sensitive module. 

  This bug was the mirror image of R8.4 (export-history UTC
  filename) but applied to the main data path. High impact, silent
  failure.

## Audit notes

- Other `toISOString().slice(0, 10)` callsites reviewed and cleared:
  - `weight-log.js:138` — computes a 7-day cutoff. Off-by-one UTC
    drift by a single day is absorbed by the ± tolerance of the
    weekly trend regression.
  - `meal-plan.js:51, 74` — weekDates() + pruning cutoff. Meal plans
    are user-facing dates the user chose — if the helper reported
    today's "local" ISO for the first day in a 7-day range, UTC
    would sometimes start the week on the wrong day. **Candidate
    for future audit round** but lower impact than the consumption
    data path.
  - `presenters.js:995` — daily CSV export uses `Date(year, month,
    day)` local constructor then `toISOString`. Because the input
    was already a local date string, this introduces UTC drift on
    export. Minor.

## Arc state
- Tests: 567 passing (consumption-tests.ts exercises buildEntry /
  buildQuickAdd with `now` fixed, so the UTC vs local distinction
  is test-invisible — good test-flake avoidance, but also explains
  why the bug stayed hidden this long).
- Real silent bugs killed in the R8–R25 arc: 15 (now +R25.1 for
  both buildEntry and buildQuickAdd).
