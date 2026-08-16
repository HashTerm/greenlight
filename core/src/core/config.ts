import { z } from 'zod'

const DEFAULT_SIGNING_SECRET = 'super-secret'
const DEFAULT_WEBHOOK_SECRET = 'change-me'

const envSchema = z
  .object({
    PUBLIC_WEBHOOK_URL: z.string().optional(),
    WEBHOOK_SECRET: z.string().default(DEFAULT_WEBHOOK_SECRET),
    DEFAULT_PROMPT_CHANNEL_ID: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    CALLBACK_SIGNING_SECRET: z.string().default(DEFAULT_SIGNING_SECRET),
    CLEAN_ON_BOOT: z
      .string()
      .optional()
      .transform((v) => v !== 'false'),
    USE_AUTH: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    GREENLIGHT_API_KEY: z.string().optional(),
    MEDIA_ALLOWED_DIR: z.string().optional(),
    MAX_MEDIA_SIZE_MB: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 2)),
    ENABLE_DOCS: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    CHANNEL_CALLBACK_MAX_RETRIES: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 3)),
    CHANNEL_CALLBACK_RETRY_DELAY: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 5)),
    CHANNEL_OFFLINE_NOTIFICATION: z
      .string()
      .default('Assistant offline, could not deliver message.'),
    TELEGRAM_CHANNEL_START_REPLY: z
      .string()
      .default("Greenlight is connected. You'll receive prompts here."),
    TEXT_REPLY_ARM_TTL_SEC: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 900)),
    PORT: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 8100)),
    HOST: z.string().default('0.0.0.0'),
  })
  .superRefine((data, ctx) => {
    if (data.CALLBACK_SIGNING_SECRET === DEFAULT_SIGNING_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CALLBACK_SIGNING_SECRET is still set to the default value. Set a strong unique secret in your .env file.',
        path: ['CALLBACK_SIGNING_SECRET'],
      })
    }
    if (data.PUBLIC_WEBHOOK_URL?.trim() && data.WEBHOOK_SECRET === DEFAULT_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'WEBHOOK_SECRET is still set to the default value. Set a strong unique secret when using PUBLIC_WEBHOOK_URL.',
        path: ['WEBHOOK_SECRET'],
      })
    }
  })

export type Config = z.infer<typeof envSchema>

let cached: Config | null = null

export function loadConfig(): Config {
  if (!cached) {
    cached = envSchema.parse(process.env)
  }
  return cached
}

export function resetConfigForTests(): void {
  cached = null
}
