#!/usr/bin/env bash
# HoldingsKit — deploy all Cloudflare workers
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building & deploying API (holdingskit-api)..."
pnpm run deploy

echo "==> Deploying ingestion worker..."
pnpm run deploy:ingestion

echo "==> Deploying scraper worker..."
pnpm run deploy:scraper

echo "==> Applying remote D1 migrations..."
pnpm db:migrate:prod

echo ""
echo "Done. Production: https://oktangle.com"
echo "Health:         https://oktangle.com/api/health"
echo "Ingestion:      https://ingest.oktangle.com/health"
echo "Scraper:        https://scraper.oktangle.com/health"
