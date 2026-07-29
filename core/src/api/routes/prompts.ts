import type { Context } from 'hono'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  createAndPostPrompt,
  getPrompt,
  listPrompts,
} from '../../services/prompts/service.js'
import { formatPromptId } from '../../services/prompts/models.js'
import { ValueError } from '../../core/security.js'

const promptInSchema = z.object({
  channel_id: z.string().optional().nullable(),
  text: z.string().max(4096),
  media_url: z.string().optional().nullable(),
  media_path: z.string().optional().nullable(),
  options: z.array(z.string().max(64)).max(10).optional().nullable(),
  allow_text: z.boolean().optional().default(false),
  callback_url: z.string().optional().nullable(),
  correlation_id: z.string().max(255).optional().nullable(),
  ttl_sec: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 3600)
    .optional()
    .nullable(),
})

const listQuerySchema = z.object({
  state: z.enum(['pending', 'answered', 'expired', 'all']).default('pending'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const promptRoutes = new Hono()

type CreatePromptInput = Parameters<typeof createAndPostPrompt>[0]

async function respondCreatePrompt(c: Context, input: CreatePromptInput) {
  try {
    const result = await createAndPostPrompt(input)
    return c.json({
      prompt_id: result.promptId,
      channel_id: result.channelId,
      message_id: result.messageId,
    })
  } catch (err) {
    if (err instanceof ValueError) {
      return c.json({ detail: err.message }, 400)
    }
    console.error('create prompt error:', err)
    return c.json({ detail: String(err) }, 500)
  }
}

async function parseMultipartPrompt(c: Context): Promise<CreatePromptInput | Response> {
  const form = await c.req.parseBody()
  const text = String(form.text ?? '')
  if (!text) return c.json({ detail: 'text is required' }, 400)

  let options: string[] = []
  if (form.options) {
    try {
      options = JSON.parse(String(form.options))
    } catch {
      return c.json({ detail: 'Invalid JSON format for options' }, 400)
    }
  }

  const file = form.file
  const mediaUrl = form.media_url ? String(form.media_url) : null
  if (file && mediaUrl) {
    return c.json({ detail: 'Cannot provide both file upload and media_url' }, 400)
  }

  let mediaFile: Buffer | null = null
  let mediaFileName: string | null = null
  if (file && typeof file === 'object' && 'arrayBuffer' in file) {
    const blob = file as File
    mediaFile = Buffer.from(await blob.arrayBuffer())
    mediaFileName = blob.name
  }

  return {
    channelId: form.channel_id ? String(form.channel_id) : null,
    text,
    mediaPath: form.media_path ? String(form.media_path) : null,
    mediaUrl,
    options,
    allowText: String(form.allow_text ?? 'false') === 'true',
    callbackUrl: form.callback_url ? String(form.callback_url) : null,
    correlationId: form.correlation_id ? String(form.correlation_id) : null,
    ttlSec: form.ttl_sec ? Number(form.ttl_sec) : 3600,
    mediaFile,
    mediaFileName,
  }
}

promptRoutes.post('/prompts/new', async (c) => {
  const contentType = c.req.header('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const input = await parseMultipartPrompt(c)
    if (input instanceof Response) return input
    return respondCreatePrompt(c, input)
  }

  if (contentType.includes('application/json')) {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ detail: 'Invalid JSON body' }, 400)
    }

    const parsed = promptInSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ detail: parsed.error.flatten() }, 400)
    }

    const data = parsed.data
    return respondCreatePrompt(c, {
      channelId: data.channel_id,
      text: data.text,
      mediaPath: data.media_path,
      mediaUrl: data.media_url,
      options: data.options ?? [],
      allowText: data.allow_text,
      callbackUrl: data.callback_url,
      correlationId: data.correlation_id,
      ttlSec: data.ttl_sec ?? 3600,
    })
  }

  return c.json(
    { detail: 'Unsupported Content-Type. Use application/json or multipart/form-data.' },
    415,
  )
})

promptRoutes.get('/prompts', zValidator('query', listQuerySchema), async (c) => {
  const { state, limit } = c.req.valid('query')
  const rows = await listPrompts(state, limit)
  return c.json(
    rows.map((row) => ({
      id: formatPromptId(row.prompt_num),
      prompt_num: row.prompt_num,
      chat_id: row.chat_id,
      channel_id: row.chat_id,
      text: row.text,
      media_url: row.media_url,
      options: row.options,
      allow_text: row.allow_text,
      callback_url: row.callback_url,
      correlation_id: row.correlation_id,
      state: row.state,
      created_at: row.created_at.toISOString(),
      expires_at: row.expires_at?.toISOString() ?? null,
      answered_at: row.answered_at?.toISOString() ?? null,
      answered_by_id: row.answered_by_id,
      answered_by_username: row.answered_by_username,
      answer: row.answer,
    })),
  )
})

promptRoutes.get('/prompts/:id', async (c) => {
  const promptId = decodeURIComponent(c.req.param('id'))
  if (promptId === 'pending' || promptId === 'new') {
    return c.json({ detail: 'not found' }, 404)
  }
  const row = await getPrompt(promptId)
  if (!row) return c.json({ detail: 'not found' }, 404)

  return c.json({
    id: `#${row.prompt_num}`,
    prompt_num: row.prompt_num,
    chat_id: row.chat_id,
    channel_id: row.chat_id,
    message_id: row.message_id,
    text: row.text,
    media_url: row.media_url,
    options: row.options,
    allow_text: row.allow_text,
    callback_url: row.callback_url,
    correlation_id: row.correlation_id,
    state: row.state,
    created_at: row.created_at,
    expires_at: row.expires_at,
    answered_at: row.answered_at,
    answered_by_id: row.answered_by_id,
    answered_by_username: row.answered_by_username,
    answer: row.answer,
  })
})
