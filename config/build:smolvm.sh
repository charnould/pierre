#!/usr/bin/env bash
# Builds a portable .smolmachine image with Debian, python3, and GitHub Copilot CLI.
# The resulting artifact lets you boot a ready-to-use VM in <1s with no downloads.
#
# Output : config/smolvm/pierre + config/smolvm/pierre.smolmachine
#
# Usage  : bun run vm:build
# Requirements: smolvm installed (curl -sSL https://smolmachines.com/install.sh | bash)

set -euo pipefail

BUILD_VM="pierre-build"
SMOLVM_DIR="./config/smolvm"

cleanup() { smolvm machine delete "$BUILD_VM" -f 2>/dev/null || true; }
trap cleanup EXIT

rm -rf "$SMOLVM_DIR"
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
smolvm pack create --from-vm "$BUILD_VM" -o "$SMOLVM_DIR/pierre"