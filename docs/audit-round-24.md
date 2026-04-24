# Audit — Round 24

Accessibility sweep — scan-history rows.

## Fix/improve (real, a11y)
- **R24.1** Recent-scan `<li>` items in the history list are now
  keyboard-activatable via `makeActivatable` (adds `role="button"`,
  `tabindex="0"`, Enter/Space handler). Screen-reader + keyboard
  users can now reopen a historical scan — previously the items
  were click-only.
- Each row also carries an `aria-label` that includes the scan
  name (falls back to the generic "Reopen scan" label when the
  name is missing).

## New features/elements
- **R24.2** New i18n key `reopenScan` (EN + FR).

## Arc state
- Tests: 567 passing.
- All interactive elements in the app are now either native buttons
  or use the `makeActivatable` helper for keyboard/SR support.
