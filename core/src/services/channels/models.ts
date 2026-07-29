import type pg from 'pg'
import type { Platform } from '../../core/platform.js'
import { credentialFingerprint, instanceKey } from '../../core/platform.js'

export interface ChannelRow {
  channel_id: string
  platform: Platform
  target_chat_id: string
  credentials: Record<string, string>
  callback_url: string | null
  is_active: boolean
  registered_at: Date
  channel_type: string
}

export function channelInstanceKey(channel: ChannelRow): string {
  return instanceKey(channel.platform, channel.credentials)
}

export async function insertChannel(
  client: pg.PoolClient,
  data: {
    channelId: string
    platform: Platform
    targetChatId: string
    credentials: Record<string, string>
    callbackUrl: string | null
    channelType: string
  },
): Promise<void> {
  await client.query(
    `INSERT INTO channels (channel_id, platform, target_chat_id, credentials, callback_url, channel_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.channelId,
      data.platform,
      data.targetChatId,
      JSON.stringify(data.credentials),
      data.callbackUrl,
      data.channelType,
    ],
  )
}

export async function updateChannel(
  client: pg.PoolClient,
  channelId: string,
  data: {
    targetChatId: string
    credentials: Record<string, string>
    callbackUrl: string | null
  },
): Promise<void> {
  await client.query(
    `UPDATE channels
     SET target_chat_id = $2,
         credentials = $3,
         callback_url = $4,
         is_active = true
     WHERE channel_id = $1`,
    [channelId, data.targetChatId, JSON.stringify(data.credentials), data.callbackUrl],
  )
}

export async function getChannel(
  client: pg.PoolClient,
  channelId: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>('SELECT * FROM channels WHERE channel_id = $1', [
    channelId,
  ])
  const row = result.rows[0]
  if (!row) return null
  return {
    ...row,
    credentials:
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }
}

export async function listActiveChannels(client: pg.PoolClient): Promise<ChannelRow[]> {
  const result = await client.query<ChannelRow>('SELECT * FROM channels WHERE is_active = true')
  return result.rows.map((row) => ({
    ...row,
    credentials:
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }))
}

export async function listChannelsFiltered(
  client: pg.PoolClient,
  filters: { platform?: Platform; channelType?: string; limit: number },
): Promise<ChannelRow[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters.platform) {
    conditions.push(`platform = $${paramIndex++}`)
    params.push(filters.platform)
  }
  if (filters.channelType) {
    conditions.push(`channel_type = $${paramIndex++}`)
    params.push(filters.channelType)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(filters.limit)
  const result = await client.query<ChannelRow>(
    `SELECT * FROM channels ${where} ORDER BY registered_at DESC LIMIT $${paramIndex}`,
    params,
  )
  return result.rows.map((row) => ({
    ...row,
    credentials:
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }))
}

export async function listAllChannels(client: pg.PoolClient): Promise<ChannelRow[]> {
  const result = await client.query<ChannelRow>(
    'SELECT * FROM channels ORDER BY registered_at DESC',
  )
  return result.rows.map((row) => ({
    ...row,
    credentials:
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }))
}

export async function deactivateChannel(client: pg.PoolClient, channelId: string): Promise<void> {
  await client.query('UPDATE channels SET is_active = false WHERE channel_id = $1', [channelId])
}

export async function findChannelByTarget(
  client: pg.PoolClient,
  platform: Platform,
  targetChatId: string,
  credFingerprint: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>(
    `SELECT * FROM channels
     WHERE platform = $1
       AND target_chat_id = $2
       AND is_active = true`,
    [platform, targetChatId],
  )

  for (const row of result.rows) {
    const credentials =
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials
    if (credentialFingerprint(platform, credentials) === credFingerprint) {
      return { ...row, credentials }
    }
  }
  return null
}
