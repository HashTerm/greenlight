import { Hono } from 'hono'
import { authMiddleware } from './middleware/auth.js'
import { healthRoutes } from './routes/health.js'
import { webhookRoutes } from './routes/webhooks.js'
import { promptRoutes } from './routes/prompts.js'
import { channelRoutes } from './routes/channels.js'
import { messageRoutes } from './routes/messages.js'
import { statusRoutes } from './routes/status.js'
import { settingsRoutes } from './routes/settings.js'
import { keyRoutes } from './routes/keys.js'
import { broadcastBatchRoutes } from './routes/broadcast-batches.js'
import { broadcastGroupRoutes } from './routes/broadcast-groups.js'
import { registerEnterpriseRoutes, registerEnterpriseMiddleware } from '../extensions/register.js'
import { loadConfig } from '../core/config.js'
import { getOpenApiDocument } from './openapi.js'

export function createApp(): Hono {
  const app = new Hono()
  const config = loadConfig()

  app.route('/', healthRoutes)
  app.route('/', webhookRoutes)

  app.use('/v1/*', authMiddleware)
  registerEnterpriseMiddleware(app)
  app.route('/v1', promptRoutes)
  app.route('/v1', channelRoutes)
  app.route('/v1', messageRoutes)
  app.route('/v1', broadcastBatchRoutes)
  app.route('/v1', broadcastGroupRoutes)
  app.route('/v1', statusRoutes)
  app.route('/v1', settingsRoutes)
  app.route('/v1', keyRoutes)

  registerEnterpriseRoutes(app)

  if (config.ENABLE_DOCS) {
    app.get('/openapi.json', (c) => c.json(getOpenApiDocument()))
  }

  return app
}
