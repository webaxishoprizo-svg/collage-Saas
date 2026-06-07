#!/usr/bin/env bash
# Copies pre-generated mipmap PNGs, adaptive-icon XMLs, splash drawable,
# and color resources from android-resources/ into the Android project
# after `npx cap add android`.
set -euo pipefail

SRC="android-resources"
DST="android/app/src/main/res"

if [ ! -d "android" ]; then
  echo "❌  android/ folder not found. Run: npm run cap:add:android"
  exit 1
fi

echo "→ Copying launcher icons & adaptive icons..."
for d in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi mipmap-anydpi-v26; do
  mkdir -p "$DST/$d"
  cp -f "$SRC/$d/"* "$DST/$d/"
done

echo "→ Copying splash drawable..."
mkdir -p "$DST/drawable"
cp -f "$SRC/drawable/splash.png" "$DST/drawable/splash.png"

echo "→ Merging color values..."
mkdir -p "$DST/values"
cp -f "$SRC/values/colors.xml" "$DST/values/colors.xml"

echo "✅ Android icons + splash applied. Run: npm run cap:sync"
