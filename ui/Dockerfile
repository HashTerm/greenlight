FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY ui/package.json ./ui/
RUN npm install -w ui

COPY ui ./ui
WORKDIR /app/ui
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://botstop:botstop@postgres:5432/botstop
ENV AUTH_SECRET=build-time-placeholder-not-used-at-runtime
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/ui/.next/standalone ./
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/ui/.next/static ./ui/.next/static
COPY --from=builder /app/ui/public ./ui/public
COPY --from=builder /app/ui/drizzle ./drizzle
COPY --from=builder /app/ui/scripts ./scripts
COPY --from=builder /app/ui/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "ui/server.js"]
