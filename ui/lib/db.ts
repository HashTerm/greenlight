import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/drizzle/schema'

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is required')
    }
    const client = postgres(connectionString, { max: 1 })
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
