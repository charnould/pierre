#!/usr/bin/env bash
# Triggers the Windows desktop build on GitHub Actions,
# waits for completion, and downloads the artifact to config/app/.
#
# Output : config/app/pierre-desktop-latest.zip
#
# Usage        : bun run desktop:build:windows
# Prerequisites: gh CLI installed (brew install gh) and authenticated (gh auth login)

set -euo pipefail

WORKFLOW="build-desktop.yml"
REPO="charnould/pierre"
APP_DIR="config/app"

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "master")

echo "Déclenchement du build Windows sur GitHub Actions (branche : $BRANCH)..."
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH"

sleep 5

RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "Run ID : $RUN_ID — https://github.com/$REPO/actions/runs/$RUN_ID"

echo "En attente de la fin du build (~5-10 min)..."
gh run watch "$RUN_ID" --repo "$REPO"

echo "Suppression de l'ancien artifact..."
rm -f "$APP_DIR/pierre-desktop-latest.zip"

echo "Téléchargement de l'artifact dans $APP_DIR/..."
mkdir -p "$APP_DIR"
gh run download "$RUN_ID" --repo "$REPO" --name windows --dir "$APP_DIR"

echo "Bump de version dans desktop/package.json..."
cd desktop
bun pm version minor
cd - > /dev/null

echo ""
echo "✓ Artifact téléchargé :"
echo "  → $APP_DIR/pierre-desktop-latest.zip"
echo ""
echo "Pour commiter :"
echo "  git add $APP_DIR/pierre-desktop-latest.zip desktop/package.json"
echo "  git commit -m 'build: update desktop windows'"
