#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-ADS01}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO_ROOT"

git fetch origin main
git pull --ff-only origin main

sudo "$REPO_ROOT/scripts/install.sh" "$INSTANCE_NAME"
