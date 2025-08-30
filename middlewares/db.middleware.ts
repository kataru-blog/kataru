import type { Context, Next } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../entities'

export const dbMiddleware = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const db = drizzle(c.env.DB, { schema })
    c.set('db', db)
    await next()
}