# Audit — Round 31

innerHTML → textContent batch sweep. Zero `.innerHTML = ''`
callsites remain in `public/app.js` or `public/features/`.

## Fix/improve
- **R31** Converted 12 remaining `.innerHTML = ''` → `.textContent = ''`
  across `app.js` (8), `weight.js` (2), `activity.js` (1),
  `templates-dialog.js` (1). Every container cleared this way holds
  only code-generated children; the swap is behaviour-identical,
  avoids the HTML-parser trip (imperceptibly faster), and removes
  the theoretical XSS surface.

## Arc state
- Tests: 567 passing.
- Zero `innerHTML` uses left in the public JS tree.
