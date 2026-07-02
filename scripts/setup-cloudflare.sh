#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

WRANGLER=(pnpm exec wrangler)

require_auth() {
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    cat <<'EOF'

Missing Cloudflare credentials.

Option A — API Token (recommended for CI and this script):
  1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
  2. Use template "Edit Cloudflare Workers" or create custom token with:
     - Account → Cloudflare Workers Scripts → Edit
     - Account → Workers KV Storage → Edit
     - Account → Workers R2 Storage → Edit
     - Account → D1 → Edit
     - Account → Workers Queues → Edit
     - Account → Account Settings → Read (for account id)
  3. Export before running:
       export CLOUDFLARE_API_TOKEN="your-token"
       export CLOUDFLARE_ACCOUNT_ID="your-account-id"   # optional if token is account-scoped

Option B — Interactive login:
  pnpm exec wrangler login

Then re-run: pnpm run setup:cf

EOF
    exit 1
  fi
  export CLOUDFLARE_API_TOKEN
  if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    export CLOUDFLARE_ACCOUNT_ID
  fi
}

whoami_check() {
  if ! "${WRANGLER[@]}" whoami 2>/dev/null | grep -qE 'You are logged in|Account ID'; then
    echo "Wrangler is not authenticated. Set CLOUDFLARE_API_TOKEN or run: pnpm exec wrangler login"
    exit 1
  fi
  "${WRANGLER[@]}" whoami
}

ensure_d1() {
  local name="13f-db"
  local id
  id=$("${WRANGLER[@]}" d1 list 2>/dev/null | awk -v n="$name" '$0 ~ n { for (i=1;i<=NF;i++) if ($i ~ /^[0-9a-f-]{36}$/) { print $i; exit } }')
  if [[ -z "$id" ]]; then
    echo "Creating D1 database ${name}..."
    local out
    out=$("${WRANGLER[@]}" d1 create "$name" 2>&1)
    echo "$out"
    id=$(echo "$out" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  fi
  if [[ -z "$id" ]]; then
    echo "Failed to resolve D1 database id for ${name}"
    exit 1
  fi
  echo "$id"
}

ensure_r2() {
  local name="13f-raw"
  if "${WRANGLER[@]}" r2 bucket list 2>/dev/null | grep -q "$name"; then
    echo "R2 bucket ${name} already exists"
    return 0
  fi
  echo "Creating R2 bucket ${name}..."
  "${WRANGLER[@]}" r2 bucket create "$name"
}

ensure_kv() {
  local title="13f-kv"
  local id
  id=$("${WRANGLER[@]}" kv namespace list 2>/dev/null | awk -v t="$title" '$0 ~ t { for (i=1;i<=NF;i++) if ($i ~ /^[0-9a-f]{32}$/) { print $i; exit } }')
  if [[ -z "$id" ]]; then
    echo "Creating KV namespace ${title}..."
    local out
    out=$("${WRANGLER[@]}" kv namespace create "$title" 2>&1)
    echo "$out"
    id=$(echo "$out" | grep -oE '[0-9a-f]{32}' | tail -1)
  fi
  if [[ -z "$id" ]]; then
    echo "Failed to resolve KV namespace id for ${title}"
    exit 1
  fi
  echo "$id"
}

ensure_queue() {
  local name="13f-ingest"
  if "${WRANGLER[@]}" queues list 2>/dev/null | grep -q "$name"; then
    echo "Queue ${name} already exists"
    return 0
  fi
  echo "Creating queue ${name}..."
  "${WRANGLER[@]}" queues create "$name" || true
}

patch_wrangler() {
  local d1_id="$1"
  local kv_id="$2"
  node scripts/update-wrangler-ids.mjs "$d1_id" "$kv_id"
}

apply_migrations() {
  echo "Applying D1 migrations (local)..."
  "${WRANGLER[@]}" d1 migrations apply 13f-db --local
  echo "Applying D1 migrations (remote)..."
  "${WRANGLER[@]}" d1 migrations apply 13f-db --remote
}

deploy_all() {
  echo "Deploying Next.js worker (13f-analyzer)..."
  pnpm run deploy
  echo "Deploying ingestion worker..."
  "${WRANGLER[@]}" deploy --config wrangler.ingestion.jsonc
}

main() {
  require_auth
  whoami_check

  if [[ ! -d node_modules ]]; then
    pnpm install
  fi

  D1_ID=$(ensure_d1)
  ensure_r2
  KV_ID=$(ensure_kv)
  ensure_queue

  echo "D1 database id: ${D1_ID}"
  echo "KV namespace id: ${KV_ID}"

  patch_wrangler "$D1_ID" "$KV_ID"
  apply_migrations
  deploy_all

  echo ""
  echo "Done. Workers:"
  "${WRANGLER[@]}" deployments list 2>/dev/null || true
}

main "$@"
