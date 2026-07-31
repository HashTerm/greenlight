import type { Hono } from 'hono'

export function registerEnterpriseRoutes(_app: Hono): void {}

export function registerEnterpriseMiddleware(_app: Hono): void {}

export async function onEnterpriseBoot(): Promise<void> {}
