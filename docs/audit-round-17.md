# Audit — Round 17

Custom foods dialog audit. Five real fixes (macro label, delete
confirmation, focus management × 2, innerHTML→textContent) + five
i18n/UX polish items.

## Cycle summary

**Fix/improve (real):**
1. R17.1 `list.innerHTML = ''` → `textContent = ''`.
2. R17.2 Delete confirmation added — previously a single misclick
   wiped the entry with no undo path. Tier-2 destructive pattern
   matches clear-today / clear-fast-history / telemetry-clear.
3. R17.3 Row label expanded from `name · kcal · P g / 100 g` to the
   full `P · C · F` macro breakdown so the user sees what they
   saved without opening an edit flow.
4. R17.4 Dialog open pre-focuses the name input (deferred one tick
   so showModal layout completes).
5. R17.5 After-save returns focus to the name input so the user can
   chain entries without touch-navigation.

**New features/elements:**
6. R17.6 New i18n key `customFoodRow` pins the macro-line template
   with proper locale-aware macro abbreviations (FR: G/L, EN: C/F).
7. R17.7 New i18n key `customFoodDeleteConfirm` with user-facing name
   interpolated into the confirm message.

## Arc state

- Tests: 567 passing.
- Zero TODO/FIXME across the tree.
