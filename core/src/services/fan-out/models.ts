import type pg from 'pg'
import { PENDING, ANSWERED, BATCH_COLLECTING } from '../prompts/models.js'

const EXPIRED = 'EXPIRED'

export type FanOutKind = 'prompt' | 'message'

export interface FanOutSummaryRow {
  broadcast_batch_id: string
  kind: FanOutKind
  text: string
  correlation_id: string | null
  broadcast_group_id: string | null
  broadcast_batch_status: string | null
  created_at: Date
  channel_count: number
  pending_count: number | null
  answered_count: number | null
  expired_count: number | null
}

export async function listPromptFanOutSummaries(
  client: pg.PoolClient,
  organizationId: string,
  limit: number,
  broadcastGroupId?: string | null,
): Promise<FanOutSummaryRow[]> {
  const groupClause = broadcastGroupId ? ' AND broadcast_group_id = $6' : ''
  const params: unknown[] = [organizationId, PENDING, ANSWERED, EXPIRED, limit]
  if (broadcastGroupId) params.push(broadcastGroupId)

  const result = await client.query<FanOutSummaryRow>(
    `SELECT
       broadcast_batch_id,
       'prompt'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       (array_agg(correlation_id ORDER BY created_at))[1] AS correlation_id,
       (array_agg(broadcast_group_id ORDER BY created_at))[1] AS broadcast_group_id,
       (array_agg(broadcast_batch_status ORDER BY created_at))[1] AS broadcast_batch_status,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       COUNT(*) FILTER (WHERE state = $2)::int AS pending_count,
       COUNT(*) FILTER (WHERE state = $3)::int AS answered_count,
       COUNT(*) FILTER (WHERE state = $4)::int AS expired_count
     FROM prompts
     WHERE organization_id = $1 AND broadcast_batch_id IS NOT NULL${groupClause}
     GROUP BY broadcast_batch_id
     ORDER BY MIN(created_at) DESC
     LIMIT $5`,
    params,
  )
  return result.rows
}

export async function listMessageFanOutSummaries(
  client: pg.PoolClient,
  organizationId: string,
  limit: number,
  broadcastGroupId?: string | null,
): Promise<FanOutSummaryRow[]> {
  const groupClause = broadcastGroupId ? ' AND broadcast_group_id = $3' : ''
  const params: unknown[] = [organizationId, limit]
  if (broadcastGroupId) params.push(broadcastGroupId)

  const result = await client.query<FanOutSummaryRow>(
    `SELECT
       broadcast_batch_id,
       'message'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       NULL::text AS correlation_id,
       (array_agg(broadcast_group_id ORDER BY created_at))[1] AS broadcast_group_id,
       NULL::text AS broadcast_batch_status,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       NULL::int AS pending_count,
       NULL::int AS answered_count,
       NULL::int AS expired_count
     FROM messages
     WHERE organization_id = $1 AND broadcast_batch_id IS NOT NULL AND direction = 'outbound'${groupClause}
     GROUP BY broadcast_batch_id
     ORDER BY MIN(created_at) DESC
     LIMIT $2`,
    params,
  )
  return result.rows
}

export async function countPromptFanOut(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    'SELECT count(*)::text AS c FROM prompts WHERE organization_id = $1 AND broadcast_batch_id = $2',
    [organizationId, broadcastBatchId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function countMessageFanOut(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM messages
     WHERE organization_id = $1 AND broadcast_batch_id = $2 AND direction = 'outbound'`,
    [organizationId, broadcastBatchId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function getPromptFanOutSummary(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
): Promise<FanOutSummaryRow | null> {
  const result = await client.query<FanOutSummaryRow>(
    `SELECT
       broadcast_batch_id,
       'prompt'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       (array_agg(correlation_id ORDER BY created_at))[1] AS correlation_id,
       (array_agg(broadcast_group_id ORDER BY created_at))[1] AS broadcast_group_id,
       (array_agg(broadcast_batch_status ORDER BY created_at))[1] AS broadcast_batch_status,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       COUNT(*) FILTER (WHERE state = $3)::int AS pending_count,
       COUNT(*) FILTER (WHERE state = $4)::int AS answered_count,
       COUNT(*) FILTER (WHERE state = $5)::int AS expired_count
     FROM prompts
     WHERE organization_id = $1 AND broadcast_batch_id = $2
     GROUP BY broadcast_batch_id`,
    [organizationId, broadcastBatchId, PENDING, ANSWERED, EXPIRED],
  )
  return result.rows[0] ?? null
}

export async function getMessageFanOutSummary(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
): Promise<FanOutSummaryRow | null> {
  const result = await client.query<FanOutSummaryRow>(
    `SELECT
       broadcast_batch_id,
       'message'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       NULL::text AS correlation_id,
       (array_agg(broadcast_group_id ORDER BY created_at))[1] AS broadcast_group_id,
       NULL::text AS broadcast_batch_status,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       NULL::int AS pending_count,
       NULL::int AS answered_count,
       NULL::int AS expired_count
     FROM messages
     WHERE organization_id = $1 AND broadcast_batch_id = $2 AND direction = 'outbound'
     GROUP BY broadcast_batch_id`,
    [organizationId, broadcastBatchId],
  )
  return result.rows[0] ?? null
}
