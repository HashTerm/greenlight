import { randomUUID } from 'node:crypto'
import type pg from 'pg'

export type MessageDirection = 'outbound' | 'inbound'

export interface MessageRow {
  id: string
  organization_id: string
  channel_id: string
  direction: MessageDirection
  text: string
  platform: string
  from_user: string | null
  api_key_id: string | null
  platform_message_id: string | null
  created_at: Date
}

export async function createMessage(
  client: pg.PoolClient,
  input: {
    organizationId: string
    channelId: string
    direction: MessageDirection
    text: string
    platform: string
    fromUser?: string | null
    apiKeyId?: string | null
    platformMessageId?: string | null
  },
): Promise<MessageRow> {
  const id = randomUUID()
  const result = await client.query<MessageRow>(
    `INSERT INTO messages (id, organization_id, channel_id, direction, text, platform, from_user, api_key_id, platform_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.organizationId,
      input.channelId,
      input.direction,
      input.text,
      input.platform,
      input.fromUser ?? null,
      input.apiKeyId ?? null,
      input.platformMessageId ?? null,
    ],
  )
  return result.rows[0]!
}

export type MessageListDirection = MessageDirection | 'all'

export async function listMessages(
  client: pg.PoolClient,
  organizationId: string,
  options: {
    limit: number
    channelId?: string
    direction?: MessageListDirection
  },
): Promise<MessageRow[]> {
  const conditions: string[] = ['organization_id = $1']
  const params: unknown[] = [organizationId]
  let paramIndex = 2

  if (options.channelId) {
    conditions.push(`channel_id = $${paramIndex++}`)
    params.push(options.channelId)
  }

  if (options.direction && options.direction !== 'all') {
    conditions.push(`direction = $${paramIndex++}`)
    params.push(options.direction)
  }

  params.push(options.limit)

  const result = await client.query<MessageRow>(
    `SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIndex}`,
    params,
  )
  return result.rows
}

export async function getMessage(
  client: pg.PoolClient,
  organizationId: string,
  id: string,
): Promise<MessageRow | null> {
  const result = await client.query<MessageRow>(
    'SELECT * FROM messages WHERE organization_id = $1 AND id = $2',
    [organizationId, id],
  )
  return result.rows[0] ?? null
}

export async function deleteOlderThanByDirection(
  client: pg.PoolClient,
  organizationId: string,
  days: number,
  direction: MessageDirection,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH del AS (
       DELETE FROM messages
       WHERE organization_id = $3
         AND direction = $2
         AND created_at < now() - ($1::int * interval '1 day')
       RETURNING 1
     ) SELECT count(*)::text AS c FROM del`,
    [days, direction, organizationId],
  )
  return Number(result.rows[0]?.c ?? 0)
}
