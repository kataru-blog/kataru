import { Hono } from 'hono'
import { AuthRoute } from './auth.route'
import { CloudflareImagesRoute } from './cf-images.route'
import { ImageRoute } from './image.route'
import { PagesRoute } from './pages.route'

export const InitializeRoutes = async (app: Hono<{ Bindings: CloudflareEnv }>) => {
    app.route('/', PagesRoute())
    app.route('/', AuthRoute())
    app.route('/', ImageRoute())
    app.route('/', CloudflareImagesRoute())

    return app
}
