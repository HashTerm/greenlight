# Changelog

## Unreleased

### Breaking

- **Multi-tenant row-level `organization_id`:** All tenant tables (`channels`, `prompts`, `messages`, `api_keys`, `app_settings`) require `organization_id NOT NULL`. Self-host uses org id `default`.
- **Webhook URLs:** Platform webhooks are only accepted at `/webhooks/{organization_id}/{platform}/{channel_id}`. The old `/webhooks/{platform}/{channel_id}` path returns 404. Re-register all channel webhooks after upgrade.
- **API keys:** Keys without `organization_id` are rejected. Run the schema migration or reset the database.
- **`API_KEY` removed:** Use `GREENLIGHT_API_KEY` for core bootstrap and Admin UI. Rename in `.env` and Compose before upgrade.
- **Settings:** `app_settings` is keyed by `organization_id` (no singleton `id=1` row).

### Added

- Org context middleware: every `/v1/*` route scopes queries to the API key's `organization_id`.
- `X-Greenlight-Org-Id` header from UI (self-host: `default`; cloud: active org UUID).
- Cloud control plane MVP skeleton: org create, tenant provision, scoped API key issuance (commercial offering).
- `cloud/docs/TENANCY.md` documents the shared-gateway tenancy model.
