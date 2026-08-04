#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-ADS01}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/theme/MemoNetwork"
WEBROOT="/home/amp/.ampdata/instances/$INSTANCE_NAME/WebRoot"
TARGET="$WEBROOT/Themes/AMPThemes/MemoNetwork"
AMP_HTML="$WEBROOT/AMP.html"
SCRIPT_VERSION="600"

THEME_VERSION="$(sed -n 's/.*"Version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SOURCE/info.json" | head -n1)"
THEME_VERSION="${THEME_VERSION:-6.0.0}"
GIT_COMMIT="$(git -C "$REPO_ROOT" rev-parse --short=7 HEAD 2>/dev/null || printf 'unknown')"
BUILD_DATE="$(date '+%d-%m-%Y')"

BUILD_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/BuildInfo.js?v=${SCRIPT_VERSION}\"></script>"
SCRIPT_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/MemoNetwork.js?v=${SCRIPT_VERSION}\"></script>"
POLISH_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/SystemPolish.js?v=${SCRIPT_VERSION}\"></script>"
COLLAPSE_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/ControlCenterCollapse.js?v=${SCRIPT_VERSION}\"></script>"
NAMES_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/ControlCenterNames.js?v=${SCRIPT_VERSION}\"></script>"
SUITE_TAG="    <script src=\"/Themes/AMPThemes/MemoNetwork/ControlSuite.js?v=${SCRIPT_VERSION}\"></script>"

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

cat > "$TARGET/BuildInfo.js" <<EOF
window.MemoNetworkBuild = Object.freeze({
  version: "$THEME_VERSION",
  commit: "$GIT_COMMIT",
  date: "$BUILD_DATE"
});
EOF

chown -R amp:amp "$TARGET"
find "$TARGET" -type d -exec chmod 755 {} \;
find "$TARGET" -type f -exec chmod 644 {} \;
chmod 755 "$TARGET/build-theme.sh" 2>/dev/null || true

if [[ -f "$AMP_HTML" ]]; then
    sed -Ei '\#<script src="/Themes/AMPThemes/MemoNetwork/(DashboardPro|BuildInfo|MemoNetwork|SystemPolish|ControlCenterCollapse|ControlCenterStates|ControlCenterMemory|ControlCenterNames|ControlSuite)\.js[^\"]*"></script>#d' "$AMP_HTML"

    if grep -q '</body>' "$AMP_HTML"; then
        sed -i "s#</body>#$BUILD_TAG\n$SCRIPT_TAG\n$POLISH_TAG\n$COLLAPSE_TAG\n$NAMES_TAG\n$SUITE_TAG\n</body>#" "$AMP_HTML"
    else
        printf '\n%s\n%s\n%s\n%s\n%s\n%s\n' "$BUILD_TAG" "$SCRIPT_TAG" "$POLISH_TAG" "$COLLAPSE_TAG" "$NAMES_TAG" "$SUITE_TAG" >> "$AMP_HTML"
    fi

    chown amp:amp "$AMP_HTML"
    chmod 644 "$AMP_HTML"
fi

echo "MemoNetwork Edition geïnstalleerd voor $INSTANCE_NAME."
echo "MemoNetwork JavaScript cacheversie: $SCRIPT_VERSION"
echo "Control Suite v${THEME_VERSION} geïnstalleerd."
echo "Serverzoekfunctie, favorieten en statusmeldingen zijn ingeschakeld."
echo "Footer build: v${THEME_VERSION} • ${GIT_COMMIT} | Built ${BUILD_DATE}"
echo "Vernieuw AMP met Ctrl+Shift+R."
