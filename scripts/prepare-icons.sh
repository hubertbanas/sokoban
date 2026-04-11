#!/usr/bin/env bash

set -euo pipefail

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

# Copy canonical desktop icon files used by electron-builder.
cp "$ICON_PNG" build/icon.png
cp "$ICON_ICO" build/icon.ico

image_magick_cmd=""

# Prefer `magick` because Windows can expose a non-ImageMagick `convert` command.
if command -v magick >/dev/null 2>&1; then
    image_magick_cmd="magick"
elif command -v convert >/dev/null 2>&1 && convert -version 2>/dev/null | grep -qi "ImageMagick"; then
    image_magick_cmd="convert"
fi

if [ -n "$image_magick_cmd" ]; then
    echo "ImageMagick found ($image_magick_cmd). Generating Flatpak icon matrix..."
    for size in 16 24 32 48 64 96 128 256 512; do
        "$image_magick_cmd" "$ICON_PNG" -resize "${size}x${size}" "build/icons/${size}x${size}.png"
    done
    echo "Icon matrix generated successfully."
else
    echo "ImageMagick not found. Skipping Flatpak icon matrix generation."
    echo "Install ImageMagick if you need Flatpak icon matrix generation in this environment."
fi
