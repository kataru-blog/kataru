import { Hono } from 'hono'
import { AdminDashboardRoute } from './dashboard.route'
import { AdminPostsRoute } from './posts.route'
import { AdminCommentsRoute } from './comments.route'
import { AdminBlogRoute } from './blog.route'
import { adminMiddleware } from '@/middlewares/admin.middleware'

export const AdminRoutes = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()
    app.use('*', adminMiddleware)
    app.route('/', AdminDashboardRoute())
    app.route('/', AdminPostsRoute())
    app.route('/', AdminCommentsRoute())
    app.route('/', AdminBlogRoute())

    return app
}
