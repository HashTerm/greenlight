<p align="center">
  <img src="ui/public/logo/greenlight-icon-trans-dark.svg" width="256" alt="Greenlight" />
</p>

<h1 align="center">Greenlight</h1>

<p align="center">
  <a href="https://github.com/markokosticdev/greenlight/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/markokosticdev/greenlight/ci.yml?branch=main" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BUSL--1.1-blue" alt="License: BUSL-1.1" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22-green?logo=node.js&logoColor=white" alt="Node >= 22" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white" alt="TypeScript 5" /></a>
  <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-4-orange" alt="Hono 4" /></a>
</p>

<p align="center">
  Self-hosted HTTP gateway that gives AI agents a human-in-the-loop line to <strong>Telegram</strong>, <strong>Slack</strong>, <strong>Microsoft Teams</strong>, <strong>Discord</strong>, <strong>Google Chat</strong>, <strong>WhatsApp</strong>, and <strong>Messenger</strong> — interactive prompts, per-channel credentials, and signed callbacks.
</p>

<p align="center">
  Platform credentials are registered per channel via API (not global env vars).
</p>

<p align="center">
  <strong>Documentation:</strong> run <code>npm run dev:docs</code> (<a href="http://localhost:3003">http://localhost:3003</a>) or see <a href="docs-site/"><code>docs-site/</code></a>.
</p>

## Features & benefits

- **Human-in-the-loop** — interactive prompts with buttons and optional free text; signed callbacks deliver answers to your agent or workflow
- **Talk to your agent in chat** — MESSAGE channels forward inbound chat to your webhook; reply with `POST /v1/messages/send`
- **Many workflows, one approval channel** — multiple automations can post prompts to the same PROMPT `channel_id`; each prompt’s answer goes to its own `callback_url`
- **Seven platforms** — Telegram, Slack, Teams, Discord, Google Chat, WhatsApp, Messenger
- **Per-channel credentials** — register bots and tokens per channel via API (not global env vars)
- **Works with your stack** — plain HTTP Agent API; n8n, Zapier, Make, custom agents — no Greenlight plugin required
- **Self-hosted** — Postgres + Docker; credentials and traffic stay on your infra

**PROMPT** channels are for outbound approvals (many workflows → one chat). **MESSAGE** channels are for ongoing conversation (one inbound `callback_url` per channel). Details: [Features & benefits](docs-site/content/getting-started/features.mdx).

## Quick start (local dev)

**Hybrid (recommended):** Postgres in Docker, apps with hot reload via npm.

```bash
npm run setup          # creates .env with generated secrets if missing,
                       # then install + Postgres + migrate
npm run dev            # core :8100, ui :3001, docs :3003
curl http://localhost:8100/healthz
```

Or create the env file alone: `npm run env:ensure` (dev) /
`npm run env:ensure -- --profile self-host`.

| Service        | URL                                          |
| -------------- | -------------------------------------------- |
| API + webhooks | http://localhost:8100                        |
| Admin UI       | http://localhost:3001                        |
| Docs           | http://localhost:3003                        |
| Postgres       | localhost:5431 (`POSTGRES_PORT` if remapped) |

**Full Docker** (no Node hot reload — smoke / demos):

```bash
npm run docker:full    # docker compose --profile full up -d --build
```

Register a channel, then send a prompt:

```bash
export API_KEY="$(grep '^API_KEY=' .env | cut -d= -f2)"

curl -X POST http://localhost:8100/v1/channels/new \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "channel_id": "my-telegram-prompts",
    "platform": "telegram",
    "target_chat_id": "-1001234567890",
    "credentials": { "bot_token": "123456789:YOUR_TOKEN" },
    "channel_type": "PROMPT"
  }'

curl -X POST http://localhost:8100/v1/prompts/new \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "channel_id": "my-telegram-prompts",
    "text": "Ready to deploy v2.4.1?",
    "options": ["Deploy", "Cancel"],
    "callback_url": "https://your-agent.example.com/on_answer"
  }'
```

Full guides: [Quickstart](docs-site/content/getting-started/quickstart.mdx), [Platforms](docs-site/content/platforms/), [API Reference](docs-site/content/api-reference/), [Configuration](docs-site/content/self-hosting/configuration.mdx).

## Supported platforms

| Platform    | Delivery                     | Credentials                                                     |
| ----------- | ---------------------------- | --------------------------------------------------------------- |
| `telegram`  | Polling (default) or webhook | `bot_token`                                                     |
| `slack`     | Webhook                      | `bot_token`, `signing_secret`                                   |
| `teams`     | Webhook                      | `app_id`, `app_password` (+ optional `app_tenant_id`)           |
| `discord`   | Webhook + Gateway            | `bot_token`, `public_key`, `application_id`                     |
| `gchat`     | Webhook                      | `service_account_json`, `google_chat_project_number`            |
| `whatsapp`  | Webhook (GET+POST)           | `access_token`, `app_secret`, `phone_number_id`, `verify_token` |
| `messenger` | Webhook (GET+POST)           | `page_access_token`, `app_secret`, `verify_token`               |

**Prompt limits:** WhatsApp and Messenger support at most **3** button options per prompt.

## Admin UI

1. Run `npm run dev` (or `npm run docker:full`)
2. Open `http://localhost:3001/setup` to create the super admin
3. Sign in at `/login` — manage channels, prompts, messages, and retention settings

Telegram walkthrough: [Quickstart](docs-site/content/getting-started/quickstart.mdx) and
[Telegram](docs-site/content/platforms/telegram.mdx). Canonical product docs live in `docs-site/`.

## Repository layout

```
core/       — Hono API gateway (port 8100)
ui/         — Next.js admin app (port 3001)
docs-site/  — Product documentation (Nextra, port 3003)
```

## Useful npm scripts

| Script                            | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `npm run setup`                   | First-time: `.env`, install, Postgres, migrate |
| `npm run dev`                     | Hybrid: infra + core + ui + docs               |
| `npm run infra:up` / `infra:down` | Start/stop Postgres only                       |
| `npm run infra:reset`             | Wipe Postgres volume                           |
| `npm run db:migrate`              | Apply UI `admin_users` migration               |
| `npm run docker:full`             | Full containerized stack                       |
| `npm run docker:full:down`        | Stop full stack                                |

## Self-host / Dokploy / Coolify

```bash
# Self-host: docker-compose.self-host.yml
# Swarm: add -c docker-compose.self-host.stack.yml — see docs-site Self-Hosting
npm run env:ensure -- --profile self-host
docker compose -f docker-compose.self-host.yml --env-file .env.self-host up -d
```

**Dokploy domains** (same host, API under path prefix):

| Service         | Port | Traefik path | Public URL example                     |
| --------------- | ---- | ------------ | -------------------------------------- |
| `greenlight-ui` | 3000 | `/`          | `https://greenlight.hashterm.com/`     |
| `greenlight`    | 8100 | `/wh`        | `https://greenlight.hashterm.com/wh/*` |

API path in Dokploy must be `/wh` (leading slash required). Traefik strips `/wh` when forwarding to core.

```env
AUTH_URL=https://greenlight.hashterm.com
PUBLIC_WEBHOOK_URL=https://greenlight.hashterm.com/wh
```

**Internal health only** (container probes — not public Traefik routes):

| Service         | Internal URL                       |
| --------------- | ---------------------------------- |
| `greenlight-ui` | `http://127.0.0.1:3000/api/health` |
| `greenlight`    | `http://127.0.0.1:8100/healthz`    |

`/wh/healthz` is **not** valid — API health is not under the webhook path prefix.

Full deploy guide: [Dokploy](docs-site/content/self-hosting/dokploy.mdx), [Coolify](docs-site/content/self-hosting/coolify.mdx), [Configuration](docs-site/content/self-hosting/configuration.mdx).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Greenlight is **source-available** under the [Business Source License 1.1](LICENSE)
(BUSL-1.1) — **not** an OSI-approved open source license.

|                                       | Community (`core/`, `ui/`, `docs-site/`) | Enterprise                                              |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Location                              | This repository                          | Commercial license from the Licensor (not in this repo) |
| License                               | BUSL-1.1                                 | Proprietary                                             |
| Self-host                             | Yes                                      | Paid license only (when available)                      |
| Sell as competing hosted subscription | **No**                                   | **No**                                                  |

Details: [docs/LICENSING.md](docs/LICENSING.md) and [docs-site Legal](docs-site/content/legal/licensing.mdx).
