#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-ADS01}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/theme/MemoNetwork"
WEBROOT="/home/amp/.ampdata/instances/$INSTANCE_NAME/WebRoot"
TARGET="$WEBROOT/Themes/AMPThemes/MemoNetwork"
AMP_HTML="$WEBROOT/AMP.html"
SCRIPT_VERSION="520"
SCRIPT_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/MemoNetwork.js?v=${SCRIPT_VERSION}\"></script>"

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

if [[ -f "$SOURCE/build-theme.sh" ]]; then
    echo "MemoNetwork.css bouwen..."
    bash "$SOURCE/build-theme.sh"
fi

mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"
chown -R amp:amp "$TARGET"
find "$TARGET" -type d -exec chmod 755 {} \;
find "$TARGET" -type f -exec chmod 644 {} \;
chmod 755 "$TARGET/build-theme.sh" 2>/dev/null || true

if [[ -f "$AMP_HTML" ]]; then
    sed -Ei '\#<script src="/Themes/AMPThemes/MemoNetwork/DashboardPro\.js[^\"]*"></script>#d' "$AMP_HTML"

    if grep -q '/Themes/AMPThemes/MemoNetwork/MemoNetwork.js' "$AMP_HTML"; then
        sed -Ei "s#<script src=\"/Themes/AMPThemes/MemoNetwork/MemoNetwork\\.js[^\"]*\"></script>#<script src=\"/Themes/AMPThemes/MemoNetwork/MemoNetwork.js?v=${SCRIPT_VERSION}\"></script>#" "$AMP_HTML"
    else
        HTML_BACKUP="${AMP_HTML}.memonetwork-backup-$(date +%Y%m%d-%H%M%S)"
        echo "AMP.html back-up maken: $HTML_BACKUP"
        cp -a "$AMP_HTML" "$HTML_BACKUP"

        if grep -q '</body>' "$AMP_HTML"; then
            sed -i "s#</body>#$SCRIPT_TAG\n</body>#" "$AMP_HTML"
        else
            printf '\n%s\n' "$SCRIPT_TAG" >> "$AMP_HTML"
        fi
    fi

    chown amp:amp "$AMP_HTML"
    chmod 644 "$AMP_HTML"
fi

echo "MemoNetwork Edition geïnstalleerd voor $INSTANCE_NAME."
echo "MemoNetwork JavaScript cacheversie: $SCRIPT_VERSION"
echo "Vernieuw AMP met Ctrl+Shift+R."
