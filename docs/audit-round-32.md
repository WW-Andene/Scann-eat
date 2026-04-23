# Audit — Round 32

Service-worker precache shell sync.

## Fix/improve (real)
- **R32.1 (real PWA reliability bug)**: the service-worker `SHELL`
  precache list was frozen around R5/R6 and never updated as
  /features/ grew from a handful of modules to 25. Modules added
  since — including recipes-dialog, templates-dialog,
  qa-autocomplete, scanner, voice-dictate, reminders, appearance,
  settings-dialog, keybindings, profile-dialog, menu-scan,
  backup-io, install-banner, recipe-ideas, weight, fasting, plus
  /core/share.js, /core/date-format.js, /core/dateutil.js — were
  not precached on install. They still loaded via stale-while-
  revalidate on the first online visit, which papered over the bug
  most of the time — but a user who **installs the app** and then
  **goes offline before revisiting** hit failing dynamic imports
  (missing chunks) on their next open.
  
  Cache version bumped (`scann-eat-shell-r32`) so active SWs pick
  up the refreshed list; the activate handler's cleanup deletes
  the old cache entry.

## Arc state
- Tests: 567 passing.
- SHELL list now mirrors the actual import graph — every `/core/`,
  `/data/`, and `/features/` file the app reaches at boot.
