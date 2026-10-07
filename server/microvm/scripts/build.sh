#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
VERSIONS="$ROOT/versions.json"
GUEST="$ROOT/guest"
BUILD="$ROOT/build"

case "$TARGET" in
  darwin-arm64)
    HOST_ARCH=arm64
    NODE_TARGET=linux-arm64
    ;;
  linux-amd64)
    HOST_ARCH=x86_64
    NODE_TARGET=linux-amd64
    ;;
  *)
    echo "usage: build.sh <darwin-arm64|linux-amd64>" >&2
    exit 1
    ;;
esac

json() {
  node -e '
    const value = process.argv[2].split(".").reduce((current, key) => current[key], require(process.argv[1]))
    process.stdout.write(String(value))
  ' "$VERSIONS" "$1"
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

RAW_ARCH=$(uname -m)
if [ "$RAW_ARCH" != "$HOST_ARCH" ]; then
  echo "$TARGET requires host architecture $HOST_ARCH, got $RAW_ARCH" >&2
  exit 1
fi
if [ "$TARGET" = linux-amd64 ] && [ ! -r /dev/kvm -o ! -w /dev/kvm ]; then
  echo "linux-amd64 requires read/write access to /dev/kvm" >&2
  exit 1
fi

SMOLVM_VERSION=$(json smolvm.version)
SMOLVM_URL=$(json "smolvm.$TARGET.url")
SMOLVM_SHA=$(json "smolvm.$TARGET.sha256")
NODE_VERSION=$(json node.version)
NODE_URL=$(json "node.$NODE_TARGET.url")
NODE_SHA=$(json "node.$NODE_TARGET.sha256")
UBUNTU_IMAGE=$(json ubuntuImage)
UBUNTU_SNAPSHOT=$(json ubuntuSnapshot)
PI_VERSION=$(node -p "require('$GUEST/package.json').dependencies['@earendil-works/pi-coding-agent']")

TOOLS="$ROOT/.tools/$TARGET"
ARCHIVE="$TOOLS/smolvm.tar.gz"
SMOLVM_HOME="$TOOLS/smolvm-$SMOLVM_VERSION-$TARGET"
SMOLVM="$SMOLVM_HOME/smolvm"
mkdir -p "$TOOLS" "$BUILD"

if [ ! -x "$SMOLVM" ] || [ "$("$SMOLVM" --version)" != "smolvm $SMOLVM_VERSION" ]; then
  rm -rf "$SMOLVM_HOME" "$ARCHIVE"
  curl -fsSL --retry 3 -o "$ARCHIVE" "$SMOLVM_URL"
  test "$(sha256 "$ARCHIVE")" = "$SMOLVM_SHA"
  tar -xzf "$ARCHIVE" -C "$TOOLS"
fi
test "$("$SMOLVM" --version)" = "smolvm $SMOLVM_VERSION"

BUILD_VM="pierre-build-$TARGET"
SMOKE_VM="pierre-smoke-$TARGET"
OUTPUT="$BUILD/pierre-$TARGET"
CANDIDATE="$BUILD/.pierre-$TARGET-candidate"

cleanup() {
  for name in "$BUILD_VM" "$SMOKE_VM"; do
    "$SMOLVM" machine stop --name "$name" 2>/dev/null || true
    "$SMOLVM" machine delete --name "$name" -f 2>/dev/null || true
  done
  rm -f "$CANDIDATE" "$CANDIDATE.smolmachine"
}
trap cleanup EXIT
cleanup
rm -f "$CANDIDATE" "$CANDIDATE.smolmachine"

"$SMOLVM" machine create --net --image "$UBUNTU_IMAGE" --name "$BUILD_VM"
"$SMOLVM" machine start --name "$BUILD_VM"

"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
cat > /etc/apt/sources.list.d/ubuntu.sources <<'EOF'
Types: deb
URIs: $UBUNTU_SNAPSHOT
Suites: resolute resolute-updates resolute-security
Components: main universe
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
Check-Valid-Until: no
EOF
echo 'Acquire::https::Verify-Peer "false";' > /etc/apt/apt.conf.d/99snapshot-no-tls-verify
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  python3 python-is-python3 coreutils findutils fd-find file ripgrep grep sed jq sqlite3 \
  procps ca-certificates curl xz-utils poppler-utils pandoc
ln -sf \$(command -v fdfind) /usr/local/bin/fd
curl -fsSL --retry 3 -o /tmp/node.tar.xz '$NODE_URL'
echo '$NODE_SHA  /tmp/node.tar.xz' | sha256sum -c -
tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
rm /tmp/node.tar.xz
test \"\$(node --version)\" = 'v$NODE_VERSION'
"

"$SMOLVM" machine exec --name "$BUILD_VM" -- mkdir -p \
  /opt/pierre/agent \
  /opt/pierre/document-extract \
  /opt/pierre/extensions

for file in package.json package-lock.json; do
  "$SMOLVM" machine cp "$GUEST/$file" "$BUILD_VM:/opt/pierre/agent/$file"
done
"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
cd /opt/pierre/agent
npm ci --ignore-scripts --omit=dev
ln -s /opt/pierre/agent/node_modules/.bin/pi /usr/local/bin/pi
test \"\$(pi --version)\" = '$PI_VERSION'
"

for file in "$GUEST/document-extract"/*; do
  "$SMOLVM" machine cp \
    "$file" \
    "$BUILD_VM:/opt/pierre/document-extract/$(basename "$file")"
done
"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
cd /opt/pierre/document-extract
npm ci --omit=dev
ln -s /opt/pierre/document-extract/extract-document.sh /usr/local/bin/document-extract
chmod +x extract-document.sh extract-spreadsheet.mjs
"

"$SMOLVM" machine cp \
  "$GUEST/extensions/ask-user.ts" \
  "$BUILD_VM:/opt/pierre/extensions/ask-user.ts"

"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
printf '%s\n' \
  '{\"type\":\"get_state\"}' \
  '{\"type\":\"get_session_stats\"}' \
  | timeout 20s pi \
      --mode rpc \
      --no-session \
      --provider anthropic \
      --model claude-sonnet-4-5 \
      --no-extensions \
      -ns \
      -np \
      --no-themes \
      --offline \
      -e /opt/pierre/extensions/ask-user.ts \
  | jq -e 'select(.type == \"response\" and .success == true)' >/dev/null
test -x /usr/local/bin/document-extract
find / -xdev -type c -delete 2>/dev/null || true
rm -rf /var/lib/apt/lists/* /root/.cache
"

"$SMOLVM" machine stop --name "$BUILD_VM"
"$SMOLVM" pack create --from-vm "$BUILD_VM" -o "$CANDIDATE"
test -s "$CANDIDATE.smolmachine"

"$SMOLVM" machine create --from "$CANDIDATE.smolmachine" --name "$SMOKE_VM"
"$SMOLVM" machine start --name "$SMOKE_VM"
"$SMOLVM" machine exec --name "$SMOKE_VM" -- bash -c "
set -euo pipefail
test \"\$(node --version)\" = 'v$NODE_VERSION'
test \"\$(pi --version)\" = '$PI_VERSION'
test -x /usr/local/bin/document-extract
test -f /opt/pierre/extensions/ask-user.ts
"

mv "$CANDIDATE.smolmachine" "$OUTPUT.smolmachine"
rm -f "$CANDIDATE"
echo "$OUTPUT.smolmachine"
