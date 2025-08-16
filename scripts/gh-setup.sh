#!/usr/bin/env bash
set -euo pipefail

# Helper to populate GitHub repo secrets/vars using gh CLI.
# Usage: export the envs below, then run: bash scripts/gh-setup.sh
# Requires: gh auth login (already authenticated) and origin remote pointing to target repo.

# Detect repo from git remote
REPO_URL=$(git remote get-url origin)
# Expect https://github.com/<owner>/<repo>.git or without .git
SLUG=$(echo "$REPO_URL" | sed -E 's|^https://github.com/||; s|\.git$||')
if [ -z "$SLUG" ]; then echo "Could not detect repo slug"; exit 1; fi

echo "Using repo: $SLUG"

# --- Secrets ---
set_secret() {
  local key="$1"; local value="${!1-}"
  if [ -z "$value" ]; then echo "[skip] $key not set"; return; fi
  echo -n "$value" | gh secret set "$key" -R "$SLUG" --body - >/dev/null && echo "[ok] $key"
}

set_secret SUPABASE_PROJECT_REF
set_secret SUPABASE_ACCESS_TOKEN
set_secret SUPABASE_DB_PASSWORD
set_secret SUPABASE_ANON_KEY
set_secret SUPABASE_SERVICE_ROLE_KEY
set_secret SUPABASE_URL
set_secret ADMIN_API_SECRET
set_secret STRIPE_SECRET_KEY
set_secret STRIPE_PUBLISHABLE_KEY
set_secret STRIPE_WEBHOOK_SECRET
set_secret VERCEL_DEPLOY_HOOK_URL

# --- Variables ---
set_var() {
  local key="$1"; local value="${!1-}"
  if [ -z "$value" ]; then echo "[skip] $key not set"; return; fi
  gh variable set "$key" -R "$SLUG" -b "$value" >/dev/null && echo "[ok] var $key"
}

set_var HEALTH_URL
set_var HEALTH_ORIGIN
set_var SPA_URL
set_var FUNCTION_FLAGS_JSON
set_var DEPLOY_ALL

echo "Done. Verify in https://github.com/$SLUG/settings/secrets/actions"
