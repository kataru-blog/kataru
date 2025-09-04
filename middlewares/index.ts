import { Hono } from 'hono'
import renderer from 'routes/_renderer'
import { authMiddleware } from './auth.middleware'
import { domainMiddleware } from './domain.middleware'
import { dbMiddleware } from './db.middleware'
import { setCors } from './cors'

export const InitializeMiddlewares = (app: Hono<{ Bindings: CloudflareEnv }>) => {
    app.use('*', setCors)
    app.use('*', dbMiddleware)
    app.use('*', authMiddleware)
    app.use('*', domainMiddleware)
    app.use(renderer)
    return app
}
