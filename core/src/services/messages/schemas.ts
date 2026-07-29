import { z } from 'zod'

export const sendMessageSchema = z.object({
  channel_id: z.string().min(1),
  text: z.string().min(1),
})
