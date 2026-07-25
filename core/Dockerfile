FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./dist/db/schema.sql

ENV NODE_ENV=production
EXPOSE 8100

CMD ["node", "dist/index.js"]
