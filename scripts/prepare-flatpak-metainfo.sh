#!/usr/bin/env sh

set -eu

# Enable pipefail when supported by the active shell.
(set -o pipefail >/dev/null 2>&1) && set -o pipefail || true

APP_ID="com.hubertbanas.sokoban"
TEMPLATE_FILE="packaging/flatpak/${APP_ID}.metainfo.xml.in"
OUTPUT_DIR="build/flatpak"
OUTPUT_FILE="${OUTPUT_DIR}/${APP_ID}.metainfo.xml"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
RELEASE_DATE="$(date -u +%F)"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Missing Flatpak metainfo template: $TEMPLATE_FILE"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

sed \
    -e "s|@VERSION@|${PACKAGE_VERSION}|g" \
    -e "s|@DATE@|${RELEASE_DATE}|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Generated Flatpak metainfo at ${OUTPUT_FILE} (version ${PACKAGE_VERSION})."

if command -v appstreamcli >/dev/null 2>&1; then
    appstreamcli validate --no-net --pedantic "$OUTPUT_FILE"
    echo "Validated Flatpak metainfo with appstreamcli."
else
    echo "appstreamcli not found, skipping AppStream validation."
fi
