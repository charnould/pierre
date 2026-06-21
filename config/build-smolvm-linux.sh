#!/usr/bin/env bash
# Triggers the Linux AMD64 smolmachine build on GitHub Actions,
# waits for completion, and downloads the artifacts to config/smolvm/.
#
# Usage        : bun run vm:build:linux
# Prerequisites: gh CLI installed (brew install gh) and authenticated (gh auth login)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKFLOW="build-smolvm.yml"
REPO="charnould/pierre"
SMOLVM_DIR="$REPO_ROOT/config/smolvm"

echo "Déclenchement du build Linux (AMD64) sur GitHub Actions..."
gh workflow run "$WORKFLOW" --repo "$REPO"

sleep 5

RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "Run ID : $RUN_ID — https://github.com/$REPO/actions/runs/$RUN_ID"

echo "En attente de la fin du build (~10-15 min)..."
gh run watch "$RUN_ID" --repo "$REPO"

echo "Suppression des anciens binaires..."
rm -f "$SMOLVM_DIR/pierre-amd64" "$SMOLVM_DIR/pierre-amd64.smolmachine"

echo "Téléchargement des artifacts dans $SMOLVM_DIR/..."
gh run download "$RUN_ID" --repo "$REPO" --name smolmachine-amd64 --dir "$SMOLVM_DIR"

chmod +x "$SMOLVM_DIR/pierre-amd64"

echo "✓ Artifacts téléchargés dans $SMOLVM_DIR/"
echo "  → git add $SMOLVM_DIR/ && git commit -m 'chore: update smolmachines'"
