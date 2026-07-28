#!/usr/bin/env node
/**
 * Wait until Postgres accepts connections using DATABASE_URL credentials.
 * Reads POSTGRES_PORT or parses DATABASE_URL from process.env / .env via --env-file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()

function resolvePort() {
  if (process.env.POSTGRES_PORT) {
    return Number(process.env.POSTGRES_PORT)
  }
  const url = process.env.DATABASE_URL
  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.port) return Number(parsed.port)
      return 5432
    } catch {
      /* ignore */
    }
  }
  return 5431
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const port = resolvePort()
const timeoutMs = Number(process.env.POSTGRES_WAIT_TIMEOUT_MS ?? 60_000)
const intervalMs = 500
const deadline = Date.now() + timeoutMs
let lastAuthError = ''

function formatAuthHint() {
  if (!lastAuthError.includes('role') && !lastAuthError.includes('password')) {
    return ''
  }
  return `
If port ${port} is already used by another Postgres on your machine, set a different POSTGRES_PORT in .env
and update DATABASE_URL to match, then run: npm run infra:reset && npm run infra:up`
}

async function tryConnect() {
  const client = postgres(url, { max: 1, connect_timeout: 2 })
  try {
    await client`select 1 as ok`
    await client.end({ timeout: 1 })
    return true
  } catch (error) {
    lastAuthError = error instanceof Error ? error.message : String(error)
    try {
      await client.end({ timeout: 1 })
    } catch {
      /* ignore */
    }
    return false
  }
}

async function main() {
  process.stdout.write(`Waiting for Postgres at 127.0.0.1:${port} (timeout ${timeoutMs}ms)…\n`)
  while (Date.now() < deadline) {
    if (await tryConnect()) {
      process.stdout.write(`Postgres is ready on 127.0.0.1:${port}\n`)
      return
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  console.error(
    `Timed out waiting for Postgres at 127.0.0.1:${port}.${lastAuthError ? ` Last error: ${lastAuthError}` : ''}
Is Docker running? Try: npm run infra:up${formatAuthHint()}`,
  )
  process.exit(1)
}

main()
