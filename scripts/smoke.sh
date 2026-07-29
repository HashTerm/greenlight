#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8100}"

echo "==> healthz"
curl -sf "${BASE_URL}/healthz" | grep -q '"status":"ok"'

echo "==> create prompt (dry - may fail without real Telegram token)"
curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/v1/prompts/new" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Ready to deploy?","options":["Deploy","Cancel"],"correlation_id":"smoke-1"}' \
  | grep -E '^(200|400|500)$'

echo "==> list channels"
curl -sf "${BASE_URL}/v1/channels"

echo
echo "Smoke test completed"
