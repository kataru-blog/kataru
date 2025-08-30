import { Hono } from 'hono'
import { AuthRoute } from './auth.route'
import { CloudflareImagesRoute } from './cf-images.route'
import { DevRoute } from './dev.route'
import { ImageRoute } from './image.route'
import { PagesRoute } from './pages.route'
import { PostRoute } from './post.route'

export const InitializeRoutes = async (app: Hono<{ Bindings: CloudflareEnv }>) => {
    app.route('/', PagesRoute())
    app.route('/', AuthRoute())
    app.route('/', DevRoute())
    app.route('/', ImageRoute())
    app.route('/', PostRoute())
    app.route('/', CloudflareImagesRoute())

    return app
}
