# Greenlight

Self-hosted HTTP gateway that gives AI agents a human-in-the-loop line to **Telegram**, **Slack**, **Microsoft Teams**, **Discord**, **Google Chat**, **WhatsApp**, and **Messenger** — interactive prompts, per-agent channels, and signed callbacks.

Built with [Chat SDK](https://chat-sdk.dev/). Platform credentials are registered per channel via API (not global env vars).

## Quick start (local dev)

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, CALLBACK_SIGNING_SECRET, WEBHOOK_SECRET

docker compose -f docker-compose.dev.yml up -d --build
curl http://localhost:8100/healthz
```

Register a channel, then send a prompt:

```bash
# Register a Telegram prompt channel
curl -X POST http://localhost:8100/register-channel \
  -H 'Content-Type: application/json' \
  -d '{
    "channel_id": "my-telegram-prompts",
    "platform": "telegram",
    "target_chat_id": "-1001234567890",
    "credentials": { "bot_token": "123456789:YOUR_TOKEN" },
    "channel_type": "PROMPT"
  }'

curl -X POST http://localhost:8100/v1/prompts \
  -H 'Content-Type: application/json' \
  -d '{
    "channel_id": "my-telegram-prompts",
    "text": "Ready to deploy v2.4.1?",
    "options": ["Deploy", "Cancel"],
    "callback_url": "https://your-agent.example.com/on_answer"
  }'
```

## Supported platforms

| Platform | Delivery | Credentials |
|----------|----------|-------------|
| `telegram` | Polling (default) or webhook | `bot_token` |
| `slack` | Webhook | `bot_token`, `signing_secret` |
| `teams` | Webhook | `app_id`, `app_password` (+ optional `app_tenant_id`) |
| `discord` | Webhook + Gateway | `bot_token`, `public_key`, `application_id` |
| `gchat` | Webhook | `service_account_json`, `google_chat_project_number` |
| `whatsapp` | Webhook (GET+POST) | `access_token`, `app_secret`, `phone_number_id`, `verify_token` |
| `messenger` | Webhook (GET+POST) | `page_access_token`, `app_secret`, `verify_token` |

**Prompt limits:** WhatsApp and Messenger support at most **3** button options per prompt.

## Register channel

Single schema for all platforms — `platform` is required:

```json
{
  "channel_id": "ops-slack",
  "platform": "slack",
  "target_chat_id": "C01234567",
  "credentials": {
    "bot_token": "xoxb-...",
    "signing_secret": "..."
  },
  "callback_url": "https://agent.example/on_message",
  "channel_type": "MESSAGE"
}
```

`MESSAGE` channels require `callback_url`. `PROMPT` channels do not.

### Google Chat

```json
{
  "channel_id": "ops-gchat",
  "platform": "gchat",
  "target_chat_id": "spaces/AAAA",
  "credentials": {
    "service_account_json": "{\"type\":\"service_account\",...}",
    "google_chat_project_number": "123456789"
  },
  "channel_type": "PROMPT"
}
```

`service_account_json` is the full GCP service account key file contents as a JSON string. `google_chat_project_number` is the GCP project **number** (not project ID).

### WhatsApp

```json
{
  "channel_id": "support-wa",
  "platform": "whatsapp",
  "target_chat_id": "15551234567",
  "credentials": {
    "access_token": "...",
    "app_secret": "...",
    "phone_number_id": "...",
    "verify_token": "my-verify-secret"
  },
  "callback_url": "https://agent.example/hook",
  "channel_type": "MESSAGE"
}
```

`target_chat_id` is the user's WhatsApp ID (phone number without `+`).

### Messenger

```json
{
  "channel_id": "support-fb",
  "platform": "messenger",
  "target_chat_id": "27161130920158013",
  "credentials": {
    "page_access_token": "...",
    "app_secret": "...",
    "verify_token": "my-verify-secret"
  },
  "callback_url": "https://agent.example/hook",
  "channel_type": "MESSAGE"
}
```

`target_chat_id` is the recipient Page-Scoped ID (PSID).

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/prompts` | Create and send a prompt |
| `POST` | `/v1/prompts/upload` | Create prompt with file attachment |
| `GET` | `/v1/prompts/pending` | List unanswered prompts |
| `GET` | `/v1/prompts/{id}` | Get prompt by ID (`%23123` for `#123`) |
| `POST` | `/register-channel` | Register a channel |
| `POST` | `/send` | Send message via channel |
| `GET` | `/channels` | List active channels |
| `DELETE` | `/channels/{id}` | Unregister channel |
| `GET` | `/healthz` | Health check |
| `GET` | `/webhooks/{platform}/{channelId}` | Meta webhook verification (whatsapp, messenger) |
| `POST` | `/webhooks/{platform}/{channelId}` | Platform webhook endpoint |

