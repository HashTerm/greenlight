const baseUrl = () => process.env.GREENLIGHT_API_URL ?? 'http://localhost:8100'

function agentHeaders(): HeadersInit {
  const key = process.env.GREENLIGHT_API_KEY
  if (!key) throw new Error('GREENLIGHT_API_KEY is not configured')
  return { 'X-API-Key': key, 'Content-Type': 'application/json' }
}

function adminHeaders(): HeadersInit {
  const token = process.env.GREENLIGHT_ADMIN_TOKEN
  if (!token) throw new Error('GREENLIGHT_ADMIN_TOKEN is not configured')
  return { 'X-Admin-Token': token, 'Content-Type': 'application/json' }
}

export async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...agentHeaders(), ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Agent API ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Admin API ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${baseUrl()}/healthz`, { cache: 'no-store' })
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
  channel_type: string
  is_active: boolean
  registered_at: string
}

export interface Prompt {
  id: string
  prompt_num: number
  chat_id: string
  text: string
  media_url: string | null
  options: string[] | null
  allow_text: boolean
  callback_url: string | null
  correlation_id: string | null
  state: string
  created_at: string
  expires_at: string | null
  answered_at: string | null
  answered_by_id: number | null
  answered_by_username: string | null
  answer: { type: string; value: string } | null
}

export interface Message {
  id: string
  channel_id: string
  direction: 'inbound' | 'outbound'
  text: string
  platform: string
  from_user: string | null
  source: 'api' | 'admin' | null
  platform_message_id: string | null
  created_at: string
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

export function getPublicWebhookUrl(): string {
  return process.env.PUBLIC_WEBHOOK_URL ?? 'http://localhost:8100'
}
