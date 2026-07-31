import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withClient } from '../db/client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function migrateEnterprise(): Promise<void> {
  const sql = readFileSync(join(__dirname, '../db/enterprise-schema.sql'), 'utf-8')
  await withClient(async (client) => {
    await client.query(sql)
  })
}
