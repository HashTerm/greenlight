'use server'

import bcrypt from 'bcryptjs'
import { count, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { signIn, signOut } from '@/auth'
import { db } from '@/lib/db'
import { adminUsers } from '@/drizzle/schema'
import {
  adminFetch,
  agentFetch,
  type AdminStatus,
  type Channel,
  type Message,
  type Prompt,
  type RetentionSettings,
} from '@/lib/greenlight-client'
import type { Platform } from '@/lib/platform-fields'

export async function getUserCount(): Promise<number> {
  const [result] = await db.select({ value: count() }).from(adminUsers)
  return result?.value ?? 0
}

export async function setupAdmin(formData: FormData) {
  const userCount = await getUserCount()
  if (userCount > 0) {
    throw new Error('Setup already completed')
  }

  const email = String(formData.get('email') ?? '')
    .toLowerCase()
    .trim()
  const password = String(formData.get('password') ?? '')
  if (!email || password.length < 8) {
    throw new Error('Email and password (min 8 chars) required')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.insert(adminUsers).values({ email, passwordHash })
  redirect('/login')
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  await signIn('credentials', {
    email,
    password,
    redirectTo: '/dashboard',
  })
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}

export async function changePassword(formData: FormData) {
  const { auth } = await import('@/auth')
  const session = await auth()
  if (!session?.user?.email) throw new Error('Not authenticated')

  const current = String(formData.get('current_password') ?? '')
  const next = String(formData.get('new_password') ?? '')
  if (next.length < 8) throw new Error('New password must be at least 8 characters')

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, session.user.email))
    .limit(1)

  if (!user) throw new Error('User not found')
  const valid = await bcrypt.compare(current, user.passwordHash)
  if (!valid) throw new Error('Current password is incorrect')

  const passwordHash = await bcrypt.hash(next, 12)
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, user.id))

  revalidatePath('/settings')
}

export async function fetchStatus(): Promise<AdminStatus> {
  return adminFetch<AdminStatus>('/admin/v1/status')
}

export async function fetchChannels(): Promise<Channel[]> {
  return agentFetch<Channel[]>('/channels')
}

export async function fetchPrompts(
  state: 'pending' | 'answered' | 'expired' | 'all' = 'all',
): Promise<Prompt[]> {
  return adminFetch<Prompt[]>(`/admin/v1/prompts?state=${state}&limit=200`)
}

export async function fetchPrompt(id: string): Promise<Prompt> {
  return agentFetch<Prompt>(`/v1/prompts/${encodeURIComponent(id)}`)
}

export async function fetchMessages(
  direction: 'inbound' | 'outbound' | 'all' = 'all',
  channelId?: string,
): Promise<Message[]> {
  const params = new URLSearchParams({ direction, limit: '200' })
  if (channelId) params.set('channel_id', channelId)
  return adminFetch<Message[]>(`/admin/v1/messages?${params}`)
}

export async function fetchMessage(id: string): Promise<Message> {
  return adminFetch<Message>(`/admin/v1/messages/${encodeURIComponent(id)}`)
}

export async function fetchRetentionSettings(): Promise<RetentionSettings> {
  return adminFetch<RetentionSettings>('/admin/v1/settings')
}

export async function updateRetentionSettingsAction(formData: FormData) {
  const promptsRetentionEnabled = formData.get('prompts_retention_enabled') === 'on'
  const messagesInboundRetentionEnabled =
    formData.get('messages_inbound_retention_enabled') === 'on'
  const messagesOutboundRetentionEnabled =
    formData.get('messages_outbound_retention_enabled') === 'on'
  const messagesInboundZeroRetention = formData.get('messages_inbound_zero_retention') === 'on'
  const messagesOutboundZeroRetention = formData.get('messages_outbound_zero_retention') === 'on'
  const promptsRetentionDays = Number(formData.get('prompts_retention_days') ?? 30)
  const messagesInboundRetentionDays = Number(formData.get('messages_inbound_retention_days') ?? 30)
  const messagesOutboundRetentionDays = Number(
    formData.get('messages_outbound_retention_days') ?? 30,
  )

  await adminFetch<RetentionSettings>('/admin/v1/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      prompts_retention_enabled: promptsRetentionEnabled,
      prompts_retention_days: promptsRetentionDays,
      messages_inbound_retention_enabled: messagesInboundRetentionEnabled,
      messages_outbound_retention_enabled: messagesOutboundRetentionEnabled,
      messages_inbound_retention_days: messagesInboundRetentionDays,
      messages_outbound_retention_days: messagesOutboundRetentionDays,
      messages_inbound_zero_retention: messagesInboundZeroRetention,
      messages_outbound_zero_retention: messagesOutboundZeroRetention,
    }),
  })

  revalidatePath('/settings')
}

