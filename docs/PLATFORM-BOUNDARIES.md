# Platform boundaries

Where community code ends and commercial code lives. For full diagrams and
build/licensing flow, see `greenlight-platform/ARCHITECTURE.md` in the private
platform monorepo (same umbrella workspace).

## This repository (`greenlight`)

| Package | Role |
| ------- | ---- |
| `core/` | Gateway API, webhooks, Postgres schema for community features |
| `ui/` | Admin UI for single-tenant self-host |
| `docs-site/` | Public product documentation |

**In scope:** BUSL community edition, extension-friendly hooks (when added),
single implicit tenant, scoped API keys.

**Out of scope:** License enforcement, SSO, multi-org UI, Stripe, cloud
provisioning, enterprise-only audit exports.

## Private `greenlight-platform`

| Workspace | Role |
| --------- | ---- |
| `enterprise/` | Enterprise **source** (private). Injected into the **single** `greenlight` image at build. **No separate enterprise image.** License unlocks features at runtime. |
| License server (planned) | Issue and verify enterprise licenses |
| `cloud/` | Hosted **control plane** — billing, subscriptions, organisations, tenant lifecycle |
| `website/` | Marketing site |

## Enterprise delivery model

```text
community source (public)  +  enterprise source (private)
              ↓ inject at build
         one greenlight image
              ↓ deploy + license
    community-only OR enterprise-enabled
```

We do **not** publish `greenlight-enterprise` as a separate container image.

## Rules

1. Community never imports platform code.
2. Platform build pipeline uses community sources / published artifacts (no `file:../greenlight` in git).
3. Without a valid license, enterprise code paths stay inactive (community behavior).
4. Cloud owns org/billing; gateway owns prompts/channels/messages.

## Docs split

- **Product / integrators** → public `greenlight/docs-site`
- **Platform builders** → `greenlight-platform/ARCHITECTURE.md`
- **Roadmap / staged work** → `greenlight-platform/plans/` (private monorepo only — not in the public repository)
