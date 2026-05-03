#!/usr/bin/env bash
# Builds the macOS DMG locally and copies it to config/app/.
#
# Output : config/app/pierre-desktop-latest.dmg
#          desktop/package.json (version bumped)
#
# Usage  : bun run desktop:build:osx
# Requirements: Node.js, bun installed locally

set -euo pipefail

APP_DIR="./config/app"
DESKTOP_DIR="./desktop"

echo "Build du DMG macOS en local..."
cd "$DESKTOP_DIR"
bun install
bun run build
npx electron-forge make

cd - > /dev/null

echo "Copie du DMG dans $APP_DIR/..."
mkdir -p "$APP_DIR"
DMG=$(find "$DESKTOP_DIR/out/make" -maxdepth 1 -name "*.dmg" | head -1)
if [ -z "$DMG" ]; then
  echo "Erreur : aucun .dmg trouvé dans $DESKTOP_DIR/out/make/" >&2
  exit 1
fi
cp "$DMG" "$APP_DIR/pierre-desktop-latest.dmg"

echo "Bump de version dans $DESKTOP_DIR/package.json..."
cd "$DESKTOP_DIR"
bun pm version minor
cd - > /dev/null

echo ""
echo "✓ Build terminé :"
echo "  → $APP_DIR/pierre-desktop-latest.dmg"
echo ""
echo "Pour commiter :"
echo "  git add $APP_DIR/pierre-desktop-latest.dmg $DESKTOP_DIR/package.json"
echo "  git commit -m 'build: update desktop osx'"
