const baseUrl = () => process.env.GREENLIGHT_API_URL ?? 'http://localhost:8100'

/** Self-host default org; cloud UI sets GREENLIGHT_ORG_ID to the active org UUID. */
const DEFAULT_ORGANIZATION_ID = process.env.GREENLIGHT_ORG_ID ?? 'default'

export function getActiveOrganizationId(): string {
  return DEFAULT_ORGANIZATION_ID
}

function apiHeaders(userId?: string): HeadersInit {
  const key = process.env.GREENLIGHT_API_KEY
  if (!key) {
    throw new Error(
      'GREENLIGHT_API_KEY is not configured. Set it in env or create a key in Settings and update the env value.',
    )
  }
  const headers: Record<string, string> = {
    'X-API-Key': key,
    'X-Greenlight-Org-Id': getActiveOrganizationId(),
    'Content-Type': 'application/json',
  }
  if (userId) {
    headers['X-Greenlight-User-Id'] = userId
  }
  return headers
}

export type ApiFetchOptions = RequestInit & { userId?: string; userEmail?: string }

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { userId, userEmail, ...rest } = init ?? {}
  const baseHeaders = apiHeaders(userId)
  if (userEmail) {
    ;(baseHeaders as Record<string, string>)['X-Greenlight-User-Email'] = userEmail
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: { ...baseHeaders, ...rest.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}
async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${baseUrl()}/healthz`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json()
}

export interface AdminStatus {
  status: string
  database: string
  channels_active: number
  prompts_pending: number
  prompts_answered_24h: number
  platforms: Record<string, number>
}

export interface Channel {
  channel_id: string
  platform: string
  target_chat_id: string
  callback_url: string | null
  callback_data: unknown | null
  callback_headers_configured: boolean
  channel_type: string
  is_active: boolean
  registered_at: string
}

export interface Prompt {
  id: string
  prompt_num: number
  chat_id: string
  channel_id: string
  text: string
  media_url: string | null
  options: string[] | null
  allow_text: boolean
  callback_url: string | null
  correlation_id: string | null
  callback_data: unknown | null
  callback_headers_configured: boolean
  broadcast_batch_id: string | null
  broadcast_group_id: string | null
  broadcast_answer_mode: string | null
  broadcast_batch_status: string | null
  state: string
  created_at: string
  expires_at: string | null
  answered_at: string | null
  answered_by_id: number | null
  answered_by_username: string | null
  answer: {
    type: string
    value: string
    origin?: string
    source_channel_id?: string
  } | null
}

export interface Message {
  id: string
  channel_id: string
  direction: 'inbound' | 'outbound'
  text: string
  platform: string
  from_user: string | null
  api_key_id: string | null
  platform_message_id: string | null
  broadcast_batch_id: string | null
  broadcast_group_id: string | null
  created_at: string
}

export interface ApiKeyRecord {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
}

export interface CreatedApiKey extends ApiKeyRecord {
  key: string
}

export interface RetentionSettings {
  prompts_retention_enabled: boolean
  prompts_retention_days: number
  messages_inbound_retention_enabled: boolean
  messages_outbound_retention_enabled: boolean
  messages_inbound_retention_days: number
  messages_outbound_retention_days: number
  messages_inbound_zero_retention: boolean
  messages_outbound_zero_retention: boolean
  updated_at: string
}

export const DEFAULT_RETENTION_SETTINGS: Omit<RetentionSettings, 'updated_at'> = {
  prompts_retention_enabled: false,
  prompts_retention_days: 30,
  messages_inbound_retention_enabled: true,
  messages_outbound_retention_enabled: true,
  messages_inbound_retention_days: 30,
  messages_outbound_retention_days: 30,
  messages_inbound_zero_retention: false,
  messages_outbound_zero_retention: false,
}

export const API_KEY_PRESETS = ['admin', 'agent', 'readonly'] as const
export type ApiKeyPreset = (typeof API_KEY_PRESETS)[number]

export function getPublicWebhookUrl(): string {
  return process.env.PUBLIC_WEBHOOK_URL ?? 'http://localhost:8100'
}