type AdminSendMessageResponse = Message | { status: string; stored: false }

export async function createMessageAction(formData: FormData) {
  const channelId = String(formData.get('channel_id'))
  const text = String(formData.get('text'))

  const result = await adminFetch<AdminSendMessageResponse>('/admin/v1/messages', {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, text }),
  })

  revalidatePath('/messages')
  if ('id' in result && result.id) {
    redirect(`/messages/${encodeURIComponent(result.id)}`)
  }
  redirect('/messages')
}

export async function registerChannelAction(formData: FormData) {
  const platform = String(formData.get('platform')) as Platform
  const channelId = String(formData.get('channel_id'))
  const targetChatId = String(formData.get('target_chat_id'))
  const channelType = String(formData.get('channel_type') ?? 'MESSAGE')
  const callbackUrl = String(formData.get('callback_url') ?? '') || null

  const credentials: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('cred_')) {
      credentials[key.slice(5)] = String(value)
    }
  }

  await agentFetch('/register-channel', {
    method: 'POST',
    body: JSON.stringify({
      channel_id: channelId,
      platform,
      target_chat_id: targetChatId,
      credentials,
      callback_url: callbackUrl,
      channel_type: channelType,
    }),
  })

  revalidatePath('/channels')
  redirect(`/channels/${encodeURIComponent(channelId)}`)
}

export async function deleteChannelAction(channelId: string) {
  await agentFetch(`/channels/${encodeURIComponent(channelId)}`, {
    method: 'DELETE',
  })
  revalidatePath('/channels')
  redirect('/channels')
}

export async function sendMessageAction(formData: FormData) {
  const channelId = String(formData.get('channel_id'))
  const text = String(formData.get('text'))
  await adminFetch<Message>('/admin/v1/messages', {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, text }),
  })
  revalidatePath(`/channels/${encodeURIComponent(channelId)}`)
  revalidatePath('/messages')
}

function parsePromptFormData(formData: FormData) {
  const channelId = String(formData.get('channel_id'))
  const text = String(formData.get('text'))
  const allowText = formData.get('allow_text') === 'on'
  const callbackUrl = String(formData.get('callback_url') ?? '') || undefined
  const correlationId = String(formData.get('correlation_id') ?? '') || undefined
  const ttlSec = Number(formData.get('ttl_sec') ?? 3600)
  const options = formData
    .getAll('options')
    .map((o) => String(o).trim())
    .filter(Boolean)
  const file = formData.get('file')

  return { channelId, text, allowText, callbackUrl, correlationId, ttlSec, options, file }
}

export async function createPromptAction(formData: FormData) {
  const { channelId, text, allowText, callbackUrl, correlationId, ttlSec, options, file } =
    parsePromptFormData(formData)

  const hasFile = file instanceof File && file.size > 0

  if (hasFile) {
    const upload = new FormData()
    upload.append('channel_id', channelId)
    upload.append('text', text)
    upload.append('file', file)
    upload.append('allow_text', String(allowText))
    upload.append('ttl_sec', String(ttlSec))
    if (options.length) upload.append('options', JSON.stringify(options))
    if (callbackUrl) upload.append('callback_url', callbackUrl)
    if (correlationId) upload.append('correlation_id', correlationId)

    const key = process.env.GREENLIGHT_API_KEY
    if (!key) throw new Error('GREENLIGHT_API_KEY is not configured')
    const base = process.env.GREENLIGHT_API_URL ?? 'http://localhost:8100'

    const res = await fetch(`${base}/v1/prompts/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': key },
      body: upload,
    })
    if (!res.ok) throw new Error(await res.text())

    const result = (await res.json()) as { prompt_id: string }
    revalidatePath('/prompts')
    redirect(`/prompts/${encodeURIComponent(result.prompt_id)}`)
    return
  }

  const body: Record<string, unknown> = {
    channel_id: channelId,
    text,
    allow_text: allowText,
    ttl_sec: ttlSec,
  }
  if (options.length) body.options = options
  if (callbackUrl) body.callback_url = callbackUrl
  if (correlationId) body.correlation_id = correlationId

  const result = await agentFetch<{ prompt_id: string }>('/v1/prompts', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  revalidatePath('/prompts')
  redirect(`/prompts/${encodeURIComponent(result.prompt_id)}`)
}
