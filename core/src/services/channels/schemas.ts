import { z } from 'zod'
import type { Platform } from '../../core/platform.js'
import { PLATFORMS } from '../../core/platform.js'

const telegramCredentials = z.object({
  bot_token: z.string().min(1),
})

const slackCredentials = z.object({
  bot_token: z.string().min(1),
  signing_secret: z.string().min(1),
  app_token: z.string().min(1).optional(),
})

const teamsCredentials = z.object({
  app_id: z.string().min(1),
  app_password: z.string().min(1),
  app_tenant_id: z.string().min(1).optional(),
})

const discordCredentials = z.object({
  bot_token: z.string().min(1),
  public_key: z.string().min(1),
  application_id: z.string().min(1),
})

const gchatCredentials = z.object({
  service_account_json: z.string().min(1),
  google_chat_project_number: z.string().min(1),
  pubsub_topic: z.string().min(1).optional(),
  pubsub_audience: z.string().min(1).optional(),
  impersonate_user: z.string().min(1).optional(),
})

const whatsappCredentials = z.object({
  access_token: z.string().min(1),
  app_secret: z.string().min(1),
  phone_number_id: z.string().min(1),
  verify_token: z.string().min(1),
})

const messengerCredentials = z.object({
  page_access_token: z.string().min(1),
  app_secret: z.string().min(1),
  verify_token: z.string().min(1),
})

function validatePlatformCredentials(
  platform: Platform,
  credentials: Record<string, string>,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = ['credentials'],
): void {
  let result: z.SafeParseReturnType<unknown, unknown>
  switch (platform) {
    case 'telegram':
      result = telegramCredentials.safeParse(credentials)
      break
    case 'slack':
      result = slackCredentials.safeParse(credentials)
      break
    case 'teams':
      result = teamsCredentials.safeParse(credentials)
      break
    case 'discord':
      result = discordCredentials.safeParse(credentials)
      break
    case 'gchat':
      result = gchatCredentials.safeParse(credentials)
      if (result.success) {
        try {
          JSON.parse(credentials.service_account_json)
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'service_account_json must be valid JSON',
            path: [...pathPrefix, 'service_account_json'],
          })
        }
      }
      break
    case 'whatsapp':
      result = whatsappCredentials.safeParse(credentials)
      break
    case 'messenger':
      result = messengerCredentials.safeParse(credentials)
      break
    default:
      return
  }
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({
        ...issue,
        path: [...pathPrefix, ...issue.path.map(String)],
      })
    }
  }
}

export function getCredentialsValidationError(
  platform: Platform,
  credentials: Record<string, string>,
): string | null {
  const messages: string[] = []
  validatePlatformCredentials(platform, credentials, {
    addIssue: (issue) => {
      messages.push(issue.message ?? 'Invalid credentials')
    },
  } as z.RefinementCtx)
  return messages[0] ?? null
}

export const createChannelSchema = z
  .object({
    channel_id: z.string().min(1),
    platform: z.enum(PLATFORMS),
    target_chat_id: z.string().min(1),
    credentials: z.record(z.string()),
    callback_url: z.string().optional().nullable(),
    channel_type: z.enum(['MESSAGE', 'PROMPT']).optional().default('MESSAGE'),
  })
  .superRefine((data, ctx) => {
    validatePlatformCredentials(data.platform, data.credentials, ctx)
  })

export const updateChannelSchema = z
  .object({
    target_chat_id: z.string().min(1).optional(),
    callback_url: z.string().optional().nullable(),
    credentials: z.record(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.target_chat_id !== undefined ||
      data.callback_url !== undefined ||
      data.credentials !== undefined,
    { message: 'At least one field must be provided' },
  )
