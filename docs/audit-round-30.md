# Audit — Round 30

Small consistency sweep.

## Fix/improve
- **R30.1** Grocery-list `normalizeKey` regex commented with source
  note — the combining-diacritics block is represented by literal
  combining characters in the source file; note explains what range
  the regex matches for editors that may display them oddly.
- **R30.2** Profile-dialog derived-list cleared via `textContent`
  instead of `innerHTML` — completes the innerHTML→textContent
  sweep that started in R11/R13/R17/R19.

## Arc state
- Tests: 567 passing.
