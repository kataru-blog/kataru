import { cors } from 'hono/cors'

export const setCors = () => cors({
        origin: (origin, c) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:10101',
                'https://kataru.gumyoincirno.workers.dev',
                'kataru.dev',
                c.env.BASE_URL,
                c.env.ADMIN_URL,
            ]
            if (allowedOrigins.includes(origin) || origin.includes(c.env.BASE_URL)) return origin
            return null
        },
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT'],
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
        maxAge: 600,
        credentials: true,
    })

