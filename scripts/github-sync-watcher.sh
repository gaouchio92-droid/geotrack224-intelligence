#!/bin/bash

POLL_INTERVAL=30
GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"
# How often (in seconds) to re-validate the token; default: every hour
TOKEN_CHECK_INTERVAL=3600
last_token_check=0

# ---------------------------------------------------------------------------
# check_github_token
#   Validates the current GITHUB_TOKEN against the GitHub API.
#   - Logs an ERROR and returns 1 if the token is invalid/expired/revoked.
#   - Logs a WARNING if the token expires within 7 days.
#   - Returns 0 on success so the caller can decide whether to continue.
# ---------------------------------------------------------------------------
check_github_token() {
  local header_file
  header_file=$(mktemp)

  local http_code
  http_code=$(curl -s \
    -D "$header_file" \
    -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/user")

  if [ "$http_code" != "200" ]; then
    rm -f "$header_file"
    echo "$(date -u): ERROR: GITHUB_TOKEN is invalid, expired, or revoked (GitHub API returned HTTP ${http_code})."
    echo "$(date -u): ERROR: Update the GITHUB_TOKEN Replit secret with a valid personal access token. Sync is paused."
    return 1
  fi

  local expiry_value
  expiry_value=$(grep -i "^github-authentication-token-expiration:" "$header_file" \
    | awk '{$1=""; print $0}' | tr -d '\r' | xargs)

  rm -f "$header_file"

  if [ -n "$expiry_value" ]; then
    local expiry_epoch now_epoch days_remaining
    expiry_epoch=$(date -d "$expiry_value" +%s 2>/dev/null || echo "")
    if [ -n "$expiry_epoch" ]; then
      now_epoch=$(date +%s)
      days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))
      if [ "$days_remaining" -le 0 ]; then
        echo "$(date -u): ERROR: GITHUB_TOKEN expired on ${expiry_value}. Update the Replit secret immediately. Sync is paused."
        return 1
      elif [ "$days_remaining" -le 7 ]; then
        echo "$(date -u): WARNING: GITHUB_TOKEN expires in ${days_remaining} day(s) (on ${expiry_value}). Rotate it in Replit Secrets soon."
      else
        echo "$(date -u): INFO: GITHUB_TOKEN is valid — expires in ${days_remaining} day(s) (on ${expiry_value})."
      fi
    fi
  else
    echo "$(date -u): INFO: GITHUB_TOKEN is valid (no expiry date — token does not expire)."
  fi

  return 0
}

echo "GitHub sync watcher started (polling every ${POLL_INTERVAL}s)"
echo "Watching for unpushed commits on 'main' → github.com/${GITHUB_REPO}"
echo "NOTE: GITHUB_TOKEN must be stored as a Replit Secret (not a plain env var) for security."

while true; do
  sleep "$POLL_INTERVAL"

  if [ -z "$GITHUB_TOKEN" ]; then
    continue
  fi

  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ "$CURRENT_BRANCH" != "main" ]; then
    continue
  fi

  # Periodically validate the token so expiry is caught early
  now=$(date +%s)
  if [ $(( now - last_token_check )) -ge "$TOKEN_CHECK_INTERVAL" ]; then
    if ! check_github_token; then
      last_token_check="$now"
      continue
    fi
    last_token_check="$now"
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
