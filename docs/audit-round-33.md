# Audit — Round 33

i18n honesty pass.

## Fix/improve (real)
- **R33.1 (real UX bug)**: `SUPPORTED_LANGS` declares
  `['fr', 'en', 'es', 'it', 'de']` but `STRINGS` only has `fr` and
  `en`. A new user with `navigator.language` starting with `es`,
  `it`, or `de` was auto-routed to that lang, then saw 99% English
  UI because every `t()` call fell through to the English fallback.
  Worse UX than just defaulting to English.
  
  `detectDefaultLang` now only auto-selects the navigator lang if
  `STRINGS[nav]` actually exists. Users can still opt into beta
  locales via the Settings selector — the `<option>` text now
  reads `(partiel · EN fallback)` so they know what they're
  getting.
- **R33.2 (honest labelling)**: language-selector options for
  es / it / de now include the explicit "EN fallback" parenthetical
  instead of just "(beta)" which implied a partial translation.

## Arc state
- Tests: 567 passing.
- Product note: the three beta lang options are kept in place so
  future translation work has a landing spot without a schema
  change; behaviour is now honest about what the user will see.
