#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-ADS01}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/theme/MemoNetwork"
WEBROOT="/home/amp/.ampdata/instances/$INSTANCE_NAME/WebRoot"
TARGET="$WEBROOT/Themes/AMPThemes/MemoNetwork"
AMP_HTML="$WEBROOT/AMP.html"
SCRIPT_VERSION="615"
RUNTIME_REAPPLY="${MN_RUNTIME_REAPPLY:-0}"
DROPIN_DIR="/etc/systemd/system/ampinstmgr.service.d"
DROPIN_FILE="$DROPIN_DIR/90-memonetwork.conf"
REAPPLY_LOG="/var/log/memonetwork-amp-reapply.log"

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
    echo "Usage: sudo ./scripts/install.sh [INSTANCE_NAME]"
    exit 1
fi

if [[ ! -d "$SOURCE" ]]; then
    echo "Theme directory not found: $SOURCE"
    exit 1
fi

if [[ ! -d "$(dirname "$TARGET")" ]]; then
    echo "AMP theme directory not found for instance: $INSTANCE_NAME"
    exit 1
fi

# Only make a backup during a manual install/update. Automatic restart repairs
# are deliberately backup-free so a server restart cannot create endless copies.
if [[ "$RUNTIME_REAPPLY" != "1" && -d "$TARGET" ]]; then
    BACKUP="${TARGET}.backup-$(date +%Y%m%d-%H%M%S)"
    echo "Creating backup: $BACKUP"
    cp -a "$TARGET" "$BACKUP"
fi

# The compiled stylesheet only needs rebuilding during a normal install.
if [[ "$RUNTIME_REAPPLY" != "1" && -f "$SOURCE/build-theme.sh" ]]; then
    echo "Building MemoNetwork.css..."
    bash "$SOURCE/build-theme.sh"
fi

mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"
rm -f "$TARGET/ControlCenterStatusFix.js"

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
    sed -Ei '\#<script src="/Themes/AMPThemes/MemoNetwork/(DashboardPro|BuildInfo|MemoNetwork|SystemPolish|ControlCenterCollapse|ControlCenterStates|ControlCenterMemory|ControlCenterNames|ControlSuite|ControlCenterStatusFix)\.js[^\"]*"></script>#d' "$AMP_HTML"

    if grep -q '</body>' "$AMP_HTML"; then
        sed -i "s#</body>#$BUILD_TAG\n$SCRIPT_TAG\n$POLISH_TAG\n$COLLAPSE_TAG\n$NAMES_TAG\n$SUITE_TAG\n</body>#" "$AMP_HTML"
    else
        printf '\n%s\n%s\n%s\n%s\n%s\n%s\n' "$BUILD_TAG" "$SCRIPT_TAG" "$POLISH_TAG" "$COLLAPSE_TAG" "$NAMES_TAG" "$SUITE_TAG" >> "$AMP_HTML"
    fi

    chown amp:amp "$AMP_HTML"
    chmod 644 "$AMP_HTML"
fi

# Install a persistent systemd hook once. AMP can regenerate AMP.html and its
# theme directory when ampinstmgr starts, so re-apply MemoNetwork after AMP has
# had time to finish its own startup work.
if [[ "$RUNTIME_REAPPLY" != "1" ]]; then
    mkdir -p "$DROPIN_DIR"
    cat > "$DROPIN_FILE" <<EOF
[Service]
ExecStartPost=/bin/bash -c 'sleep 12; MN_RUNTIME_REAPPLY=1 "$REPO_ROOT/scripts/install.sh" "$INSTANCE_NAME" >> "$REAPPLY_LOG" 2>&1'
EOF
    chmod 644 "$DROPIN_FILE"
    systemctl daemon-reload
fi

if [[ "$RUNTIME_REAPPLY" == "1" ]]; then
    echo "MemoNetwork automatically re-applied after ampinstmgr restart."
else
    echo "MemoNetwork Edition installed for $INSTANCE_NAME."
    echo "MemoNetwork JavaScript cache version: $SCRIPT_VERSION"
    echo "Control Suite v${THEME_VERSION} installed."
    echo "Persistent ampinstmgr restart hook installed: $DROPIN_FILE"
    echo "MemoNetwork will automatically re-apply about 12 seconds after ampinstmgr restarts."
    echo "Sidebar logo now uses the real image source instead of CSS content replacement."
    echo "Footer build: v${THEME_VERSION} • ${GIT_COMMIT} | Built ${BUILD_DATE}"
    echo "Refresh AMP with Ctrl+Shift+R."
fi
