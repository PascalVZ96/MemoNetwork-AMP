#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT/MemoNetwork.css"

MODULES=(
  "00-variables.css"
  "10-base.css"
  "20-login.css"
  "30-instance-cards.css"
  "35-premium-dashboard.css"
  "36-dashboard-polish.css"
  "39-live-metrics.css"
  "40-console.css"
  "50-filemanager.css"
  "60-shared-panels.css"
  "65-design-system.css"
  "70-server-control.css"
  "75-scheduler-pro.css"
  "80-metrics-pro.css"
  "85-settings-pro.css"
  "90-ui-polish.css"
)

{
  echo '/* MemoNetwork Edition v4.9 - generated file */'
  for module in "${MODULES[@]}"; do
    echo
    echo "/* ===== $module ===== */"
    cat "$ROOT/modules/$module"
  done
} > "$OUT"

echo "Gebouwd: $OUT"
