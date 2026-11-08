#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "${1:-$(dirname "$0")/../..}" && pwd)
SERVER="$ROOT/server"
OUT="$ROOT/release-assets"

rm -rf "$OUT"
mkdir -p "$OUT"

# jsdom reads its default stylesheet through __dirname. A compiled binary keeps
# the build machine path, so the file is inlined before bundling.
cd "$ROOT"
bun -e '
const files = [...new Bun.Glob("node_modules/.bun/jsdom@*/node_modules/jsdom/lib/jsdom/living/css/helpers/computed-style.js").scanSync(".")]
if (files.length !== 1) throw new Error("jsdom computed-style.js introuvable")
const file = files[0]
const cssFile = file.replace("living/css/helpers/computed-style.js", "browser/default-stylesheet.css")
const source = await Bun.file(file).text()
const css = JSON.stringify(await Bun.file(cssFile).text())
const next = source.replace(
  /fs\.readFileSync\(\s*path\.resolve\(__dirname, "\.\.\/\.\.\/\.\.\/browser\/default-stylesheet\.css"\),\s*\{\s*encoding:\s*"utf-8"\s*\}\s*\)/,
  css
)
if (next === source) throw new Error("lecture de la feuille jsdom non remplacée")
await Bun.write(file, next)
'

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
