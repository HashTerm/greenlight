#!/usr/bin/env bash
# End-to-end Telegram prompt test against a running Greenlight API.
#
# Run on the host or inside the greenlight container (API must be reachable at API_BASE).
#
# Required env:
#   ADMIN_API_KEY   — key with channels:write (admin key)
#   AGENT_API_KEY   — key with prompts:write (agent key)
#   TELEGRAM_BOT_TOKEN
#   TELEGRAM_CHAT_ID — user or group chat id (message @GreenlightTestBot first, then getUpdates)
#
# Optional:
#   API_BASE        — default http://127.0.0.1:8100
#   CHANNEL_ID      — default telegram-prompts-test
#   CALLBACK_URL    — default https://example.com/callback (signed callbacks not verified here)
#
# Example (Dokploy / self-host on same host as API):
#   docker compose -f docker-compose.self-host.yml --env-file .env.self-host exec -T greenlight \
#     env ADMIN_API_KEY=... AGENT_API_KEY=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... \
#     sh -c 'API_BASE=http://127.0.0.1:8100 /app/scripts/test-telegram-e2e.sh'
#
# Or from host when API is published on localhost:8100:
#   export ADMIN_API_KEY=... AGENT_API_KEY=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
#   ./scripts/test-telegram-e2e.sh

set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:8100}"
CHANNEL_ID="${CHANNEL_ID:-telegram-prompts-test}"
CALLBACK_URL="${CALLBACK_URL:-https://example.com/greenlight-test-callback}"

: "${ADMIN_API_KEY:?Set ADMIN_API_KEY}"
: "${AGENT_API_KEY:?Set AGENT_API_KEY}"
: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN}"
: "${TELEGRAM_CHAT_ID:?Set TELEGRAM_CHAT_ID}"

echo "==> healthz"
curl -sf "${API_BASE}/healthz" | grep -q '"status":"ok"' && echo OK

echo "==> list channels"
curl -sf -H "X-API-Key: ${ADMIN_API_KEY}" "${API_BASE}/v1/channels?platform=telegram"

echo
echo "==> register PROMPT channel (409 = already exists, OK)"
register_status=$(curl -s -o /tmp/gl-channel.json -w "%{http_code}" -X POST "${API_BASE}/v1/channels/new" \
  -H "X-API-Key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel_id\": \"${CHANNEL_ID}\",
    \"platform\": \"telegram\",
    \"target_chat_id\": \"${TELEGRAM_CHAT_ID}\",
    \"credentials\": { \"bot_token\": \"${TELEGRAM_BOT_TOKEN}\" },
    \"channel_type\": \"PROMPT\"
  }")
echo "register HTTP ${register_status}"
cat /tmp/gl-channel.json
echo

echo "==> send test prompt (check Telegram now)"
prompt_status=$(curl -s -o /tmp/gl-prompt.json -w "%{http_code}" -X POST "${API_BASE}/v1/prompts/new" \
  -H "X-API-Key: ${AGENT_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel_id\": \"${CHANNEL_ID}\",
    \"text\": \"Greenlight E2E test — tap a button\",
    \"options\": [\"Approve\", \"Reject\"],
    \"callback_url\": \"${CALLBACK_URL}\"
  }")
echo "prompt HTTP ${prompt_status}"
cat /tmp/gl-prompt.json
echo

if [[ "${prompt_status}" == "200" ]]; then
  echo "SUCCESS: prompt accepted — confirm message on Telegram and tap a button."
else
  echo "FAILED: expected prompt HTTP 200"
  exit 1
fi
