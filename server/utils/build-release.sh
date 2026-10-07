#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "${1:-$(dirname "$0")/../..}" && pwd)
SERVER="$ROOT/server"
OUT="$ROOT/release-assets"

rm -rf "$OUT"
mkdir -p "$OUT"

cd "$SERVER"
bun build --compile --target=bun \
  --no-compile-autoload-dotenv \
  --external @prettier/plugin-oxc \
  --external @prettier/plugin-hermes \
  --external prettier-plugin-astro \
  --external prettier-plugin-marko \
  --external @zackad/prettier-plugin-twig \
  --external @prettier/plugin-pug \
  --external @shopify/prettier-plugin-liquid \
  --asset ./assets \
  --asset ./knowledge \
  --asset ./utils/automations \
  ./serve.ts --outfile "$OUT/pierre"

ONNX=$(dirname "$(node -p "require.resolve('onnxruntime-node/package.json')")")
cp "$ONNX/bin/napi-v6/linux/x64/libonnxruntime.so.1" "$OUT/libonnxruntime.so.1"
chmod 755 "$OUT/pierre"
chmod 644 "$OUT/libonnxruntime.so.1"

VERSION=$(node -p "require('./package.json').version")
test "$("$OUT/pierre" --version)" = "server-$VERSION"
