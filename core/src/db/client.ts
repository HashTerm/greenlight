import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadConfig } from '../core/config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let pool: pg.Pool | null = null

function normalizeDsn(url: string): string {
  return url.replace(/^postgresql\+psycopg:/, 'postgresql:')
}

export function getPool(): pg.Pool {
  if (!pool) {
    const config = loadConfig()
    pool = new pg.Pool({ connectionString: normalizeDsn(config.DATABASE_URL) })
  }
  return pool
}

export async function withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function migrate(): Promise<void> {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  await withClient(async (client) => {
    await client.query(sql)
  })
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
