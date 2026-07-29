import { Hono } from 'hono'
import { adminStatusRoutes } from './status.js'
import { adminPromptRoutes } from './prompts.js'
import { adminMessageRoutes } from './messages.js'
import { adminSettingsRoutes } from './settings.js'

export const adminRoutes = new Hono()

adminRoutes.route('/', adminStatusRoutes)
adminRoutes.route('/', adminPromptRoutes)
adminRoutes.route('/', adminMessageRoutes)
adminRoutes.route('/', adminSettingsRoutes)
