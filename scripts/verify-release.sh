#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_REPO="hubertbanas/sokoban"
readonly DEFAULT_KEY_URL="https://raw.githubusercontent.com/hubertbanas/sokoban/main/.github/keys/sokoban-release-key.asc"
readonly EXPECTED_FPR="50AF06A3276DD98E51BA50DFEB5EEC17123943ED"

usage() {
    cat <<'EOF'
Sokoban Release Validator

Downloads release assets, verifies SHA-256 checksums, and validates GPG signatures.

Usage:
    ./scripts/verify-release.sh <version> [options]

Options:
    --repo <owner/repo>     GitHub repository (default: hubertbanas/sokoban)
    --key-url <url>         Public key URL (default: official Sokoban key URL)
    --work-dir <path>       Use a specific workspace directory
    --keep-dir              Keep downloaded files after completion
    -h, --help              Show this help

Example:
    ./scripts/verify-release.sh 1.15.0-rc.14
EOF
}

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: required command not found: $1" >&2
        exit 1
    fi
}

normalize_fpr() {
    tr -d '[:space:]' | tr '[:lower:]' '[:upper:]'
}

REPO="$DEFAULT_REPO"
KEY_URL="$DEFAULT_KEY_URL"
WORK_DIR=""
KEEP_DIR=0
VERSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        --repo)
            REPO="$2"
            shift 2
            ;;
        --key-url)
            KEY_URL="$2"
            shift 2
            ;;
        --work-dir)
            WORK_DIR="$2"
            shift 2
            ;;
        --keep-dir)
            KEEP_DIR=1
            shift
            ;;
        -* )
            echo "Error: unknown option: $1" >&2
            usage
            exit 1
            ;;
        *)
            if [[ -z "$VERSION" ]]; then
                VERSION="$1"
                shift
            else
                echo "Error: unexpected positional argument: $1" >&2
                usage
                exit 1
            fi
            ;;
    esac
done

if [[ -z "$VERSION" ]]; then
    usage
    exit 1
fi

require_cmd curl
require_cmd gpg
require_cmd sha256sum

API_URL="https://api.github.com/repos/$REPO/releases/tags/v$VERSION"
# Track if we generated a temporary directory
IS_TEMP_DIR=0
if [[ -z "$WORK_DIR" ]]; then
    WORK_DIR="$(mktemp -d "/tmp/sokoban-release-${VERSION}-XXXXXX")"
    IS_TEMP_DIR=1
else
    mkdir -p "$WORK_DIR"
fi
# Only auto-delete if it's a temp directory AND the user didn't request to keep it
if [[ "$IS_TEMP_DIR" -eq 1 && "$KEEP_DIR" -eq 0 ]]; then
    trap 'rm -rf "$WORK_DIR"' EXIT
fi

echo "=> Using workspace: $WORK_DIR"
cd "$WORK_DIR" || { echo "Error: Failed to change to workspace directory." >&2; exit 1; }

echo "=> Fetching release public key..."
curl -fsSL "$KEY_URL" -o release-key.asc

ACTUAL_FPR="$(gpg --show-keys --with-colons release-key.asc | awk -F: '/^fpr:/ {print $10; exit}' | normalize_fpr)"
if [[ "$ACTUAL_FPR" != "$EXPECTED_FPR" ]]; then
    echo "Error: release key fingerprint mismatch." >&2
    echo "Expected: $EXPECTED_FPR" >&2
    echo "Actual:   ${ACTUAL_FPR:-<none>}" >&2
    exit 1
fi

echo "=> Importing release key (fingerprint verified)."
gpg --import release-key.asc >/dev/null 2>&1 || true

echo "=> Fetching release metadata for v$VERSION..."
if ! RELEASE_JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API_URL")"; then
    echo "Error: Could not fetch release metadata for v$VERSION (does the tag exist?)." >&2
    exit 1
fi

DOWNLOAD_URLS=()
if command -v jq >/dev/null 2>&1; then
    while IFS= read -r url; do
        [[ -n "$url" ]] && DOWNLOAD_URLS+=("$url")
    done < <(printf '%s' "$RELEASE_JSON" | jq -r '.assets[].browser_download_url // empty')
else
    while IFS= read -r url; do
        [[ -n "$url" ]] && DOWNLOAD_URLS+=("$url")
    done < <(printf '%s\n' "$RELEASE_JSON" | grep '"browser_download_url"' | sed -E 's/.*"browser_download_url": "([^"]+)".*/\1/')
fi

if [[ ${#DOWNLOAD_URLS[@]} -eq 0 ]]; then
    echo "Error: Could not find release v$VERSION or no assets found." >&2
    echo "Make sure the version exists and does not include the 'v' prefix." >&2
    exit 1
fi

echo "=> Downloading ${#DOWNLOAD_URLS[@]} artifacts..."
for url in "${DOWNLOAD_URLS[@]}"; do
    echo "   Downloading $(basename "$url")..."
    curl -fL --retry 3 --retry-delay 2 -O "$url"
done

FAILURES=0
shopt -s nullglob

echo
echo "========================================================"
echo " PHASE 1: SHA-256 Checksum Verification"
echo "========================================================"

sha_files=( *.sha256 )
if [[ ${#sha_files[@]} -eq 0 ]]; then
    echo "Error: no .sha256 files found in release assets." >&2
    exit 1
fi

for sha_file in "${sha_files[@]}"; do
    if sha256sum -c "$sha_file" >/dev/null 2>&1; then
        echo "[OK] ${sha_file%.sha256}"
    else
        echo "[FAILED] ${sha_file%.sha256}"
        FAILURES=$((FAILURES + 1))
    fi
done

if [[ "$FAILURES" -gt 0 ]]; then
    echo "Verification failed: $FAILURES checksum file(s) failed. Skipping signature phase." >&2
    exit 1
fi

echo
echo "========================================================"
echo " PHASE 2: GPG Signature Verification"
echo "========================================================"

asc_files=( *.asc )
if [[ ${#asc_files[@]} -eq 0 ]]; then
    echo "Error: no .asc signature files found in release assets." >&2
    exit 1
fi

for asc_file in "${asc_files[@]}"; do
    # Skip signature check for the imported key file itself
    if [[ "$asc_file" == "release-key.asc" ]]; then
        continue
    fi
    base_file="${asc_file%.asc}"

    if [[ ! -f "$base_file" ]]; then
        echo "[MISSING] $base_file (required by $asc_file)"
        FAILURES=$((FAILURES + 1))
        continue
    fi

    if gpg --verify "$asc_file" "$base_file" >/dev/null 2>&1; then
        echo "[SECURE] $base_file"
    else
        echo "[INVALID] $base_file"
        FAILURES=$((FAILURES + 1))
    fi
done

echo
echo "========================================================"
if [[ "$FAILURES" -eq 0 ]]; then
    echo "SUCCESS: All v$VERSION artifacts passed checksum and signature verification."
    echo "Workspace: $WORK_DIR"
else
    echo "FAILURE: $FAILURES verification check(s) failed." >&2
    exit 1
fi
echo "========================================================"