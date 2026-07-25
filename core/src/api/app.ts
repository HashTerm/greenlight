import { Hono } from 'hono'
import { authMiddleware } from './middleware/auth.js'
import { adminAuthMiddleware } from './middleware/admin-auth.js'
import { healthRoutes } from './routes/health.js'
import { webhookRoutes } from './routes/webhooks.js'
import { promptRoutes } from './routes/prompts.js'
import { channelRoutes } from './routes/channels.js'
import { adminRoutes } from './routes/admin/index.js'
import { loadConfig } from '../core/config.js'
import { getOpenApiDocument } from './openapi.js'

export function createApp(): Hono {
  const app = new Hono()
  const config = loadConfig()

  app.route('/', healthRoutes)
  app.route('/', webhookRoutes)

  if (config.ADMIN_INTERNAL_TOKEN) {
    const adminApp = new Hono()
    adminApp.use('*', adminAuthMiddleware)
    adminApp.route('/', adminRoutes)
    app.route('/admin/v1', adminApp)
  }

  app.use('*', async (c, next) => {
    const path = c.req.path
    const isAgentRoute =
      path.startsWith('/v1') ||
      path === '/register-channel' ||
      path === '/send' ||
      path.startsWith('/channels')
    if (!isAgentRoute) {
      return next()
    }
    return authMiddleware(c, next)
  })
  app.route('/v1', promptRoutes)
  app.route('/', channelRoutes)

  if (config.ENABLE_DOCS) {
    app.get('/openapi.json', (c) => c.json(getOpenApiDocument()))
  }

  return app
}
