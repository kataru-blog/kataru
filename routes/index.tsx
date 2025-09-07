import { Hono } from 'hono'
import { AdminRoutes } from './admin'
import { AuthRoute } from './auth.route'
import { CloudflareImagesRoute } from './cf-images.route'
import { GatewayRoute } from './gateway.route'
import { PagesRoute } from './pages.route'

export const InitializeRoutes = async (app: Hono<{ Bindings: CloudflareEnv }>) => {
    app.route('/', CloudflareImagesRoute())
    app.route('/api', GatewayRoute())
    app.route('/api/admin', AdminRoutes())
    app.route('/', PagesRoute())
    app.route('/', AuthRoute())

    return app
}
