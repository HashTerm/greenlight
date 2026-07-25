# Contributing to Greenlight

Thanks for contributing. Greenlight is **source-available** under the
[Business Source License 1.1](LICENSE) (BUSL-1.1), not OSI open source.
By submitting a pull request, you agree that your contribution is licensed
under the same BUSL-1.1 terms as the rest of the community edition
(`core/`, `ui/`, and `docs-site/`).

Read [docs/LICENSING.md](docs/LICENSING.md) for what is free to self-host,
what is reserved for enterprise, and what uses are not allowed.

## Development setup

```bash
cp .env.example .env
# Set CALLBACK_SIGNING_SECRET, WEBHOOK_SECRET, API_KEY, ADMIN_INTERNAL_TOKEN, AUTH_SECRET

npm install
docker compose -f docker-compose.dev.yml up -d postgres
npm run dev:core    # API on :8100
npm run dev:ui      # Admin UI on :3000
```

Or run the full stack:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Tests

```bash
npm test            # core unit tests
cd ui && npm run build
```

Please add or update tests when changing behavior in `core/`.

## Pull requests

1. Fork and branch from `main`.
2. Keep changes focused and described clearly.
3. Put community features in `core/`, `ui/`, or `docs-site/` only.
4. Do **not** open PRs for proprietary enterprise or SaaS control-plane work
   in this repository — contact the Licensor for commercial licensing instead.
5. Ensure tests and (for UI) `npm run build` pass.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Questions

Open a GitHub issue for bugs and feature ideas. For commercial / enterprise
licensing, contact the Licensor (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
