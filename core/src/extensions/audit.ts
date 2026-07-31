export type AuditEventInput = {
  actor_type: 'api_key' | 'user' | 'system'
  actor_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
}

export async function recordAuditEvent(_event: AuditEventInput): Promise<void> {}
