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

# ---------------------------------------------------------------------------
# Notification configuration (all via environment variables — no code changes
# needed to adjust behaviour):
#
#   NOTIFY_WEBHOOK_URL      — webhook endpoint to POST alerts to (Slack, Discord,
#                             or any service that accepts a JSON POST body).
#                             Leave unset to disable notifications.
#   NOTIFY_DAYS_THRESHOLD   — alert when the token expires within this many days.
#                             Defaults to 7.
#
# Retry / back-off configuration:
#
#   GITHUB_API_MAX_RETRIES    — maximum number of attempts for the GitHub API
#                               token-validation call. Defaults to 3.
#   GITHUB_API_BACKOFF_SECONDS — initial back-off interval (seconds) between
#                               retries; doubles on each subsequent attempt
#                               (e.g. 2 → 4 → 8 s). Defaults to 2.
#
# The payload includes both "text" (Slack) and "content" (Discord) keys so
# the same URL works for either service without extra config.
# ---------------------------------------------------------------------------
NOTIFY_DAYS_THRESHOLD="${NOTIFY_DAYS_THRESHOLD:-7}"
GITHUB_API_MAX_RETRIES="${GITHUB_API_MAX_RETRIES:-3}"
GITHUB_API_BACKOFF_SECONDS="${GITHUB_API_BACKOFF_SECONDS:-2}"

# send_token_alert <days_remaining> <expiry_date>
#   Sends a webhook notification if NOTIFY_WEBHOOK_URL is configured.
#   A cooldown file prevents duplicate alerts within a 24-hour window.
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
      echo "INFO: Notification suppressed — already sent within the last 24 hours."
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
    echo "INFO: Token expiry alert sent via webhook (HTTP ${http_code})."
    echo "$now" > "$cooldown_file"
  else
    echo "WARNING: Failed to send token expiry alert via webhook (HTTP ${http_code})."
  fi
}

