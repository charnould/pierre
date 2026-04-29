#!/usr/bin/env bash
# Builds a portable .smolmachine image with Debian, python3, and GitHub Copilot CLI.
# The resulting artifact lets you boot a ready-to-use VM in <1s with no downloads.
#
# Output : config/smolvm/pierre-<arch> + config/smolvm/pierre-<arch>.smolmachine
#          where <arch> is amd64 (x86_64) or arm64 (aarch64)
#
# Usage  : bun run vm:build
# Requirements: smolvm installed (curl -sSL https://smolmachines.com/install.sh | bash)

set -euo pipefail

BUILD_VM="pierre-build"
SMOLVM_DIR="./config/smolvm"

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

cleanup() { smolvm machine delete "$BUILD_VM" -f 2>/dev/null || true; }
trap cleanup EXIT

mkdir -p "$SMOLVM_DIR"

echo "Création de la VM de build..."
smolvm machine create --net "$BUILD_VM" --image ubuntu:resolute-20260413
smolvm machine start --name "$BUILD_VM"

echo "Installation de python3, curl et de l'agent IA..."
smolvm machine exec --name "$BUILD_VM" -- bash -c "
set -e
export DEBIAN_FRONTEND=noninteractive


apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends \
         python3 \
         python3-pip \
         python3-venv \
         python-is-python3 \
         coreutils \
         findutils \
         fd-find \
         tree \
         file \
         ripgrep \
         grep \
         diffutils \
         sed \
         mawk \
         jq \
         procps \
         ca-certificates \
         curl \
    && ln -sf \$(command -v fdfind) /usr/local/bin/fd \
    && curl -fsSL https://gh.io/copilot-install | bash \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* /root/.cache \
    && echo 'export TERM=xterm-256color' >> /root/.bashrc
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