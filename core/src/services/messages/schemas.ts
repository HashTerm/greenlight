import { z } from 'zod'

const inlineBroadcastGroupSchema = z.object({
  channel_ids: z.array(z.string().min(1)).min(1).max(50),
})

const sendTargetRefine = (
  data: {
    channel_id?: string | null
    broadcast_group?: { channel_ids: string[] } | null
    broadcast_group_id?: string | null
  },
) => {
  const modes = [
    Boolean(data.channel_id?.trim()),
    Boolean(data.broadcast_group?.channel_ids?.length),
    Boolean(data.broadcast_group_id?.trim()),
  ].filter(Boolean).length
  return modes === 1
}

export const sendMessageSchema = z
  .object({
    channel_id: z.string().min(1).optional(),
    broadcast_group: inlineBroadcastGroupSchema.optional(),
    broadcast_group_id: z.string().min(1).optional(),
    text: z.string().min(1),
  })
  .refine(sendTargetRefine, {
    message: 'Provide exactly one of channel_id, broadcast_group, or broadcast_group_id',
  })
