# Greenlight Docs Site

Public **documentation site** for Greenlight: guides, self-host setup, and API
reference. This is a workspace inside the community monorepo (`core/`, `ui/`,
`docs-site/`).

## Status

Placeholder only — no app scaffold yet.

## Intended stack (later)

- Next.js docs generator such as **Fumadocs** or **Nextra**
- MDX for guides
- OpenAPI from `../core` for the API reference (Scalar / similar)

## Content sources

- Guides: MDX in this workspace
- API: generated from OpenAPI exported by the community gateway (`../core`)
- Keep the monorepo root `README.md` as a short quickstart that points here

## Develop

```bash
# from monorepo root
npm install
npm run dev:docs
```
