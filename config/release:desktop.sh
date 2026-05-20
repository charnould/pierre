#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "master" ]; then
  echo "error: desktop:release must be run from master (current: $BRANCH)"
  exit 1
fi

LAST_TAG=$(git tag -l 'v*' --sort=-version:refname | head -1)
if [ -n "$LAST_TAG" ]; then
  if git diff --quiet "$LAST_TAG" HEAD -- desktop/; then
    echo "error: no changes in desktop/ since $LAST_TAG"
    exit 1
  fi
fi

cd desktop
bun pm version minor --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
cd ..

git add desktop/package.json
git commit -m "chore(desktop): release v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin master
git push origin "v$NEW_VERSION"

echo "Released v$NEW_VERSION — CI will build and publish artifacts."
