#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-ADS01}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/theme/MemoNetwork"
TARGET="/home/amp/.ampdata/instances/$INSTANCE_NAME/WebRoot/Themes/AMPThemes/MemoNetwork"

if [[ $EUID -ne 0 ]]; then
    echo "Gebruik: sudo ./scripts/install.sh [INSTANCE_NAME]"
    exit 1
fi

if [[ ! -d "$SOURCE" ]]; then
    echo "Themamap niet gevonden: $SOURCE"
    exit 1
fi

if [[ ! -d "$(dirname "$TARGET")" ]]; then
    echo "AMP-themamap niet gevonden voor instance: $INSTANCE_NAME"
    exit 1
fi

if [[ -d "$TARGET" ]]; then
    BACKUP="${TARGET}.backup-$(date +%Y%m%d-%H%M%S)"
    echo "Back-up maken: $BACKUP"
    cp -a "$TARGET" "$BACKUP"
fi

if [[ -x "$SOURCE/build-theme.sh" ]]; then
    echo "MemoNetwork.css bouwen..."
    sudo -u amp -H "$SOURCE/build-theme.sh"
fi

mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"
chown -R amp:amp "$TARGET"
find "$TARGET" -type d -exec chmod 755 {} \;
find "$TARGET" -type f -exec chmod 644 {} \;
chmod 755 "$TARGET/build-theme.sh" 2>/dev/null || true

echo "MemoNetwork Edition geïnstalleerd voor $INSTANCE_NAME."
echo "Vernieuw AMP met Ctrl+Shift+R."
