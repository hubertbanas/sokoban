#!/usr/bin/env sh

# ==============================================================================
# Desktop Icon Preparation Script (Just-In-Time Asset Generation)
# ==============================================================================
# 
# This script prepares the necessary icon assets for `electron-builder` before 
# packaging the cross-platform desktop application. By running this script via 
# a `prebuild` hook, we keep the git repository clean of duplicate binary files 
# while satisfying the strict packaging requirements of various operating systems.
#
# How electron-builder uses these generated assets (via auto-discovery in `build/`):
#
# Windows (.exe, nsis):
#    Automatically consumes `build/icon.ico` for the executable and installer.
#
# macOS (.dmg):
#    This script pre-generates `build/icon.icns` using Apple's native `sips` 
#    and `iconutil` tools. This explicitly bypasses electron-builder's internal 
#    conversion process to prevent known fatal panics on ARM64 (Apple Silicon) runners.
#
# Linux (AppImage, Deb, RPM, Pacman):
#    Automatically consumes the master `build/icon.png` as a fallback `.DirIcon`.
#
# Linux (Flatpak, Snap):
#    These heavily sandboxed formats require strict AppStream validation. They 
#    will fall back to the default Electron atom icon (or crash the build) if a 
#    specific matrix of physically resized icons does not exist. This script 
#    generates that required matrix in `build/icons/` using ImageMagick (or `sips`).
# ==============================================================================

set -eu

# Enable pipefail when supported by the active shell.
(set -o pipefail >/dev/null 2>&1) && set -o pipefail || true

echo "Preparing desktop build resources..."

ICON_PNG="public/icon.png"
ICON_ICO="public/icon.ico"

if [ ! -f "$ICON_PNG" ]; then
    echo "Missing required icon file: $ICON_PNG"
    exit 1
fi

if [ ! -f "$ICON_ICO" ]; then
    echo "Missing required icon file: $ICON_ICO"
    exit 1
fi

mkdir -p build/icons
rm -f build/icons/*.png

# Copy canonical desktop icon files used by electron-builder.
cp "$ICON_PNG" build/icon.png
cp "$ICON_ICO" build/icon.ico

image_resizer_cmd=""
platform="$(uname -s)"

# Generate a native macOS .icns up front to avoid electron-builder icon conversion edge cases.
if [ "$platform" = "Darwin" ]; then
    if ! command -v sips >/dev/null 2>&1 || ! command -v iconutil >/dev/null 2>&1; then
        echo "macOS build requires both 'sips' and 'iconutil' to generate build/icon.icns"
        exit 1
    fi

    iconset_dir="build/icon.iconset"
    rm -rf "$iconset_dir"
    mkdir -p "$iconset_dir"

    echo "macOS detected. Generating build/icon.icns with native tools..."
    sips -z 16 16 "$ICON_PNG" --out "$iconset_dir/icon_16x16.png" >/dev/null
    sips -z 32 32 "$ICON_PNG" --out "$iconset_dir/icon_16x16@2x.png" >/dev/null
    sips -z 32 32 "$ICON_PNG" --out "$iconset_dir/icon_32x32.png" >/dev/null
    sips -z 64 64 "$ICON_PNG" --out "$iconset_dir/icon_32x32@2x.png" >/dev/null
    sips -z 128 128 "$ICON_PNG" --out "$iconset_dir/icon_128x128.png" >/dev/null
    sips -z 256 256 "$ICON_PNG" --out "$iconset_dir/icon_128x128@2x.png" >/dev/null
    sips -z 256 256 "$ICON_PNG" --out "$iconset_dir/icon_256x256.png" >/dev/null
    sips -z 512 512 "$ICON_PNG" --out "$iconset_dir/icon_256x256@2x.png" >/dev/null
    sips -z 512 512 "$ICON_PNG" --out "$iconset_dir/icon_512x512.png" >/dev/null
    sips -z 1024 1024 "$ICON_PNG" --out "$iconset_dir/icon_512x512@2x.png" >/dev/null

    iconutil -c icns "$iconset_dir" -o build/icon.icns
    rm -rf "$iconset_dir"
    echo "build/icon.icns generated successfully."
fi

# Prefer `magick` because Windows can expose a non-ImageMagick `convert` command.
if command -v magick >/dev/null 2>&1; then
    image_resizer_cmd="magick"
elif command -v convert >/dev/null 2>&1 && convert -version 2>/dev/null | grep -qi "ImageMagick"; then
    image_resizer_cmd="convert"
elif command -v sips >/dev/null 2>&1; then
    image_resizer_cmd="sips"
fi

if [ -n "$image_resizer_cmd" ]; then
    if [ "$image_resizer_cmd" = "sips" ]; then
        echo "Using macOS sips to generate desktop icon matrix..."
        for size in 16 24 32 48 64 96 128 256 512; do
            sips -z "$size" "$size" "$ICON_PNG" --out "build/icons/${size}x${size}.png" >/dev/null
        done
    else
        echo "ImageMagick found ($image_resizer_cmd). Generating desktop icon matrix..."
        for size in 16 24 32 48 64 96 128 256 512; do
            "$image_resizer_cmd" "$ICON_PNG" -resize "${size}x${size}" "build/icons/${size}x${size}.png"
        done
    fi
    echo "Icon matrix generated successfully."
else
    if [ "$platform" = "Linux" ] || [ "$platform" = "Darwin" ]; then
        echo "No supported image resize tool found."
        echo "Install ImageMagick (Linux/macOS) or ensure macOS 'sips' is available."
        exit 1
    fi

    echo "No supported image resize tool found. Skipping icon matrix generation on this platform."
fi
