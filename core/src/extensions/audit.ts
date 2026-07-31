import { randomUUID } from 'node:crypto'
import { withClient } from '../db/client.js'
import { licenseGate } from './license-gate.js'

export type AuditEventInput = {
  actor_type: 'api_key' | 'user' | 'system'
  actor_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
}

export type AuditEventRow = {
  id: string
  actor_type: string
  actor_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  if (!licenseGate.isEnabled('audit')) {
    return
  }

  const id = randomUUID()
  await withClient(async (client) => {
    await client.query(
      `INSERT INTO audit_events (id, actor_type, actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        event.actor_type,
        event.actor_id ?? null,
        event.action,
        event.resource_type ?? null,
        event.resource_id ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    )
  })
}

export type AuditListFilters = {
  limit: number
  cursor?: string
  action?: string
  actor_id?: string
  resource_type?: string
}

function buildFilterClause(filters: AuditListFilters): {
  where: string
  params: unknown[]
} {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.action) {
    params.push(filters.action)
    conditions.push(`action = $${params.length}`)
  }
  if (filters.actor_id) {
    params.push(filters.actor_id)
    conditions.push(`actor_id = $${params.length}`)
  }
  if (filters.resource_type) {
    params.push(filters.resource_type)
    conditions.push(`resource_type = $${params.length}`)
  }

  if (conditions.length === 0) {
    return { where: '', params }
  }
  return { where: `WHERE ${conditions.join(' AND ')}`, params }
}

export async function listAuditEvents(
  filters: AuditListFilters,
): Promise<{ events: AuditEventRow[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit, 1), 100)
  const { where, params: filterParams } = buildFilterClause(filters)

  let rows: AuditEventRow[]
  if (filters.cursor) {
    const [createdAt, id] = filters.cursor.split('|')
    const cursorParams = [...filterParams, createdAt, id, limit + 1]
    const cursorWhere = where
      ? `${where} AND (created_at, id) < ($${filterParams.length + 1}::timestamptz, $${filterParams.length + 2})`
      : `WHERE (created_at, id) < ($${filterParams.length + 1}::timestamptz, $${filterParams.length + 2})`

    const result = await withClient((client) =>
      client.query<AuditEventRow>(
        `SELECT id, actor_type, actor_id, action, resource_type, resource_id, metadata, created_at
         FROM audit_events
         ${cursorWhere}
         ORDER BY created_at DESC, id DESC
         LIMIT $${cursorParams.length}`,
        cursorParams,
      ),
    )
    rows = result.rows
  } else {
    const allParams = [...filterParams, limit + 1]
    const result = await withClient((client) =>
      client.query<AuditEventRow>(
        `SELECT id, actor_type, actor_id, action, resource_type, resource_id, metadata, created_at
         FROM audit_events
         ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT $${allParams.length}`,
        allParams,
      ),
    )
    rows = result.rows
  }

  let next_cursor: string | null = null
  if (rows.length > limit) {
    const last = rows[limit - 1]
    next_cursor = `${last.created_at}|${last.id}`
    rows = rows.slice(0, limit)
  }

  return { events: rows, next_cursor }
}

export async function streamAuditEvents(
  filters: Omit<AuditListFilters, 'cursor' | 'limit'>,
  format: 'jsonl' | 'csv',
): Promise<string> {
  const { where, params } = buildFilterClause({ ...filters, limit: 100 })
  const result = await withClient((client) =>
    client.query<AuditEventRow>(
      `SELECT id, actor_type, actor_id, action, resource_type, resource_id, metadata, created_at
       FROM audit_events
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT 10000`,
      params,
    ),
  )

  if (format === 'csv') {
    const header = 'id,created_at,actor_type,actor_id,action,resource_type,resource_id,metadata'
    const lines = result.rows.map((row) => {
      const meta = row.metadata ? JSON.stringify(row.metadata).replace(/"/g, '""') : ''
      return [
        row.id,
        row.created_at,
        row.actor_type,
        row.actor_id ?? '',
        row.action,
        row.resource_type ?? '',
        row.resource_id ?? '',
        `"${meta}"`,
      ].join(',')
    })
    return [header, ...lines].join('\n')
  }

  return result.rows.map((row) => JSON.stringify(row)).join('\n')
}
