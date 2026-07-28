# Greenlight Docs Site

Public documentation for Greenlight: getting started, self-hosting, platform
guides, agent integration, and API reference.

Built with [Nextra 4](https://nextra.site) and Next.js App Router.

## Develop

```bash
# from monorepo root
npm install
npm run dev:docs
```

Docs run on **http://localhost:3003** (admin UI on `:3001`).

## Content

MDX lives in `content/`. Sidebar order is controlled by `_meta.ts` files.

## OpenAPI

```bash
npm run sync:openapi -w docs-site
```

Copies the enriched OpenAPI document from `core` into `public/openapi.json`.
This runs automatically on `npm run build`.

## Stack

- Nextra 4 + `nextra-theme-docs`
- Next.js 15 App Router
- MDX content in `content/`
- OpenAPI from `../core`
