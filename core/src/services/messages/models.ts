import { randomUUID } from 'node:crypto'
import type pg from 'pg'

export type MessageDirection = 'outbound' | 'inbound'
export type MessageSource = 'api' | 'admin'

export interface MessageRow {
  id: string
  channel_id: string
  direction: MessageDirection
  text: string
  platform: string
  from_user: string | null
  source: MessageSource | null
  platform_message_id: string | null
  created_at: Date
}

export async function createMessage(
  client: pg.PoolClient,
  input: {
    channelId: string
    direction: MessageDirection
    text: string
    platform: string
    fromUser?: string | null
    source?: MessageSource | null
    platformMessageId?: string | null
  },
): Promise<MessageRow> {
  const id = randomUUID()
  const result = await client.query<MessageRow>(
    `INSERT INTO messages (id, channel_id, direction, text, platform, from_user, source, platform_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      input.channelId,
      input.direction,
      input.text,
      input.platform,
      input.fromUser ?? null,
      input.source ?? null,
      input.platformMessageId ?? null,
    ],
  )
  return result.rows[0]!
}

export type MessageListDirection = MessageDirection | 'all'

export async function listMessages(
  client: pg.PoolClient,
  options: {
    limit: number
    channelId?: string
    direction?: MessageListDirection
  },
): Promise<MessageRow[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (options.channelId) {
    conditions.push(`channel_id = $${paramIndex++}`)
    params.push(options.channelId)
  }

  if (options.direction && options.direction !== 'all') {
    conditions.push(`direction = $${paramIndex++}`)
    params.push(options.direction)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(options.limit)

  const result = await client.query<MessageRow>(
    `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT $${paramIndex}`,
    params,
  )
  return result.rows
}

export async function getMessage(client: pg.PoolClient, id: string): Promise<MessageRow | null> {
  const result = await client.query<MessageRow>('SELECT * FROM messages WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function deleteOlderThanByDirection(
  client: pg.PoolClient,
  days: number,
  direction: MessageDirection,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH del AS (
       DELETE FROM messages
       WHERE direction = $2
         AND created_at < now() - ($1::int * interval '1 day')
       RETURNING 1
     ) SELECT count(*)::text AS c FROM del`,
    [days, direction],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function deleteOlderThan(client: pg.PoolClient, days: number): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH del AS (
       DELETE FROM messages
       WHERE created_at < now() - ($1::int * interval '1 day')
       RETURNING 1
     ) SELECT count(*)::text AS c FROM del`,
    [days],
  )
  return Number(result.rows[0]?.c ?? 0)
}
