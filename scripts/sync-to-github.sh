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

GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"
PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo "Syncing branch 'main' to GitHub repository: ${GITHUB_REPO}"

git -c user.email="replit-sync@noreply.github.com" \
    -c user.name="Replit Sync" \
    push --force "$PUSH_URL" HEAD:main

echo "Sync to GitHub completed successfully."
