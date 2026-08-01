FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/theme/package.json ./packages/theme/
COPY docs-site/package.json ./docs-site/
COPY core/package.json ./core/
RUN npm install -w docs-site

# build:docker runs scripts/sync-openapi.mjs against this file.
COPY core/src/api/openapi.ts ./core/src/api/openapi.ts
COPY packages/theme ./packages/theme
COPY docs-site ./docs-site

WORKDIR /app/docs-site
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders baked into the client bundle at image build (override at runtime via compose).
ENV NEXT_PUBLIC_DOCS_URL=http://localhost:3003
ENV NEXT_PUBLIC_WEBSITE_URL=http://localhost:3002
RUN npm run build:docker

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/docs-site/.next/standalone ./
COPY --from=builder /app/docs-site/.next/static ./docs-site/.next/static
COPY --from=builder /app/docs-site/public ./docs-site/public

EXPOSE 3003

CMD ["node", "docs-site/server.js"]
