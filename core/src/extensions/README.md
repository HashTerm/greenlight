# Core extensions (community stubs)

Stable hook surface for enterprise code injected at **image build time** from the
private `greenlight-platform/enterprise` workspace. Community builds ship these
no-op stubs; enterprise builds replace the compiled output of this folder.

## Modules

| File | Role |
| ---- | ---- |
| `license-gate.ts` | `licenseGate.isEnabled(feature)` — always `false` in community |
| `register.ts` | `registerEnterpriseRoutes(app)`, `onEnterpriseBoot()` — no-ops in community |

## Wire points

- `api/app.ts` calls `registerEnterpriseRoutes(app)` after `/v1` routes
- `index.ts` calls `onEnterpriseBoot()` after `bootstrapApiKeyFromEnv()`

## Rules

- No imports from `greenlight-platform` in this repository
- No license server calls in community
- Keep filenames stable so inject can swap `dist/extensions/*` without touching call sites

See `docs/PLATFORM-BOUNDARIES.md` for edition boundaries.