Platforms: `telegram`, `slack`, `teams`, `discord`, `gchat`, `whatsapp`, `messenger`.

## Callbacks

- **Prompt answers** (`callback_url` on `/v1/prompts`) are signed with HMAC `X-Signature: sha256=...`
- **Channel messages** use unified `message.created` events (unsigned JSON):

```json
{
  "type": "message.created",
  "platform": "slack",
  "channel_id": "ops-slack",
  "from": "alice",
  "text": "Looks good"
}
```

## Webhooks

Set `PUBLIC_WEBHOOK_URL` to your public HTTPS base URL. Each registered channel uses:

```
{PUBLIC_WEBHOOK_URL}/webhooks/{platform}/{channel_id}
```

- **Telegram**: Greenlight calls `setWebhook` automatically when `PUBLIC_WEBHOOK_URL` is set; otherwise uses long polling.
- **Slack**: Configure Event Subscriptions Request URL in your Slack app.
- **Teams**: Set the bot messaging endpoint in Azure Bot registration.
- **Discord**: Set Interactions Endpoint URL in the developer portal; Greenlight starts a Gateway listener when `PUBLIC_WEBHOOK_URL` is set.
- **Google Chat**: Set App URL in the Chat API configuration (and Pub/Sub push endpoint if using Workspace Events).
- **WhatsApp / Messenger**: Set Callback URL in Meta app settings; `verify_token` in credentials must match what you enter in Meta.

Optional: set `DEFAULT_PROMPT_CHANNEL_ID` so prompts can omit `channel_id`.

## Admin UI

Both compose files include the optional **greenlight-ui** admin app at `http://localhost:3000`.

1. Start the stack: `docker compose -f docker-compose.dev.yml up -d --build`
2. Open `http://localhost:3000/setup` to create the super admin (first visit)
3. Sign in at `/login` — manage channels, prompts, and dashboard stats

**Manual steps (Telegram bot, chat ID, production webhooks):** see [docs/USER_SETUP.md](docs/USER_SETUP.md).
Licensing (self-host vs SaaS vs enterprise): see [docs/LICENSING.md](docs/LICENSING.md).

The UI talks to the core API via server-side BFF calls:
- **Agent API** (`X-API-Key`) — register channels, send messages, create prompts
- **Admin API** (`X-Admin-Token`) — deep health, prompt history (never give this token to agents)

### API-only production

To run without the admin UI, remove the `greenlight-ui` service block from `docker-compose.yml` and omit `ADMIN_INTERNAL_TOKEN` on `greenlight`. The gateway on port `8100` is unchanged.

## Repository layout

```
core/       — Hono API gateway (port 8100)
ui/         — Next.js admin app (port 3000)
docs-site/  — Product docs site (placeholder; Fumadocs/Nextra later)
```

## Docker / Dokploy

### Development (`docker-compose.dev.yml`)

```bash
cp .env.example .env
# Set API_KEY, ADMIN_INTERNAL_TOKEN, AUTH_SECRET for UI + admin API
docker compose -f docker-compose.dev.yml up -d --build
```

Services: `greenlight` (:8100), `greenlight-ui` (:3000), `postgres` (:5432).

### Production (`docker-compose.yml`)

1. Create a **Compose** app in Dokploy pointing at this repo
2. Paste variables from [`.env.production.example`](.env.production.example)
3. Route API + webhooks to `greenlight:8100`; route admin UI to `greenlight-ui:3000`
4. Register channels via API after deploy

## Local development (without Docker app container)

```bash
npm install
cp .env.example .env
# DATABASE_URL=postgresql://greenlight:greenlight@localhost:5432/greenlight

docker compose -f docker-compose.dev.yml up -d postgres greenlight
npm run dev:core    # API on :8100
npm run dev:ui      # Admin UI on :3000 (in another terminal)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Greenlight is **source-available** under the [Business Source License 1.1](LICENSE)
(BUSL-1.1) — **not** an OSI-approved open source license.

| | Community (`core/`, `ui/`, `docs-site/`) | Enterprise |
|--|---------------------------|------------|
| Location | This repository | Commercial license from the Licensor (not in this repo) |
| License | BUSL-1.1 | Proprietary |
| Self-host | Yes | Paid license only (when available) |
| Sell as competing hosted subscription | **No** | **No** |

After the Change Date (see [NOTICE](NOTICE)), each community version becomes
available under Apache License 2.0.

Details and FAQ: [docs/LICENSING.md](docs/LICENSING.md).
