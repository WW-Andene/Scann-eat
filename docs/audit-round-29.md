# Audit — Round 29

Meal reminder Notification dedup.

## Fix/improve (real)
- **R29.1** Meal reminders now pass `tag: scanneat-reminder-${meal}`
  to the Notification constructor. Previously, if a user had
  multiple tabs open (service-worker registered same page) or the
  scheduler re-fired on re-registration, stacked notifications
  appeared. With a per-meal tag, a new fire replaces the prior one
  of the same meal while keeping different meals distinct.

## Arc state
- Tests: 567 passing.
