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
  --no-compile-autoload-bunfig \
  --asset ./assets \
  --asset ./knowledge \
  --asset ./utils/automations \
  ./serve.ts --outfile "$OUT/pierre"

ONNX=$(dirname "$(node -p "require.resolve('onnxruntime-node/package.json')")")
cp "$ONNX/bin/napi-v6/linux/x64/libonnxruntime.so.1" "$OUT/libonnxruntime.so.1"

TRANSCRIBE=$(dirname "$(node -p "require.resolve('@transcribe-cpp/linux-x64-cpu-vulkan/package.json')")")
STAGE=$(mktemp -d)
mkdir -p "$STAGE/transcribe"
cp "$TRANSCRIBE"/*.so "$STAGE/transcribe/"
rm -f "$STAGE/transcribe/libggml-vulkan.so"
if [ -d "$TRANSCRIBE/licenses" ]; then
  cp -R "$TRANSCRIBE/licenses" "$STAGE/transcribe/licenses"
fi
tar -C "$STAGE" -czf "$OUT/libtranscribe.tar.gz" transcribe
rm -rf "$STAGE"

chmod 755 "$OUT/pierre"
chmod 644 "$OUT/libonnxruntime.so.1" "$OUT/libtranscribe.tar.gz"

VERSION=$(node -p "require('./package.json').version")
test "$("$OUT/pierre" --version)" = "server-$VERSION"
test "$(printf -- '-  a\n' | env -i BUN_BE_BUN=1 "$OUT/pierre" fmt --no-config --no-editorconfig --no-script --embedded-language-formatting=off --parser markdown)" = "- a"
