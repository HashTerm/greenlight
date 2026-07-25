# Greenlight — steps that need you

> **Note:** Canonical product documentation lives in [`docs-site/`](../docs-site/)
> (`npm run dev:docs` → http://localhost:3001). This file remains as an internal
> hands-on runbook (Telegram / local secrets). Prefer the docs site for setup,
> platforms, and API reference.

Local dev stack is running via Docker. Secrets are in `.env` (recreated for this session).  
**Do not commit `.env`** — it contains your API keys.

| Service | URL |
|---------|-----|
| API + webhooks | http://localhost:8100 |
| Admin UI | http://localhost:3000 |
| Postgres | localhost:5432 (`greenlight` / `greenlight`) |

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f greenlight greenlight-ui
```

---

## 1. Create your admin account (required once)

1. Open **http://localhost:3000/setup**
2. Enter your email and a password (min 8 characters)
3. Sign in at **http://localhost:3000/login**

If `/setup` redirects to `/login` and you never created an account, the `admin_users` table may already have a row — use login or reset:

```bash
docker exec greenlight-postgres-dev psql -U greenlight -d greenlight -c "DELETE FROM admin_users;"
```

Then visit `/setup` again.

---

## 2. Create a Telegram bot (required for real Telegram testing)

Automated tests used a **fake** bot token. Telegram delivery only works with a real bot.

### A. Create the bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Choose a display name (e.g. `My Greenlight Dev`)
4. Choose a username ending in `bot` (e.g. `my_greenlight_dev_bot`)
5. Copy the **bot token** — format like `123456789:AAH...`

Keep this token secret. You will paste it only into Greenlight (UI or API), not into git.

### B. Add the bot to your target chat

**Group (recommended for prompts)**

1. Create a Telegram group or use an existing one
2. Add your bot to the group
3. Optional: make the bot an admin if you need it to read all messages

**Private chat**

1. Open the bot profile and press **Start**
2. Use your user ID as `target_chat_id` (see below)

### C. Get the chat ID (`target_chat_id`)

**Option 1 — @userinfobot / @getidsbot**

- Forward a message from the group to `@userinfobot` or add the bot to the group

**Option 2 — API after a message**

1. Send any message in the group
2. Open in browser (replace `TOKEN`):

   `https://api.telegram.org/botTOKEN/getUpdates`

3. Find `"chat":{"id": -1001234567890}` — use that number (negative for groups)

### D. Register the channel in Greenlight

**Admin UI**

1. Go to **Channels → Add channel**
2. Platform: `telegram`
3. Channel ID: e.g. `my-telegram-prompts` (your choice, stable slug)
4. Target chat ID: e.g. `-1001234567890`
5. Channel type:
   - **PROMPT** — human-in-the-loop questions
   - **MESSAGE** — inbound messages to your agent (requires callback URL)
6. Credentials: `bot_token` = token from BotFather
7. Save

**curl** (replace values; API key from `.env` → `API_KEY`):

```bash
export API_KEY="$(grep '^API_KEY=' .env | cut -d= -f2)"

curl -X POST http://localhost:8100/register-channel \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "my-telegram-prompts",
    "platform": "telegram",
    "target_chat_id": "-1001234567890",
    "credentials": { "bot_token": "YOUR_BOT_TOKEN" },
    "channel_type": "PROMPT"
  }'
```

Webhook URL shown on the channel detail page (local dev uses polling for Telegram; production needs a public URL):

`{PUBLIC_WEBHOOK_URL}/webhooks/telegram/{channel_id}`

For local dev, `PUBLIC_WEBHOOK_URL=http://localhost:8100` in `.env` is enough for Telegram polling mode.

---

## 3. Send a test prompt (after real bot is registered)

**Admin UI:** Prompts → New prompt → pick your PROMPT channel.

**curl:**

```bash
curl -X POST http://localhost:8100/v1/prompts \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "my-telegram-prompts",
    "text": "Ready to deploy v2.4.1?",
    "options": ["Deploy", "Cancel"],
    "allow_text": false,
    "ttl_sec": 3600
  }'
```

You should see the prompt in Telegram. Reply in the group to complete the loop.

---

## 4. MESSAGE channel + agent callback (optional)

For inbound messages to an AI agent:

1. Register a **MESSAGE** channel with a reachable `callback_url`
2. Your agent must accept POST with signed `message.created` payloads
3. Set `CALLBACK_SIGNING_SECRET` in `.env` (already set) and verify signatures in your agent

Example registration:

```bash
curl -X POST http://localhost:8100/register-channel \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "my-telegram-messages",
    "platform": "telegram",
    "target_chat_id": "-1001234567890",
    "credentials": { "bot_token": "YOUR_BOT_TOKEN" },
    "channel_type": "MESSAGE",
    "callback_url": "https://your-agent.example.com/hooks/messages"
  }'
```

For local callback testing use ngrok/cloudflared and put that URL in `callback_url`.

---

## 5. Production / public webhooks

Local `.env` uses:

```env
PUBLIC_WEBHOOK_URL=http://localhost:8100
```

For Dokploy/production:

1. Set `PUBLIC_WEBHOOK_URL` to your public API host (no trailing slash)
2. Point platform webhooks to `{PUBLIC_WEBHOOK_URL}/webhooks/{platform}/{channel_id}`
3. Set strong `WEBHOOK_SECRET`, `API_KEY`, `ADMIN_INTERNAL_TOKEN`, `AUTH_SECRET`
4. Route admin UI to `greenlight-ui:3000`, API to `greenlight:8100`

---

## What was already tested (automated)

| Feature | Result |
|---------|--------|
| `GET /healthz` | OK |
| Admin API rejects `X-API-Key` on `/admin/*` | 401 |
| Admin `GET /admin/v1/status` | OK (DB healthy) |
| Agent API requires `X-API-Key` | 401 without key |
| `GET /channels` with API key | OK |
| Register channel (fake Telegram token) | Stored in DB; bot start may error |
| Create prompt (fake token) | Row created; Telegram send fails `AUTH_FAILED` |
| Admin prompt history | OK |
| `GET /v1/prompts/{id}` | OK |
| Delete / unregister channel | OK |
| Admin UI dashboard loads API data | OK (channels, pending count) |
| Admin UI login page | Renders |

**Needs your real Telegram bot token** to verify: prompt delivery, button replies, send message, MESSAGE callbacks.

---

## Quick reference — env vars in `.env`

| Variable | Used by | Purpose |
|----------|---------|---------|
| `API_KEY` | API + agents + UI | Agent/curl auth (`X-API-Key`) |
| `ADMIN_INTERNAL_TOKEN` | API + UI only | Admin routes (`X-Admin-Token`) — never give to agents |
| `AUTH_SECRET` | UI only | Admin login sessions |
| `CALLBACK_SIGNING_SECRET` | API | Signs agent callbacks |
| `WEBHOOK_SECRET` | API | Platform webhook verification |
| `PUBLIC_WEBHOOK_URL` | API + UI | Webhook URL display and routing |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| UI not on :3000 | `docker compose -f docker-compose.dev.yml up -d greenlight-ui` (UI uses `PORT=3000` in compose) |
| `AuthenticationError: Unauthorized` on prompt/send | Invalid `bot_token` — use real BotFather token |
| Bot not in group | Add bot to group; confirm `target_chat_id` |
| Can't log in | Complete `/setup` or reset `admin_users` (see section 1) |
| Docker not running | Start Docker Desktop, then `docker compose -f docker-compose.dev.yml up -d --build` |
