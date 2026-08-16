import type pg from 'pg'
import type { Platform } from '../../core/platform.js'
import { credentialFingerprint, instanceKey } from '../../core/platform.js'

export interface ChannelRow {
  organization_id: string
  channel_id: string
  platform: Platform
  target_chat_id: string
  credentials: Record<string, string>
  callback_url: string | null
  callback_headers: Record<string, string> | null
  callback_data: unknown | null
  is_active: boolean
  registered_at: Date
  channel_type: string
}

function parseCallbackHeaders(value: unknown): Record<string, string> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, string>
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, string>
  }
  return null
}

function parseChannelRow(row: ChannelRow): ChannelRow {
  return {
    ...row,
    credentials:
      typeof row.credentials === 'string'
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
    callback_headers: parseCallbackHeaders(row.callback_headers),
    callback_data: row.callback_data ?? null,
  }
}

export function channelInstanceKey(channel: ChannelRow): string {
  return instanceKey(channel.platform, channel.credentials)
}

export async function insertChannel(
  client: pg.PoolClient,
  data: {
    organizationId: string
    channelId: string
    platform: Platform
    targetChatId: string
    credentials: Record<string, string>
    callbackUrl: string | null
    callbackHeaders: Record<string, string> | null
    callbackData: unknown | null
    channelType: string
  },
): Promise<void> {
  await client.query(
    `INSERT INTO channels (
       organization_id, channel_id, platform, target_chat_id, credentials,
       callback_url, callback_headers, callback_data, channel_type
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
    [
      data.organizationId,
      data.channelId,
      data.platform,
      data.targetChatId,
      JSON.stringify(data.credentials),
      data.callbackUrl,
      data.callbackHeaders !== null ? JSON.stringify(data.callbackHeaders) : null,
      data.callbackData !== null ? JSON.stringify(data.callbackData) : null,
      data.channelType,
    ],
  )
}

export async function updateChannel(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  data: {
    targetChatId: string
    credentials: Record<string, string>
    callbackUrl: string | null
    callbackHeaders: Record<string, string> | null
    callbackData: unknown | null
  },
): Promise<void> {
  await client.query(
    `UPDATE channels
     SET target_chat_id = $3,
         credentials = $4,
         callback_url = $5,
         callback_headers = $6::jsonb,
         callback_data = $7::jsonb,
         is_active = true
     WHERE organization_id = $1 AND channel_id = $2`,
    [
      organizationId,
      channelId,
      data.targetChatId,
      JSON.stringify(data.credentials),
      data.callbackUrl,
      data.callbackHeaders !== null ? JSON.stringify(data.callbackHeaders) : null,
      data.callbackData !== null ? JSON.stringify(data.callbackData) : null,
    ],
  )
}

export async function getChannel(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>(
    'SELECT * FROM channels WHERE organization_id = $1 AND channel_id = $2',
    [organizationId, channelId],
  )
  const row = result.rows[0]
  return row ? parseChannelRow(row) : null
}

export async function listActiveChannels(client: pg.PoolClient): Promise<ChannelRow[]> {
  const result = await client.query<ChannelRow>('SELECT * FROM channels WHERE is_active = true')
  return result.rows.map(parseChannelRow)
}

export async function listChannelsFiltered(
  client: pg.PoolClient,
  organizationId: string,
  filters: { platform?: Platform; channelType?: string; limit: number },
): Promise<ChannelRow[]> {
  const conditions: string[] = ['organization_id = $1']
  const params: unknown[] = [organizationId]
  let paramIndex = 2

  if (filters.platform) {
    conditions.push(`platform = $${paramIndex++}`)
    params.push(filters.platform)
  }
  if (filters.channelType) {
    conditions.push(`channel_type = $${paramIndex++}`)
    params.push(filters.channelType)
  }

  params.push(filters.limit)
  const result = await client.query<ChannelRow>(
    `SELECT * FROM channels WHERE ${conditions.join(' AND ')} ORDER BY registered_at DESC LIMIT $${paramIndex}`,
    params,
  )
  return result.rows.map(parseChannelRow)
}

export async function deactivateChannel(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
): Promise<void> {
  await client.query(
    'UPDATE channels SET is_active = false WHERE organization_id = $1 AND channel_id = $2',
    [organizationId, channelId],
  )
}

export async function findChannelByTarget(
  client: pg.PoolClient,
  organizationId: string,
  platform: Platform,
  targetChatId: string,
  credFingerprint: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>(
    `SELECT * FROM channels
     WHERE organization_id = $1
       AND platform = $2
       AND target_chat_id = $3
       AND is_active = true`,
    [organizationId, platform, targetChatId],
  )

  for (const row of result.rows) {
    const parsed = parseChannelRow(row)
    if (credentialFingerprint(platform, parsed.credentials) === credFingerprint) {
      return parsed
    }
  }
  return null
}

/** Resolve inbound chat traffic when organization_id is not in the thread id. */
export async function findChannelByTargetAndFingerprint(
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
    const parsed = parseChannelRow(row)
    if (credentialFingerprint(platform, parsed.credentials) === credFingerprint) {
      return parsed
    }
  }
  return null
}
