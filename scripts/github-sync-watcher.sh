#!/bin/bash

POLL_INTERVAL=30
GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"
# How often (in seconds) to re-validate the token; default: every hour
TOKEN_CHECK_INTERVAL=3600
last_token_check=0

# ---------------------------------------------------------------------------
# Notification configuration (all via environment variables — no code changes
# needed to adjust behaviour):
#
#   NOTIFY_WEBHOOK_URL    — webhook endpoint to POST alerts to (Slack, Discord,
#                           or any service that accepts a JSON POST body).
#                           Leave unset to disable notifications.
#   NOTIFY_DAYS_THRESHOLD — alert when the token expires within this many days.
#                           Defaults to 7.
#
# The payload includes both "text" (Slack) and "content" (Discord) keys so
# the same URL works for either service without extra config.
# ---------------------------------------------------------------------------
NOTIFY_DAYS_THRESHOLD="${NOTIFY_DAYS_THRESHOLD:-7}"

# send_token_alert <days_remaining> <expiry_date>
#   Sends a webhook notification if NOTIFY_WEBHOOK_URL is configured.
#   A cooldown file prevents duplicate alerts within a 24-hour window so the
#   periodic token check doesn't spam the channel every hour.
send_token_alert() {
  local days_remaining="$1"
  local expiry_date="$2"

  if [ -z "$NOTIFY_WEBHOOK_URL" ]; then
    return 0
  fi

  local cooldown_file="/tmp/github-token-notify-cooldown"
  local cooldown_seconds=86400
  local now
  now=$(date +%s)

  if [ -f "$cooldown_file" ]; then
    local last_sent
    last_sent=$(cat "$cooldown_file" 2>/dev/null || echo "0")
    if [ $(( now - last_sent )) -lt "$cooldown_seconds" ]; then
      echo "$(date -u): INFO: Notification suppressed — already sent within the last 24 hours."
      return 0
    fi
  fi

  local message
  message="⚠️ GitHub token expiry warning: GITHUB_TOKEN for geotrack224-intelligence expires in ${days_remaining} day(s) (on ${expiry_date}). Please rotate the token in Replit Secrets to avoid sync failures."

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    --data "{\"text\": \"${message}\", \"content\": \"${message}\"}" \
    "$NOTIFY_WEBHOOK_URL" 2>/dev/null || echo "000")

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "$(date -u): INFO: Token expiry alert sent via webhook (HTTP ${http_code})."
    echo "$now" > "$cooldown_file"
  else
    echo "$(date -u): WARNING: Failed to send token expiry alert via webhook (HTTP ${http_code})."
  fi
}

# ---------------------------------------------------------------------------
# check_github_token
#   Validates the current GITHUB_TOKEN against the GitHub API.
#   - Logs an ERROR and returns 1 if the token is invalid/expired/revoked.
#   - Logs a WARNING and fires a webhook alert if the token expires within
#     NOTIFY_DAYS_THRESHOLD days.
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
      elif [ "$days_remaining" -le "$NOTIFY_DAYS_THRESHOLD" ]; then
        echo "$(date -u): WARNING: GITHUB_TOKEN expires in ${days_remaining} day(s) (on ${expiry_value}). Rotate it in Replit Secrets soon."
        send_token_alert "$days_remaining" "$expiry_value"
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
if [ -n "$NOTIFY_WEBHOOK_URL" ]; then
  echo "INFO: Token expiry notifications enabled (threshold: ${NOTIFY_DAYS_THRESHOLD} day(s), cooldown: 24 h)."
else
  echo "INFO: Token expiry notifications disabled. Set NOTIFY_WEBHOOK_URL to enable webhook alerts."
fi

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
