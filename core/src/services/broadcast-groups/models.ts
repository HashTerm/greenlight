import { randomUUID } from 'node:crypto'
import type pg from 'pg'

export type BroadcastGroupKind = 'prompt' | 'message'

export interface BroadcastGroupRow {
  organization_id: string
  broadcast_group_id: string
  name: string
  kind: BroadcastGroupKind
  prompt_answer_mode: string
  created_at: Date
  updated_at: Date
}

export interface BroadcastGroupWithChannels extends BroadcastGroupRow {
  channel_ids: string[]
}

export function newBroadcastGroupId(): string {
  return `brg_${randomUUID()}`
}

export async function listBroadcastGroups(
  client: pg.PoolClient,
  organizationId: string,
  limit: number,
  kind?: BroadcastGroupKind | null,
): Promise<BroadcastGroupWithChannels[]> {
  const kindClause = kind ? ' AND kind = $2' : ''
  const params: unknown[] = [organizationId]
  if (kind) params.push(kind)
  params.push(limit)

  const result = await client.query<BroadcastGroupRow>(
    `SELECT * FROM broadcast_groups
     WHERE organization_id = $1${kindClause}
     ORDER BY updated_at DESC
     LIMIT $${params.length}`,
    params,
  )

  const groups: BroadcastGroupWithChannels[] = []
  for (const row of result.rows) {
    const channelIds = await getGroupChannelIds(client, organizationId, row.broadcast_group_id)
    groups.push({ ...row, channel_ids: channelIds })
  }
  return groups
}

export async function getBroadcastGroup(
  client: pg.PoolClient,
  organizationId: string,
  broadcastGroupId: string,
): Promise<BroadcastGroupWithChannels | null> {
  const result = await client.query<BroadcastGroupRow>(
    `SELECT * FROM broadcast_groups
     WHERE organization_id = $1 AND broadcast_group_id = $2`,
    [organizationId, broadcastGroupId],
  )
  const row = result.rows[0]
  if (!row) return null

  const channelIds = await getGroupChannelIds(client, organizationId, broadcastGroupId)
  return { ...row, channel_ids: channelIds }
}

async function getGroupChannelIds(
  client: pg.PoolClient,
  organizationId: string,
  broadcastGroupId: string,
): Promise<string[]> {
  const result = await client.query<{ channel_id: string }>(
    `SELECT channel_id FROM broadcast_group_channels
     WHERE organization_id = $1 AND broadcast_group_id = $2
     ORDER BY channel_id`,
    [organizationId, broadcastGroupId],
  )
  return result.rows.map((r) => r.channel_id)
}

export async function createBroadcastGroup(
  client: pg.PoolClient,
  input: {
    organizationId: string
    broadcastGroupId: string
    name: string
    kind: BroadcastGroupKind
    channelIds: string[]
    promptAnswerMode?: string | null
  },
): Promise<BroadcastGroupWithChannels> {
  const promptAnswerMode =
    input.kind === 'prompt' ? (input.promptAnswerMode ?? 'first_answer') : 'first_answer'

  await client.query(
    `INSERT INTO broadcast_groups (organization_id, broadcast_group_id, name, kind, prompt_answer_mode)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.organizationId, input.broadcastGroupId, input.name, input.kind, promptAnswerMode],
  )

  for (const channelId of input.channelIds) {
    await client.query(
      `INSERT INTO broadcast_group_channels (organization_id, broadcast_group_id, channel_id)
       VALUES ($1, $2, $3)`,
      [input.organizationId, input.broadcastGroupId, channelId],
    )
  }

  const group = await getBroadcastGroup(client, input.organizationId, input.broadcastGroupId)
  return group!
}

export async function updateBroadcastGroup(
  client: pg.PoolClient,
  input: {
    organizationId: string
    broadcastGroupId: string
    name: string
    channelIds: string[]
    promptAnswerMode?: string | null
  },
): Promise<BroadcastGroupWithChannels | null> {
  const existing = await getBroadcastGroup(client, input.organizationId, input.broadcastGroupId)
  if (!existing) return null

  const promptAnswerMode =
    existing.kind === 'prompt'
      ? (input.promptAnswerMode ?? existing.prompt_answer_mode)
      : existing.prompt_answer_mode

  await client.query(
    `UPDATE broadcast_groups
     SET name = $3, prompt_answer_mode = $4, updated_at = now()
     WHERE organization_id = $1 AND broadcast_group_id = $2`,
    [input.organizationId, input.broadcastGroupId, input.name, promptAnswerMode],
  )

  await client.query(
    `DELETE FROM broadcast_group_channels
     WHERE organization_id = $1 AND broadcast_group_id = $2`,
    [input.organizationId, input.broadcastGroupId],
  )

  for (const channelId of input.channelIds) {
    await client.query(
      `INSERT INTO broadcast_group_channels (organization_id, broadcast_group_id, channel_id)
       VALUES ($1, $2, $3)`,
      [input.organizationId, input.broadcastGroupId, channelId],
    )
  }

  return getBroadcastGroup(client, input.organizationId, input.broadcastGroupId)
}

export async function deleteBroadcastGroup(
  client: pg.PoolClient,
  organizationId: string,
  broadcastGroupId: string,
): Promise<boolean> {
  const result = await client.query(
    `DELETE FROM broadcast_groups
     WHERE organization_id = $1 AND broadcast_group_id = $2`,
    [organizationId, broadcastGroupId],
  )
  return (result.rowCount ?? 0) > 0
}
