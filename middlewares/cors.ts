import { cors } from 'hono/cors'
import type { Context, Next } from 'hono'

export const setCors = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    cors({
        origin: (origin) => {
            const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://kataru.gumyoincirno.workers.dev', 'kataru.dev',c.env.BASE_URL]
            if (allowedOrigins.includes(origin) || origin.includes(c.env.BASE_URL)) return origin
            return null
        },
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT'],
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
        maxAge: 600,
        credentials: true,
    })

    return await next()
}