# ---------------------------------------------------------------------------
# validate_github_token
#   Makes an authenticated request to the GitHub API with up to 3 attempts
#   and exponential back-off (2 s, 4 s) between retries.
#   - Exits with error (non-zero) if the token is invalid / expired / revoked.
#   - Fails fast on 401/403 without waiting for all retries (genuine auth error).
#   - Logs a WARN (not ERROR) for transient failures and retries automatically.
#   - Logs a WARNING and fires a webhook alert when the token is within
#     NOTIFY_DAYS_THRESHOLD days of its expiry date.
#   GitHub includes the header "github-authentication-token-expiration"
#   in API responses when the token carries an expiry date.
# ---------------------------------------------------------------------------
validate_github_token() {
  local header_file
  header_file=$(mktemp)

  local http_code attempt max_attempts backoff_seconds
  max_attempts="${GITHUB_API_MAX_RETRIES}"
  backoff_seconds="${GITHUB_API_BACKOFF_SECONDS}"

  for attempt in $(seq 1 "$max_attempts"); do
    http_code=$(curl -s \
      -D "$header_file" \
      -o /dev/null \
      -w "%{http_code}" \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/user" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ]; then
      break
    fi

    # 401/403 = genuine auth failure — no point retrying
    if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
      rm -f "$header_file"
      echo "ERROR: GITHUB_TOKEN is invalid, expired, or revoked (GitHub API returned HTTP ${http_code})."
      echo "ERROR: Please update the GITHUB_TOKEN Replit secret with a valid personal access token and retry."
      exit 1
    fi

    if [ "$attempt" -lt "$max_attempts" ]; then
      echo "WARNING: GitHub API returned HTTP ${http_code} (attempt ${attempt}/${max_attempts}) — retrying in ${backoff_seconds}s."
      sleep "$backoff_seconds"
      backoff_seconds=$(( backoff_seconds * 2 ))
    fi
  done

  if [ "$http_code" != "200" ]; then
    rm -f "$header_file"
    echo "ERROR: GitHub API returned HTTP ${http_code} after ${max_attempts} attempts — treating token as invalid."
    echo "ERROR: Please update the GITHUB_TOKEN Replit secret with a valid personal access token and retry."
    exit 1
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
      if [ "$days_remaining" -le "$NOTIFY_DAYS_THRESHOLD" ]; then
        echo "WARNING: GITHUB_TOKEN expires in ${days_remaining} day(s) (on ${expiry_value})."
        echo "WARNING: Please rotate the token in Replit Secrets before it expires to avoid sync failures."
        send_token_alert "$days_remaining" "$expiry_value"
      else
        echo "INFO: GITHUB_TOKEN is valid and expires in ${days_remaining} day(s) (on ${expiry_value})."
      fi
    fi
  else
    echo "INFO: GITHUB_TOKEN is valid (no expiry date set — token does not expire)."
  fi
}

validate_github_token

GITHUB_REPO="gaouchio92-droid/geotrack224-intelligence"
PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo "Syncing branch 'main' to GitHub repository: ${GITHUB_REPO}"

# ---------------------------------------------------------------------------
# push_with_retry <label> <push_url> [extra git args...]
#   Attempts a git push up to 3 times with exponential back-off (5 s, 10 s).
#   - Auth errors (token rejected, password wrong) fail immediately without
#     retrying; they will not succeed on a retry.
#   - Non-fast-forward / ref-lock errors are NOT retried here because they
#     require a merge step — the caller handles those separately.
#   - All other failures (network timeouts, DNS, HTTP 5xx from GitHub, etc.)
#     are treated as transient: logged as WARN and retried.
#   Returns 0 on success, 1 on final failure.
#   Writes the last push stderr to /tmp/push_err on failure so the caller
#   can inspect it.
# ---------------------------------------------------------------------------
push_with_retry() {
  local label="$1"
  local push_url="$2"
  shift 2
  local extra_args=("$@")

  local max_attempts=3
  local backoff_seconds=5
  local attempt
  local push_err_file
  push_err_file=$(mktemp)

  for attempt in $(seq 1 "$max_attempts"); do
    if git push "$push_url" HEAD:main "${extra_args[@]}" 2>"$push_err_file"; then
      rm -f "$push_err_file"
      return 0
    fi

    local push_err
    push_err=$(cat "$push_err_file")

    # Auth failures: never succeed on retry — bail out immediately.
    if echo "$push_err" | grep -qi \
        "authentication failed\|invalid username\|could not read password\|\[remote rejected\].*authentication\|http.*401\|http.*403"; then
      rm -f "$push_err_file"
      echo "ERROR: Push failed with an authentication error (${label}) — token may be invalid or revoked."
      echo "ERROR: Push output: ${push_err}"
      return 1
    fi

    # Non-fast-forward / ref-lock: signal to caller without retrying here.
    if echo "$push_err" | grep -q "non-fast-forward\|fetch first\|cannot lock ref"; then
      cp "$push_err_file" /tmp/push_err
      rm -f "$push_err_file"
      return 2
    fi

    # Transient failure — log and retry if attempts remain.
    if [ "$attempt" -lt "$max_attempts" ]; then
      echo "WARNING: Push failed (${label}, attempt ${attempt}/${max_attempts}) — retrying in ${backoff_seconds}s."
      echo "WARNING: Push output: ${push_err}"
      sleep "$backoff_seconds"
      backoff_seconds=$(( backoff_seconds * 2 ))
    else
      cp "$push_err_file" /tmp/push_err
      rm -f "$push_err_file"
      echo "ERROR: Push failed (${label}) after ${max_attempts} attempts — giving up."
      echo "ERROR: Last push output: ${push_err}"
      return 1
    fi
  done
}

# ---------------------------------------------------------------------------
# Try a normal (fast-forward) push first.
# If it fails with a non-fast-forward error (i.e. the remote has commits
# that our local branch doesn't have), fetch the remote changes and merge
# them before retrying. This handles the case where task agents have pushed
# commits directly to GitHub, causing the histories to diverge.
# ---------------------------------------------------------------------------
push_rc=0
push_with_retry "fast-forward" "$PUSH_URL" || push_rc=$?

if [ "$push_rc" -eq 0 ]; then
  echo "Sync to GitHub completed successfully."
  exit 0
fi

if [ "$push_rc" -eq 1 ]; then
  # Auth error or exhausted retries — already logged inside the function.
  exit 1
fi

# push_rc == 2: non-fast-forward — fetch, merge, then retry with back-off.
push_err=$(cat /tmp/push_err 2>/dev/null || true)
rm -f /tmp/push_err

echo "WARNING: Non-fast-forward push detected — fetching remote changes and merging."

FETCH_REMOTE="github-sync-fetch-remote-$$"
git remote add "$FETCH_REMOTE" "$PUSH_URL" 2>/dev/null || true
git fetch "$FETCH_REMOTE" main

# Merge remote changes, preferring our local version on conflict
git merge --no-edit -X ours "FETCH_HEAD" \
  -m "chore: merge remote GitHub changes (sync reconciliation)"

git remote remove "$FETCH_REMOTE" 2>/dev/null || true

# Retry the push after the merge (with back-off for transient errors).
merge_push_rc=0
push_with_retry "post-merge" "$PUSH_URL" || merge_push_rc=$?

if [ "$merge_push_rc" -eq 0 ]; then
  echo "Sync to GitHub completed successfully (after merge)."
elif [ "$merge_push_rc" -eq 2 ]; then
  echo "ERROR: Push failed even after merging remote changes (repeated non-fast-forward)."
  exit 1
else
  exit 1
fi
