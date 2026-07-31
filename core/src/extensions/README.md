# Core extensions (community stubs)

Stable hook surface for enterprise code replaced at **licensed image build time**.
Community builds ship these no-op stubs; licensed builds replace the compiled
output of this folder.

## Modules

| File | Role |
| ---- | ---- |
| `license-gate.ts` | `licenseGate.isEnabled(feature)` — always `false` in community |
| `audit.ts` | `recordAuditEvent(event)` — no-op in community |
| `register.ts` | `registerEnterpriseRoutes(app)`, `onEnterpriseBoot()` — no-ops in community |

## Optional headers

Community routes accept these headers; licensed editions may use them for audit
actors and RBAC:

- `X-Greenlight-User-Id` — UI session user ID
- `X-Greenlight-User-Email` — UI session email for member bootstrap / role checks

## Wire points

- `api/app.ts` calls `registerEnterpriseRoutes(app)` after `/v1` routes
- `index.ts` calls `onEnterpriseBoot()` after `bootstrapApiKeyFromEnv()`

## Rules

- No proprietary platform imports in this repository
- No license server calls in community
- Keep filenames stable so licensed builds can swap `dist/extensions/*` without touching call sites

See `docs/COMMUNITY-SCOPE.md` for what belongs in this repository.
