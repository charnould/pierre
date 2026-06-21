#!/usr/bin/env bash
# Procédure complète : README.md § « Publier une release »
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "master" ]; then
  echo "error: release must be run from master (current: $BRANCH)"
  exit 1
fi

BUMP="${1:-minor}"
if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "error: usage: release.sh [patch|minor|major]"
  exit 1
fi

bun pm version "$BUMP" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

node -e "
const fs = require('fs');
const version = process.argv[1];
for (const path of ['server/package.json', 'desktop/package.json']) {
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}
" "$NEW_VERSION"

git add package.json server/package.json desktop/package.json
git commit -m "chore: release $NEW_VERSION"

echo ""
echo "Committed release $NEW_VERSION."
echo "Next: git push origin master"
echo "Then: GitHub → New release → tag $NEW_VERSION → Publish"
