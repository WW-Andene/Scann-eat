# Audit — Round 18

Meal-plan dialog audit.

## Fix/improve (real)
- R18.1 Clear-day now confirms before wiping. Previously one
  accidental tap silently deleted the day's plan with no undo.
  Only confirms when the day actually has slots.
- R18.2 Apply-toast date is now locale-formatted ("Thu 23 Apr")
  instead of raw ISO ("2026-04-23"). Routes through the same
  `dateFormatter(locale, {weekday, day, month})` already used by
  the dashboard header.
- R18.3 Notes longer than 40 chars now surface the full text in
  the `<option>` `title` attribute — users hover/long-press the
  select to see the whole note without opening the edit prompt.

## New features/elements
- R18.4 New i18n key `mealPlanClearDayConfirm` (EN + FR).

## Arc state

- Tests: 567 passing.
