#!/bin/bash

POLL_INTERVAL=30

echo "GitHub sync watcher started (polling every ${POLL_INTERVAL}s)"
echo "Watching for uncommitted changes and unpushed commits on 'main'..."

while true; do
  if [ -z "$GITHUB_TOKEN" ]; then
    sleep "$POLL_INTERVAL"
    continue
  fi

  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ "$CURRENT_BRANCH" != "main" ]; then
    sleep "$POLL_INTERVAL"
    continue
  fi

  if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    echo "$(date -u): Uncommitted changes detected — staging and committing..."
    git add -A
    if ! git diff --cached --quiet 2>/dev/null; then
      git -c user.email="$(git config user.email 2>/dev/null || echo 'replit-sync@noreply.github.com')" \
          -c user.name="$(git config user.name 2>/dev/null || echo 'Replit Sync')" \
          commit -m "chore: auto-sync $(date -u '+%Y-%m-%dT%H:%M:%SZ')" 2>&1
      echo "$(date -u): Auto-commit created."
    fi
  fi

  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
  REMOTE_SHA=$(git rev-parse github/main 2>/dev/null || echo "")

  if [ -n "$LOCAL_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    echo "$(date -u): Local commits ahead of GitHub — syncing..."
    bash scripts/sync-to-github.sh 2>&1 || \
      echo "$(date -u): Sync failed — will retry next cycle."
  fi

  sleep "$POLL_INTERVAL"
done
