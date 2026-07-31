import { Hono } from 'hono'
import { requireScope } from '../api/middleware/require-scope.js'
import { licenseGate } from './license-gate.js'
import { listAuditEvents, streamAuditEvents } from './audit.js'

export const auditRoutes = new Hono()

auditRoutes.get('/audit', requireScope('audit:read'), async (c) => {
  if (!licenseGate.isEnabled('audit')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const limit = Number(c.req.query('limit') ?? '50')
  const cursor = c.req.query('cursor') ?? undefined
  const action = c.req.query('action') ?? undefined
  const actor_id = c.req.query('actor_id') ?? undefined
  const resource_type = c.req.query('resource_type') ?? undefined

  const result = await listAuditEvents({
    limit: Number.isFinite(limit) ? limit : 50,
    cursor,
    action,
    actor_id,
    resource_type,
  })

  return c.json(result)
})

auditRoutes.get('/audit/export', requireScope('audit:read'), async (c) => {
  if (!licenseGate.isEnabled('audit')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const format = c.req.query('format') === 'csv' ? 'csv' : 'jsonl'
  const action = c.req.query('action') ?? undefined
  const actor_id = c.req.query('actor_id') ?? undefined
  const resource_type = c.req.query('resource_type') ?? undefined

  const body = await streamAuditEvents({ action, actor_id, resource_type }, format)
  const contentType = format === 'csv' ? 'text/csv' : 'application/x-ndjson'
  const ext = format === 'csv' ? 'csv' : 'jsonl'

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="audit-export.${ext}"`,
    },
  })
})
