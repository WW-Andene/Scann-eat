#!/usr/bin/env bash
# audit-ruler.sh — character-brief decision filters as grep tests.
# Codifies the design-system.md §Character filters so PRs that silently
# reintroduce off-character patterns fail fast.
#
# Run manually:   bash tools/audit-ruler.sh
# In CI:          add to npm test / pre-commit hook.
#
# Exits 0 if every counter is within the allowed budget, 1 otherwise.
# Budgets are set at 2026-04 baseline + small headroom; tighten over time.
set -euo pipefail

cd "$(dirname "$0")/.."
CSS=public/styles.css
FAIL=0

check() {
  local label="$1" actual="$2" budget="$3"
  if [ "$actual" -le "$budget" ]; then
    printf "  ok  %-40s %3d / %d\n" "$label" "$actual" "$budget"
  else
    printf "  !!  %-40s %3d / %d (OVER)\n" "$label" "$actual" "$budget"
    FAIL=1
  fi
}

echo "audit-ruler.sh — character-brief enforcement on $CSS"
echo ""

# Raw font-size literals (audit F-DTA-02). We exclude `font-size: 1em`
# which is always an intentional "same size as parent" reset on form
# controls and one-off inline elements; it's not really off-scale.
# Baseline ~92 − 29 × 1em ≈ 63; budget 70 with headroom.
check "raw font-size literals (excl. 1em resets)" \
  "$(grep -E 'font-size:\s*[0-9]' "$CSS" | grep -cvE 'font-size:\s*1em')" 70

# Hardcoded transition durations in ms/s (audit F-DTA-03 + F-DM-01).
# Baseline 28; swept to 10 on 2026-04 (2 reduce-motion overrides +
# 8 var() fallbacks that still contain a literal ms string). Budget
# 12 to allow small headroom.
check "hardcoded transition ms" \
  "$(grep -cE 'transition[^;]*[0-9]+m?s' "$CSS")" 12

# Raw hex colors in rule bodies (outside token declarations). We
# strip lines that declare a custom property (start with `  --name:`)
# before counting so the :root blocks don't inflate the number.
# Baseline ~57; target ≤ 45.
check "raw hex colors in rule bodies" \
  "$(grep -vE '^\s*--[a-zA-Z0-9-]+:' "$CSS" | grep -oE '#[0-9a-fA-F]{3,8}' | wc -l)" 60

# outline: none rules (audit F-G-01). All remaining ones must have
# a box-shadow or background replacement that provides ≥3:1 contrast.
# Baseline 14; target ≤ 11 after the dialog-input restoration.
check "outline: none rules" \
  "$(grep -cE 'outline:\s*(none|0)' "$CSS")" 12

# backdrop-filter declarations (audit F-CS-02). Character brief says
# glass demoted — only the dialog::backdrop scrim should carry it.
# Baseline 10 across 3 rule blocks; target ≤ 4 (prop + webkit × 1 rule
# + 1 reduce-motion block).
check "backdrop-filter declarations" \
  "$(grep -cE 'backdrop-filter' "$CSS")" 6

# !important usage. The CSS should almost never need it.
check "!important declarations" \
  "$(grep -c '!important' "$CSS")" 15

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "audit-ruler: PASS — every counter within budget."
else
  echo "audit-ruler: FAIL — one or more counters exceeded."
  echo ""
  echo "To raise a budget, edit tools/audit-ruler.sh AND document the"
  echo "reason in the commit message. Silent budget creep defeats the point."
  exit 1
fi
