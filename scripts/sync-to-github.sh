#!/bin/bash
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "INFO: GITHUB_TOKEN is not set — skipping GitHub sync." >&2
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "INFO: Current branch is '${CURRENT_BRANCH}', not 'main' — skipping GitHub sync."
  exit 0
fi

EXISTING_REMOTE_URL=$(git remote get-url github 2>/dev/null || echo "")
if [ -z "$EXISTING_REMOTE_URL" ]; then
  echo "ERROR: No 'github' remote configured. Run: git remote add github https://github.com/OWNER/REPO.git" >&2
  exit 1
fi

GITHUB_REPO=$(echo "$EXISTING_REMOTE_URL" | sed 's|https://github.com/||;s|\.git$||')
echo "Syncing branch 'main' to GitHub repository: ${GITHUB_REPO}"

git config user.email "$(git config user.email 2>/dev/null || echo 'replit-sync@noreply.github.com')" 2>/dev/null || true
git config user.name "$(git config user.name 2>/dev/null || echo 'Replit Sync')" 2>/dev/null || true

CREDENTIAL_HELPER="!f() { printf 'username=x-access-token\npassword=%s\n' \"${GITHUB_TOKEN}\"; }; f"

git -c credential.helper="${CREDENTIAL_HELPER}" fetch github main 2>/dev/null || true

git -c credential.helper="${CREDENTIAL_HELPER}" push github main:main
echo "Sync to GitHub completed successfully."
