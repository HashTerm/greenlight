#!/usr/bin/env node
/**
 * Wait until Postgres accepts TCP connections on the host port.
 * Reads POSTGRES_PORT or parses DATABASE_URL from process.env / .env via --env-file.
 */
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

function resolvePort() {
  if (process.env.POSTGRES_PORT) {
    return Number(process.env.POSTGRES_PORT);
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.port) return Number(parsed.port);
      return 5432;
    } catch {
      /* ignore */
    }
  }
  return 5432;
}

const host = "127.0.0.1";
const port = resolvePort();
const timeoutMs = Number(process.env.POSTGRES_WAIT_TIMEOUT_MS ?? 60_000);
const intervalMs = 500;
const deadline = Date.now() + timeoutMs;

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  process.stdout.write(
    `Waiting for Postgres at ${host}:${port} (timeout ${timeoutMs}ms)…\n`,
  );
  while (Date.now() < deadline) {
    if (await tryConnect()) {
      process.stdout.write(`Postgres is ready on ${host}:${port}\n`);
      return;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.error(
    `Timed out waiting for Postgres at ${host}:${port}. Is Docker running? Try: npm run infra:up`,
  );
  process.exit(1);
}

main();
