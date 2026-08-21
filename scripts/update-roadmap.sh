#!/usr/bin/env bash
# Recomputes the progress tracker (overall bar + per-phase rows) at the top of roadmap.md.
# Usage: bash scripts/update-roadmap.sh [path-to-roadmap.md]
# The header block is everything between the <!-- PROGRESS-START --> and
# <!-- PROGRESS-END --> markers; it is fully regenerated from checkbox counts.
set -euo pipefail

cd "$(dirname "$0")/.."
FILE="${1:-roadmap.md}"

[ -f "$FILE" ] || { echo "error: $FILE not found" >&2; exit 1; }

# Pass 1: count done/total checkboxes per "## Phase" section.
SUMS="$(mktemp)"
awk '
/^## Phase / {
  if (in_phase) print pname "|" pdone "|" ptotal
  pname = substr($0, 4)   # strip "## "
  pdone = 0; ptotal = 0; in_phase = 1
  next
}
in_phase && /^- \[[ x]\]/ {
  ptotal++
  if ($0 ~ /^- \[x\]/) pdone++
  next
}
END { if (in_phase) print pname "|" pdone "|" ptotal }
' "$FILE" > "$SUMS"

# Totals across all phases.
TOTAL=0; DONE=0
while IFS='|' read -r _pname pdone ptotal; do
  TOTAL=$((TOTAL + ptotal)); DONE=$((DONE + pdone))
done < "$SUMS"

# bar <filled> <width>: prints a UTF-8 progress bar.
bar() {
  local n="$1" w="$2" s="" i
  for ((i = 0; i < n; i++)); do s="${s}█"; done
  for ((i = n; i < w; i++)); do s="${s}░"; done
  printf '%s' "$s"
}

# Overall bar (40 blocks).
PCT=0
if [ "$TOTAL" -gt 0 ]; then
  PCT=$(( (DONE * 100 + TOTAL / 2) / TOTAL ))
fi
FILL=$(( (PCT * 40 + 50) / 100 ))
OVERALL="$(bar "$FILL" 40)"

# Build the new header block.
HDR="$(mktemp)"
{
  echo "**\`[$OVERALL]\` ~$PCT%** — $DONE / $TOTAL tasks completed"
  echo
  echo "| Phase | Done | Bar |"
  echo "|---|---|---|"
  while IFS='|' read -r pname pdone ptotal; do
    [ -z "$pname" ] && continue
    if [ "$ptotal" -eq 0 ]; then
      echo "| $pname | 0/0 | \`[$(bar 0 10)]\` |"
      continue
    fi
    p=$(( (pdone * 100 + ptotal / 2) / ptotal ))
    f=$(( (p * 10 + 50) / 100 ))
    [ "$f" -gt 10 ] && f=10
    echo "| $pname | $pdone/$ptotal | \`[$(bar "$f" 10)]\` |"
  done < "$SUMS"
} > "$HDR"

# Pass 2: replace everything between the markers with the new header.
awk -v hdr="$HDR" '
/^<!-- PROGRESS-START -->/ {
  print
  while ((getline line < hdr) > 0) print line
  close(hdr)
  skip = 1
  next
}
/^<!-- PROGRESS-END -->/ { skip = 0; print; next }
skip { next }
{ print }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

rm -f "$SUMS" "$HDR"
echo "Updated $FILE: $DONE / $TOTAL tasks ($PCT%)"
