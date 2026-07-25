import fs from 'node:fs'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = fs.readFileSync(
  new URL('../drizzle/migrations/0000_admin_users.sql', import.meta.url),
  'utf8',
)
const client = postgres(url, { max: 1 })
await client.unsafe(sql)
await client.end()
console.log('Admin users migration applied')
