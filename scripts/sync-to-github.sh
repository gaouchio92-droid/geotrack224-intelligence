#!/bin/bash
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "INFO: GITHUB_TOKEN is not set — skipping GitHub sync."
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "INFO: Current branch is '${CURRENT_BRANCH}', not 'main' — skipping GitHub sync."
  exit 0
fi

GITHUB_REMOTE_URL="https://github.com/gaouchio92-droid/geotrack224-intelligence.git"

EXISTING_REMOTE_URL=$(git remote get-url github 2>/dev/null || echo "")
if [ -z "$EXISTING_REMOTE_URL" ]; then
  echo "INFO: Remote 'github' not found — adding it automatically."
  git remote add github "$GITHUB_REMOTE_URL"
fi

GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"
echo "Syncing branch 'main' to GitHub repository: ${GITHUB_REPO}"

git config user.email "$(git config user.email 2>/dev/null || echo 'replit-sync@noreply.github.com')" 2>/dev/null || true
git config user.name "$(git config user.name 2>/dev/null || echo 'Replit Sync')" 2>/dev/null || true

CREDENTIAL_HELPER="!f() { printf 'username=x-access-token\npassword=%s\n' \"${GITHUB_TOKEN}\"; }; f"

git -c credential.helper="${CREDENTIAL_HELPER}" push github main:main
echo "Sync to GitHub completed successfully."
