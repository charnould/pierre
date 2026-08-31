#!/usr/bin/env bash
# Builds a portable .smolmachine image with Ubuntu, python3, Node.js 24 LTS, Pi agent and document-extract.
# The resulting artifact lets you boot a ready-to-use VM in <1s with no downloads.
#
# Output : config/smolvm/pierre-<arch> + config/smolvm/pierre-<arch>.smolmachine
#          where <arch> is amd64 (x86_64) or arm64 (aarch64)
#
# Usage  : bun run vm:build:osx
# Requirements: smolvm installed (curl -sSL https://smolmachines.com/install.sh | bash)

set -euo pipefail

NODE_MAJOR=24
PI_VERSION="${PI_VERSION:-0.84.4}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_VM="pierre-build"
SMOLVM_DIR="$REPO_ROOT/config/smolvm"
DOC_EXTRACT_SRC="$SMOLVM_DIR/document-extract"
DOC_EXTRACT_VM=/opt/pierre/document-extract
EXTENSIONS_SRC="$SMOLVM_DIR/extensions"
EXTENSIONS_VM=/opt/pierre/extensions

# Map uname -m to a canonical arch name
RAW_ARCH=$(uname -m)
case "$RAW_ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *) echo "Unsupported architecture: $RAW_ARCH" >&2; exit 1 ;;
esac

OUTPUT_BASE="$SMOLVM_DIR/pierre-$ARCH"

echo "Architecture détectée : $RAW_ARCH → $ARCH"

cleanup() {
  smolvm machine stop --name "$BUILD_VM" 2>/dev/null || true
  smolvm machine delete "$BUILD_VM" -f 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$SMOLVM_DIR"

echo "Création de la VM de build..."
smolvm machine stop --name "$BUILD_VM" 2>/dev/null || true
smolvm machine delete --name "$BUILD_VM" -f 2>/dev/null || true
smolvm machine create --net --image ubuntu:resolute-20260413 --name "$BUILD_VM"
smolvm machine start --name "$BUILD_VM"

echo "Installation de python3, Node.js ${NODE_MAJOR}.x, Pi ${PI_VERSION}, outils documents..."
smolvm machine exec --name "$BUILD_VM" -- bash -c "
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends \
         python3 \
         python-is-python3 \
         coreutils \
         findutils \
         fd-find \
         file \
         ripgrep \
         grep \
         sed \
         jq \
         sqlite3 \
         procps \
         ca-certificates \
         curl \
         poppler-utils \
         pandoc \
    && ln -sf \$(command -v fdfind) /usr/local/bin/fd \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y -qq nodejs \
    && node --version | grep -Eq '^v${NODE_MAJOR}\\.' \
    && npm install -g --ignore-scripts @earendil-works/pi-coding-agent@${PI_VERSION} \
    && test \"\$(pi --version)\" = '${PI_VERSION}' \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* /root/.cache \
    && echo 'export TERM=xterm-256color' >> /root/.bashrc
"

echo "Installation de document-extract dans ${DOC_EXTRACT_VM}..."
smolvm machine exec --name "$BUILD_VM" -- mkdir -p "$DOC_EXTRACT_VM"
for src in "$DOC_EXTRACT_SRC"/*; do
  smolvm machine cp "$src" "$BUILD_VM:$DOC_EXTRACT_VM/$(basename "$src")"
done
smolvm machine exec --name "$BUILD_VM" -- bash -c "
set -e
cd ${DOC_EXTRACT_VM}
npm ci --omit=dev
ln -sf ${DOC_EXTRACT_VM}/extract-document.sh /usr/local/bin/document-extract
chmod +x extract-document.sh extract-spreadsheet.mjs
"

echo "Installation de l'extension ask_user dans ${EXTENSIONS_VM}..."
smolvm machine exec --name "$BUILD_VM" -- mkdir -p "$EXTENSIONS_VM"
smolvm machine cp "$EXTENSIONS_SRC/ask-user.ts" "$BUILD_VM:$EXTENSIONS_VM/ask-user.ts"

echo "Validation du démarrage de Pi RPC avec l'extension ask_user..."
smolvm machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
printf '%s\n' '{\"type\":\"get_state\"}' \
  | timeout 15s pi \
      --mode rpc \
      --no-session \
      --provider anthropic \
      --model claude-sonnet-4-5 \
      --no-extensions \
      -ns \
      -np \
      --no-themes \
      --offline \
      -e ${EXTENSIONS_VM}/ask-user.ts \
  | jq -e 'select(.type == \"response\" and .command == \"get_state\" and .success == true)' \
  > /dev/null
"

echo "Nettoyage des character devices (évite l'erreur 'disallowed type Char' au packaging)..."
smolvm machine exec --name "$BUILD_VM" -- bash -c "
  find / -xdev -type c -delete 2>/dev/null || true
"

echo "Packaging..."
smolvm machine stop --name "$BUILD_VM"
smolvm pack create --from-vm "$BUILD_VM" -o "$OUTPUT_BASE"

echo "Fichiers créés :"
ls -lh "$SMOLVM_DIR/pierre-$ARCH"* 2>/dev/null || true
