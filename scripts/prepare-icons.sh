#!/bin/bash

echo "Preparing desktop build resources..."
mkdir -p build/icons

# Copy master files for AppImage, Windows, and Mac
cp public/icon.png build/icon.png
cp public/icon.ico build/icon.ico

# Check if ImageMagick is installed (Available in CI and Docker container)
if command -v convert &> /dev/null; then
    echo "ImageMagick found. Generating Flatpak icon matrix..."
    convert public/icon.png -resize 512x512 build/icons/512x512.png
    convert public/icon.png -resize 256x256 build/icons/256x256.png
    convert public/icon.png -resize 128x128 build/icons/128x128.png
    convert public/icon.png -resize 64x64 build/icons/64x64.png
    echo "Icon matrix generated successfully."
else
    echo "ImageMagick not found. Skipping Flatpak matrix generation."
    echo "(This is perfectly fine if you are building for Windows/Mac)."
fi
