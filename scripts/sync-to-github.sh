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
# validate_github_token
#   Makes a single authenticated request to the GitHub API.
#   - Exits with error (non-zero) if the token is invalid / expired / revoked.
#   - Logs a WARNING when the token is within 7 days of its expiry date.
# ---------------------------------------------------------------------------
validate_github_token() {
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
    echo "ERROR: GITHUB_TOKEN is invalid, expired, or revoked (GitHub API returned HTTP ${http_code})."
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
      if [ "$days_remaining" -le 7 ]; then
        echo "WARNING: GITHUB_TOKEN expires in ${days_remaining} day(s) (on ${expiry_value})."
        echo "WARNING: Please rotate the token in Replit Secrets before it expires to avoid sync failures."
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
# Try a normal (fast-forward) push first.
# If it fails with a non-fast-forward error (i.e. the remote has commits
# that our local branch doesn't have), fetch the remote changes and merge
# them before retrying. This handles the case where task agents have pushed
# commits directly to GitHub, causing the histories to diverge.
# ---------------------------------------------------------------------------
if git push "$PUSH_URL" HEAD:main 2>&1; then
  echo "Sync to GitHub completed successfully."
  exit 0
fi

echo "INFO: Non-fast-forward detected — fetching remote changes and merging..."

# Fetch remote into a temporary ref so we don't need a configured remote
git fetch "$PUSH_URL" main:refs/remotes/github-sync/main 2>&1

# Merge the remote changes into local HEAD (prefer local on conflict)
git -c user.email="replit-sync@noreply.github.com" \
    -c user.name="Replit Sync" \
    merge refs/remotes/github-sync/main \
    --no-edit \
    --strategy-option=ours \
    -m "chore: merge remote changes from GitHub [auto-sync]" 2>&1

# Now push the merged result
git -c user.email="replit-sync@noreply.github.com" \
    -c user.name="Replit Sync" \
    push "$PUSH_URL" HEAD:main 2>&1

echo "Sync to GitHub completed successfully (after merge)."
