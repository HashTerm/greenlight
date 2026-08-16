# Community scope

What this repository contains and what belongs elsewhere.

## In this repository

| Package      | Role                                                          |
| ------------ | ------------------------------------------------------------- |
| `core/`      | Gateway API, webhooks, Postgres schema for community features |
| `ui/`        | Admin UI for single-tenant self-host                          |
| `docs-site/` | Public product documentation                                  |

**In scope:** BUSL community edition, extension hooks in `core/src/extensions/`,
single implicit tenant, scoped API keys, API-only inline multi-channel fan-out
(`broadcast_group` on send routes).

**Enterprise (commercial):** saved broadcast groups, group CRUD API, and Broadcast
Groups admin UI — see [Broadcast Groups](docs-site/content/guides/broadcast-groups.mdx).

## Extension hooks (`core/src/extensions/`)

Community ships **no-op stubs** that licensed builds replace at image build time:

| Module            | Community behavior                                    |
| ----------------- | ----------------------------------------------------- |
| `license-gate.ts` | `licenseGate.isEnabled()` always `false`              |
| `audit-log.ts`        | `recordAuditEvent(event)` — no-op in community        |
| `register.ts`     | `registerEnterpriseRoutes`, `onEnterpriseBoot` no-ops |

Optional headers (community accepts; licensed editions may use them):

- `X-Greenlight-User-Id` — UI session user for audit actor attribution
- `X-Greenlight-User-Email` — member bootstrap / role checks

Wire points: `api/app.ts`, `index.ts`. See `core/src/extensions/README.md`.

**Out of scope in this repo:** License verification, SSO, multi-org UI, Stripe,
cloud provisioning, and other commercial-only features.

## Rules

1. This repository does not import proprietary platform code.
2. Community edition is single-tenant self-host with instance-scoped API keys.
3. Enterprise and Cloud are separate commercial offerings — see [Editions](docs-site/content/getting-started/editions.mdx) and [Licensing](LICENSING.md).

## Further reading

- [Editions & admin identity](docs-site/content/getting-started/editions.mdx) — Community vs Enterprise vs Cloud (product level)
- [Licensing](LICENSING.md) — BUSL, what you may do, commercial editions
