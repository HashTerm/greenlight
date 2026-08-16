import type pg from 'pg'
import { PENDING, ANSWERED } from '../prompts/models.js'

const EXPIRED = 'EXPIRED'

export type BroadcastKind = 'prompt' | 'message'

export interface BroadcastSummaryRow {
  broadcast_id: string
  kind: BroadcastKind
  text: string
  correlation_id: string | null
  created_at: Date
  channel_count: number
  pending_count: number | null
  answered_count: number | null
  expired_count: number | null
}

export async function listPromptBroadcastSummaries(
  client: pg.PoolClient,
  organizationId: string,
  limit: number,
): Promise<BroadcastSummaryRow[]> {
  const result = await client.query<BroadcastSummaryRow>(
    `SELECT
       broadcast_id,
       'prompt'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       (array_agg(correlation_id ORDER BY created_at))[1] AS correlation_id,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       COUNT(*) FILTER (WHERE state = $2)::int AS pending_count,
       COUNT(*) FILTER (WHERE state = $3)::int AS answered_count,
       COUNT(*) FILTER (WHERE state = $4)::int AS expired_count
     FROM prompts
     WHERE organization_id = $1 AND broadcast_id IS NOT NULL
     GROUP BY broadcast_id
     ORDER BY MIN(created_at) DESC
     LIMIT $5`,
    [organizationId, PENDING, ANSWERED, EXPIRED, limit],
  )
  return result.rows
}

export async function listMessageBroadcastSummaries(
  client: pg.PoolClient,
  organizationId: string,
  limit: number,
): Promise<BroadcastSummaryRow[]> {
  const result = await client.query<BroadcastSummaryRow>(
    `SELECT
       broadcast_id,
       'message'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       NULL::text AS correlation_id,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       NULL::int AS pending_count,
       NULL::int AS answered_count,
       NULL::int AS expired_count
     FROM messages
     WHERE organization_id = $1 AND broadcast_id IS NOT NULL AND direction = 'outbound'
     GROUP BY broadcast_id
     ORDER BY MIN(created_at) DESC
     LIMIT $2`,
    [organizationId, limit],
  )
  return result.rows
}

export async function countPromptBroadcast(
  client: pg.PoolClient,
  organizationId: string,
  broadcastId: string,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    'SELECT count(*)::text AS c FROM prompts WHERE organization_id = $1 AND broadcast_id = $2',
    [organizationId, broadcastId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function countMessageBroadcast(
  client: pg.PoolClient,
  organizationId: string,
  broadcastId: string,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM messages
     WHERE organization_id = $1 AND broadcast_id = $2 AND direction = 'outbound'`,
    [organizationId, broadcastId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function getPromptBroadcastSummary(
  client: pg.PoolClient,
  organizationId: string,
  broadcastId: string,
): Promise<BroadcastSummaryRow | null> {
  const result = await client.query<BroadcastSummaryRow>(
    `SELECT
       broadcast_id,
       'prompt'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       (array_agg(correlation_id ORDER BY created_at))[1] AS correlation_id,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       COUNT(*) FILTER (WHERE state = $3)::int AS pending_count,
       COUNT(*) FILTER (WHERE state = $4)::int AS answered_count,
       COUNT(*) FILTER (WHERE state = $5)::int AS expired_count
     FROM prompts
     WHERE organization_id = $1 AND broadcast_id = $2
     GROUP BY broadcast_id`,
    [organizationId, broadcastId, PENDING, ANSWERED, EXPIRED],
  )
  return result.rows[0] ?? null
}

export async function getMessageBroadcastSummary(
  client: pg.PoolClient,
  organizationId: string,
  broadcastId: string,
): Promise<BroadcastSummaryRow | null> {
  const result = await client.query<BroadcastSummaryRow>(
    `SELECT
       broadcast_id,
       'message'::text AS kind,
       (array_agg(text ORDER BY created_at))[1] AS text,
       NULL::text AS correlation_id,
       MIN(created_at) AS created_at,
       COUNT(*)::int AS channel_count,
       NULL::int AS pending_count,
       NULL::int AS answered_count,
       NULL::int AS expired_count
     FROM messages
     WHERE organization_id = $1 AND broadcast_id = $2 AND direction = 'outbound'
     GROUP BY broadcast_id`,
    [organizationId, broadcastId],
  )
  return result.rows[0] ?? null
}
