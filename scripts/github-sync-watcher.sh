#!/bin/bash

POLL_INTERVAL=30
GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"

echo "GitHub sync watcher started (polling every ${POLL_INTERVAL}s)"
echo "Watching for unpushed commits on 'main' → github.com/${GITHUB_REPO}"

while true; do
  sleep "$POLL_INTERVAL"

  if [ -z "$GITHUB_TOKEN" ]; then
    continue
  fi

  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ "$CURRENT_BRANCH" != "main" ]; then
    continue
  fi

  PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

  # Fetch remote HEAD SHA without needing a configured remote
  REMOTE_SHA=$(git ls-remote "$PUSH_URL" refs/heads/main 2>/dev/null | awk '{print $1}' || echo "")
  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")

  if [ -n "$LOCAL_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    echo "$(date -u): Local HEAD (${LOCAL_SHA:0:7}) differs from GitHub (${REMOTE_SHA:0:7}) — syncing..."
    bash scripts/sync-to-github.sh 2>&1 && \
      echo "$(date -u): Sync completed successfully." || \
      echo "$(date -u): Sync failed — will retry next cycle."
  fi
done
