import { Hono } from 'hono'
import { PLATFORMS, type Platform } from '../../core/platform.js'
import { getBotForChannel } from '../../chat/bot-manager.js'

export const webhookRoutes = new Hono()

async function handlePlatformWebhook(
  platform: Platform,
  channelId: string,
  request: Request,
): Promise<Response> {
  const managed = getBotForChannel(channelId)
  if (!managed || managed.platform !== platform) {
    return new Response(JSON.stringify({ detail: 'unknown channel' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const handler = managed.bot.webhooks[platform]
  if (!handler) {
    return new Response(JSON.stringify({ detail: 'unsupported platform' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return handler(request)
}

function registerWebhookRoute(platform: Platform, methods: ('get' | 'post')[]) {
  const handler = async (c: { req: { param: (k: string) => string; raw: Request } }) => {
    return handlePlatformWebhook(platform, c.req.param('channel_id'), c.req.raw)
  }

  if (methods.includes('get')) {
    webhookRoutes.get(`/webhooks/${platform}/:channel_id`, handler)
  }
  if (methods.includes('post')) {
    webhookRoutes.post(`/webhooks/${platform}/:channel_id`, handler)
  }
}

for (const platform of PLATFORMS) {
  const needsGet = platform === 'whatsapp' || platform === 'messenger'
  registerWebhookRoute(platform, needsGet ? ['get', 'post'] : ['post'])
}
