import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { withClient } from '../../../db/client.js'
import { formatPromptId, listPrompts } from '../../../services/prompts/models.js'

const listQuerySchema = z.object({
  state: z.enum(['pending', 'answered', 'expired', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const adminPromptRoutes = new Hono()

adminPromptRoutes.get('/prompts', zValidator('query', listQuerySchema), async (c) => {
  const { state, limit } = c.req.valid('query')
  const rows = await withClient((client) => listPrompts(client, state, limit))

  return c.json(
    rows.map((row) => ({
      id: formatPromptId(row.prompt_num),
      prompt_num: row.prompt_num,
      chat_id: row.chat_id,
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
