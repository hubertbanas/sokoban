#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# ==========================================
# Help Menu & Input Validation
# ==========================================
if [[ "$#" -eq 0 || "$1" == "--help" || "$1" == "-h" ]]; then
    echo "========================================================"
    echo " Sokoban Release Validator"
    echo "========================================================"
    echo "Downloads all artifacts for a specific release, validates"
    echo "their SHA-256 checksums, and verifies GPG signatures."
    echo ""
    echo "Usage:"
    echo "  $0 <version>"
    echo ""
    echo "Example:"
    echo "  $0 1.15.0-rc.14"
    echo "========================================================"
    exit 0
fi

VERSION="$1"
REPO="hubertbanas/sokoban"
WORK_DIR="/tmp/sokoban-release-$VERSION"
API_URL="https://api.github.com/repos/$REPO/releases/tags/v$VERSION"
KEY_URL="https://raw.githubusercontent.com/$REPO/main/.github/keys/sokoban-release-key.asc"

# ==========================================
# Setup Environment
# ==========================================
echo "=> Creating workspace at $WORK_DIR..."
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# ==========================================
# Import Public Key
# ==========================================
echo "=> Fetching and importing public GPG key from main branch..."
curl -sL "$KEY_URL" | gpg --import 2>/dev/null || echo "Key already imported or up to date."

# ==========================================
# Fetch Release Assets
# ==========================================
echo "=> Fetching release metadata for v$VERSION..."
DOWNLOAD_URLS=$(curl -s "$API_URL" | grep "browser_download_url" | cut -d '"' -f 4)

if [[ -z "$DOWNLOAD_URLS" ]]; then
    echo "❌ Error: Could not find release v$VERSION or no assets found."
    echo "Make sure the version exists and does not include the 'v' prefix."
    exit 1
fi

echo "=> Downloading artifacts..."
for url in $DOWNLOAD_URLS; do
    echo "   Downloading $(basename "$url")..."
    curl -sL -O "$url"
done

# ==========================================
# Phase 1: SHA-256 Verification
# ==========================================
echo ""
echo "========================================================"
echo " PHASE 1: SHA-256 Checksum Verification"
echo "========================================================"
FAILURES=0

for sha_file in *.sha256; do
    # Verify the checksum, suppress standard output, only show errors if they happen
    if sha256sum -c "$sha_file" > /dev/null 2>&1; then
        echo "✅ [OK] ${sha_file%.sha256}"
    else
        echo "❌ [FAILED] ${sha_file%.sha256}"
        FAILURES=$((FAILURES + 1))
    fi
done

if [[ "$FAILURES" -gt 0 ]]; then
    echo "❌ $FAILURES SHA-256 checksum(s) failed validation. Aborting GPG checks."
    exit 1
fi

# ==========================================
# Phase 2: GPG Signature Verification
# ==========================================
echo ""
echo "========================================================"
echo " PHASE 2: GPG Signature Verification"
echo "========================================================"

for asc_file in *.asc; do
    # The base file is the asc_file without the .asc extension
    base_file="${asc_file%.asc}"
    
    if [[ -f "$base_file" ]]; then
        # Run gpg verify and capture output. We grep for "Good signature" to determine success.
        if gpg --verify "$asc_file" "$base_file" 2>&1 | grep -q "Good signature"; then
            echo "✅ [SECURE] $base_file"
        else
            echo "❌ [INVALID] $base_file"
            FAILURES=$((FAILURES + 1))
        fi
    else
        echo "⚠️  [MISSING] Target file $base_file not found for $asc_file"
    fi
done

# ==========================================
# Final Report
# ==========================================
echo ""
echo "========================================================"
if [[ "$FAILURES" -eq 0 ]]; then
    echo "🎉 SUCCESS: All $VERSION artifacts passed SHA-256 and GPG verification!"
    echo "📂 Files are located in: $WORK_DIR"
else
    echo "❌ FAILURE: $FAILURES GPG signature(s) failed validation."
    exit 1
fi
echo "========================================================"