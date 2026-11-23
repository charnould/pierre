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
    SMOLVM_ARCHIVE_TARGET=darwin-arm64
    ;;
  linux-amd64)
    HOST_ARCH=x86_64
    NODE_TARGET=linux-amd64
    SMOLVM_ARCHIVE_TARGET=linux-x86_64
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
SMOLVM_HOME="$TOOLS/smolvm-$SMOLVM_VERSION-$SMOLVM_ARCHIVE_TARGET"
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
SMOKE_KNOWLEDGE="$BUILD/.smoke-knowledge"
SMOKE_WORK="$BUILD/.smoke-work"

cleanup() {
  for name in "$BUILD_VM" "$SMOKE_VM"; do
    "$SMOLVM" machine stop --name "$name" 2>/dev/null || true
    "$SMOLVM" machine delete --name "$name" -f 2>/dev/null || true
  done
  rm -f "$CANDIDATE" "$CANDIDATE.smolmachine"
  rm -rf "$SMOKE_KNOWLEDGE" "$SMOKE_WORK"
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
  procps ca-certificates curl xz-utils poppler-utils pandoc tesseract-ocr tesseract-ocr-fra
ln -sf \$(command -v fdfind) /usr/local/bin/fd
curl -fsSL --retry 3 -o /tmp/node.tar.xz '$NODE_URL'
echo '$NODE_SHA  /tmp/node.tar.xz' | sha256sum -c -
tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
rm /tmp/node.tar.xz
test \"\$(node --version)\" = 'v$NODE_VERSION'
"

"$SMOLVM" machine exec --name "$BUILD_VM" -- mkdir -p \
  /opt/pierre/agent \
  /opt/pierre/agent/document-extract \
  /opt/pierre/extensions \
  /opt/pierre/skills \
  /opt/pierre/.node-cache

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

for file in extract-document.sh extract-spreadsheet.mjs; do
  "$SMOLVM" machine cp \
    "$GUEST/document-extract/$file" \
    "$BUILD_VM:/opt/pierre/agent/document-extract/$file"
done
"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
ln -s /opt/pierre/agent/document-extract/extract-document.sh /usr/local/bin/document-extract
chmod +x \
  /opt/pierre/agent/document-extract/extract-document.sh \
  /opt/pierre/agent/document-extract/extract-spreadsheet.mjs
"

for file in "$GUEST"/extensions/*.js; do
  [ -f "$file" ] || continue
  "$SMOLVM" machine cp "$file" "$BUILD_VM:/opt/pierre/extensions/$(basename "$file")"
done

if [ -d "$GUEST/skills" ]; then
  while IFS= read -r -d '' file; do
    rel="${file#"$GUEST/skills/"}"
    dir="$(dirname "$rel")"
    if [ "$dir" != "." ]; then
      "$SMOLVM" machine exec --name "$BUILD_VM" -- mkdir -p "/opt/pierre/skills/$dir"
    fi
    "$SMOLVM" machine cp "$file" "$BUILD_VM:/opt/pierre/skills/$rel"
  done < <(find "$GUEST/skills" -type f ! -name '.*' -print0)
fi

"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c '
set -euo pipefail
shopt -s nullglob
for script in /opt/pierre/skills/*/scripts/*; do
  [ -f "$script" ] || continue
  chmod +x "$script"
  name="$(basename "$script")"
  ln -sf "$script" "/usr/local/bin/${name%.*}"
done
'

"$SMOLVM" machine cp \
  "$GUEST/PI_SYSTEM_APPEND.md" \
  "$BUILD_VM:/opt/pierre/PI_SYSTEM_APPEND.md"

for file in texte.pdf scan-francais.pdf dossier.docx donnees.xlsx; do
  "$SMOLVM" machine cp \
    "$GUEST/fixtures/$file" \
    "$BUILD_VM:/opt/pierre/agent/document-extract/$file"
done

"$SMOLVM" machine exec --name "$BUILD_VM" -- bash -c "
set -euo pipefail
RPC_SMOKE=\$(printf '%s\n' \
  '{\"type\":\"get_state\"}' \
  '{\"type\":\"get_session_stats\"}' \
  '{\"type\":\"get_commands\"}' \
  | NODE_COMPILE_CACHE=/opt/pierre/.node-cache timeout 20s pi \
      --mode rpc \
      --no-session \
      --provider anthropic \
      --model claude-sonnet-4-5 \
      --thinking medium \
      --no-extensions \
      -ns \
      -np \
      --no-themes \
      --offline \
      --tools read,bash,edit,write,grep,find,ls,ask_user \
      --append-system-prompt /opt/pierre/PI_SYSTEM_APPEND.md \
      -e /opt/pierre \
)
printf '%s\n' \"\$RPC_SMOKE\" | jq -s -e '
  any(.[]; .type == \"response\" and .command == \"get_state\" and .success == true
    and .data.autoCompactionEnabled == true)
  and any(.[]; .type == \"response\" and .command == \"get_session_stats\" and .success == true)
  and any(.[]; .type == \"response\" and .command == \"get_commands\" and .success == true
    and any(.data.commands[]; .name == \"skill:carl\" and .source == \"skill\"))
  and all(.[]; .type != \"extension_error\")
' >/dev/null
test -n \"\$(ls -A /opt/pierre/.node-cache)\"
test -x /usr/local/bin/document-extract
test -x /usr/local/bin/carl
test -r /opt/pierre/skills/carl/SKILL.md
test \"\$(tesseract --list-langs 2>/dev/null | grep -cx fra)\" = 1
find / -xdev -type c -delete 2>/dev/null || true
apt-get purge -y -qq xz-utils
apt-get autoremove -y -qq
rm -rf /var/lib/apt/lists/* /root/.cache /root/.npm
dpkg-query -W -f='\${Package}\t\${Version}\n' | sort
"

"$SMOLVM" machine stop --name "$BUILD_VM"
"$SMOLVM" pack create --from-vm "$BUILD_VM" -o "$CANDIDATE"
test -s "$CANDIDATE.smolmachine"
IMAGE_BYTES=$(wc -c < "$CANDIDATE.smolmachine")
MAX_IMAGE_BYTES=$((300 * 1024 * 1024))
if [ "$IMAGE_BYTES" -gt "$MAX_IMAGE_BYTES" ]; then
  echo "microVM image exceeds 300 MiB: $IMAGE_BYTES bytes" >&2
  exit 1
fi
echo "microVM image: $IMAGE_BYTES bytes"

mkdir -p "$SMOKE_KNOWLEDGE" "$SMOKE_WORK"
printf '%s\n' 'knowledge-marker' > "$SMOKE_KNOWLEDGE/marker.txt"
"$SMOLVM" machine create \
  --from "$CANDIDATE.smolmachine" \
  --name "$SMOKE_VM" \
  --cpus 1 \
  --mem 512 \
  --volume "$SMOKE_KNOWLEDGE:/knowledge:ro" \
  --volume "$SMOKE_WORK:/work"
"$SMOLVM" machine start --name "$SMOKE_VM"
"$SMOLVM" machine exec --name "$SMOKE_VM" -- bash -c "
set -euo pipefail
test \"\$(node --version)\" = 'v$NODE_VERSION'
test \"\$(pi --version)\" = '$PI_VERSION'
python --version
sqlite3 --version
jq --version
rg --version
fd --version
test -x /usr/local/bin/document-extract
test -x /usr/local/bin/carl
test -f /opt/pierre/extensions/ask-user.js
test -f /opt/pierre/extensions/hot-runtime.js
test -n \"\$(ls -A /opt/pierre/.node-cache)\"
test -r /opt/pierre/skills/carl/SKILL.md
test -r /opt/pierre/PI_SYSTEM_APPEND.md
test -r /knowledge/marker.txt
! touch /knowledge/forbidden

node - <<'JS'
const http = require('node:http')
const fs = require('node:fs')
const { spawn } = require('node:child_process')

const MARKER = 'HOT_CONTEXT_SMOKE_MARKER_42'
let sawHead = false
let systemMessage = null
let resolveSystem
const gotSystem = new Promise((r) => { resolveSystem = r })

const server = http.createServer((req, res) => {
  if (req.method === 'HEAD') sawHead = true
  res.writeHead(200)
  res.end()
})

;(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const baseUrl = 'http://127.0.0.1:' + port

  const pi = spawn('pi', [
    '--mode', 'rpc',
    '--no-session',
    '--provider', 'anthropic',
    '--model', 'claude-sonnet-4-5',
    '--thinking', 'medium',
    '--no-extensions',
    '-ns', '-np', '--no-themes', '--offline',
    '--tools', 'read,bash,edit,write,grep,find,ls,ask_user',
    '--append-system-prompt', '/opt/pierre/PI_SYSTEM_APPEND.md',
    '-e', '/opt/pierre'
  ], {
    cwd: '/work',
    env: {
      ...process.env,
      NODE_COMPILE_CACHE: '/opt/pierre/.node-cache',
      ANTHROPIC_API_KEY: 'smoke-key',
      PIERRE_WARM_URL: baseUrl
    },
    stdio: ['pipe', 'pipe', 'inherit']
  })

  const pending = new Map()
  const extensionErrors = []
  let buf = ''
  pi.stdout.setEncoding('utf8')
  pi.stdout.on('data', (chunk) => {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const msg = JSON.parse(trimmed)
      if (msg.type === 'extension_error') extensionErrors.push(msg)
      if (msg.type === 'message_end' && msg.message?.role === 'system' && !systemMessage) {
        systemMessage = msg.message
        resolveSystem()
      }
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    }
  })

  const send = (cmd) => new Promise((resolve, reject) => {
    const id = 'smoke-' + Math.random().toString(36).slice(2, 8)
    const timer = setTimeout(() => reject(new Error('timeout ' + cmd.type)), 15000)
    pending.set(id, (msg) => { clearTimeout(timer); resolve(msg) })
    pi.stdin.write(JSON.stringify({ ...cmd, id }) + '\n')
  })

  const state = await send({ type: 'get_state' })
  if (!state.success || state.data?.autoCompactionEnabled !== true) {
    throw new Error('get_state failed: ' + JSON.stringify(state))
  }
  const stats = await send({ type: 'get_session_stats' })
  if (!stats.success) throw new Error('get_session_stats failed')
  const cmds = await send({ type: 'get_commands' })
  if (!cmds.success || !cmds.data?.commands?.some((c) => c.name === 'skill:carl' && c.source === 'skill')) {
    throw new Error('skill:carl missing')
  }

  fs.writeFileSync('/work/AGENTS.md', '\uFEFF' + MARKER + '\n')
  const promptAck = await send({ type: 'prompt', message: 'ping' })
  if (!promptAck.success) throw new Error('prompt failed: ' + JSON.stringify(promptAck))

  await Promise.race([
    gotSystem,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timed out waiting for system message')), 10000))
  ])

  pi.stdin.write(JSON.stringify({ type: 'abort' }) + '\n')
  pi.kill('SIGKILL')
  server.close()
  fs.rmSync('/work/AGENTS.md', { force: true })

  if (extensionErrors.length > 0) {
    throw new Error('extension_error: ' + JSON.stringify(extensionErrors))
  }
  if (!sawHead) {
    throw new Error('PIERRE_WARM_URL HEAD was not received')
  }
  const projectContext = systemMessage?.sections?.project_context ?? ''
  if (!projectContext.includes(MARKER)) {
    throw new Error('AGENTS.md marker not found in system project_context: ' + projectContext)
  }
  if (projectContext.includes('\uFEFF')) {
    throw new Error('BOM was not stripped from AGENTS.md')
  }
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
JS

printf '%s\n' 'workspace-marker' > /work/result.txt

document-extract /opt/pierre/agent/document-extract/texte.pdf > /tmp/texte.txt
document-extract /opt/pierre/agent/document-extract/scan-francais.pdf > /tmp/ocr.txt
document-extract /opt/pierre/agent/document-extract/dossier.docx > /tmp/docx.txt
grep -q 'charges locatives' /tmp/texte.txt
grep -qi 'fuite' /tmp/ocr.txt
grep -q 'régularisation' /tmp/docx.txt
document-extract /opt/pierre/agent/document-extract/donnees.xlsx > /tmp/xlsx.txt
grep -q 'Ada Martin' /tmp/xlsx.txt
grep -q 'R-42' /tmp/xlsx.txt
grep -q 'Tableur tronqué à 20000 lignes' /tmp/xlsx.txt

python - <<'PY'
from pathlib import Path
Path('/work/long.md').write_text('x' * 300_000)
PY
pandoc /work/long.md -o /work/long.docx
document-extract /work/long.docx > /tmp/long.txt
grep -q 'Extraction tronquée à 262144 octets' /tmp/long.txt
test \"\$(wc -c < /tmp/long.txt)\" -lt 263000
"
test "$(cat "$SMOKE_WORK/result.txt")" = workspace-marker

mv "$CANDIDATE.smolmachine" "$OUTPUT.smolmachine"
rm -f "$CANDIDATE"
echo "$OUTPUT.smolmachine"
