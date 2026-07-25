import { Hono } from 'hono'
import { adminStatusRoutes } from './status.js'
import { adminPromptRoutes } from './prompts.js'

export const adminRoutes = new Hono()

adminRoutes.route('/', adminStatusRoutes)
adminRoutes.route('/', adminPromptRoutes)
