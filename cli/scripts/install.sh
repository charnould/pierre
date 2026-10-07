#!/bin/sh
# Télécharge le cli, vérifie son empreinte, puis lance pierre install.
# curl -fsSL https://github.com/charnould/pierre/releases/download/__CLI_TAG__/install.sh | sh
set -eu

TAG=__CLI_TAG__
REPO=https://github.com/charnould/pierre/releases/download/${TAG}
ASSET=pierre-cli-linux-x64

if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
  echo "Il faut une machine Linux x86_64." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Il faut être root." >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
dest=${PIERRE_CLI_DEST:-/usr/local/bin/pierre}

if [ -n "${PIERRE_CLI_ASSET_DIR:-}" ]; then
  cp "${PIERRE_CLI_ASSET_DIR}/${ASSET}" "$work/$ASSET"
  cp "${PIERRE_CLI_ASSET_DIR}/checksums.txt" "$work/checksums.txt"
else
  curl -fsSL --retry 3 --retry-delay 1 -o "$work/$ASSET" "$REPO/$ASSET"
  curl -fsSL --retry 3 --retry-delay 1 -o "$work/checksums.txt" "$REPO/checksums.txt"
fi

expected=$(awk -v name="$ASSET" '$2 == name || $2 == "*" name { print $1; exit }' "$work/checksums.txt")
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$work/$ASSET" | awk '{ print $1 }')
else
  actual=$(shasum -a 256 "$work/$ASSET" | awk '{ print $1 }')
fi

if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
  echo "L'empreinte du cli est invalide." >&2
  exit 1
fi

install=$(mktemp)
cp "$work/$ASSET" "$install"
chmod 755 "$install"
mv "$install" "$dest"
trap - EXIT
rm -rf "$work"

if [ "${PIERRE_BOOTSTRAP_ONLY:-0}" = "1" ]; then
  "$dest" --version
  exit 0
fi

if [ -p /dev/stdin ] && [ -r /dev/tty ]; then
  exec "$dest" install </dev/tty
fi
exec "$dest" install
