import { Hono } from 'hono'
import { createAuth } from 'lib/auth'

export const AuthRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
        const auth = createAuth(c.env)
        return auth.handler(c.req.raw)
    })

    return app
}
