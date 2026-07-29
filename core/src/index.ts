import { serve } from '@hono/node-server'
import { createApp } from './api/app.js'
import { loadConfig } from './core/config.js'
import { migrate, closePool, withClient } from './db/client.js'
import * as promptModels from './services/prompts/models.js'
import { shutdownAllBots } from './chat/bot-manager.js'
import { restoreChannelsOnStartup } from './services/channels/service.js'
import { expirePrompts } from './services/prompts/service.js'
import { bootstrapApiKeyFromEnv } from './services/api-keys/bootstrap.js'
import { runRetention } from './services/settings/service.js'

async function bootstrap(): Promise<void> {
  const config = loadConfig()

  await migrate()
  await bootstrapApiKeyFromEnv()

  if (config.CLEAN_ON_BOOT) {
    await withClient((client) => promptModels.cleanOnBoot(client))
  }

  await restoreChannelsOnStartup()

  setInterval(() => {
    expirePrompts().catch((err) => console.error('expire prompts error:', err))
  }, 60_000)

  setInterval(() => {
    runRetention().catch((err) => console.error('retention error:', err))
  }, 60_000)

  const app = createApp()

  const server = serve(
    {
      fetch: app.fetch,
      hostname: config.HOST,
      port: config.PORT,
    },
    (info) => {
      console.log(`Greenlight listening on http://${info.address}:${info.port}`)
    },
  )

  const shutdown = async () => {
    console.log('Shutting down...')
    await shutdownAllBots()
    await closePool()
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

bootstrap().catch((err) => {
  console.error('Failed to start Greenlight:', err)
  process.exit(1)
})
