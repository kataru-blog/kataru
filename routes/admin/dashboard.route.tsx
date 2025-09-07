import { getDashboardChartData, getDashboardSummary, getTopPostsByLikes, getTopPostsByViews } from '@/services/dashboard.admin.service'
import { Hono } from 'hono'

export const AdminDashboardRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/dashboard/summary', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const summary = await getDashboardSummary(db, blog.id)
        return c.json(summary)
    })

    app.get('/dashboard/chart', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const period = (c.req.query('period') as 'daily' | 'weekly' | 'monthly') || 'daily'

        const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined
        const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined

        const chartData = await getDashboardChartData(db, blog.id, period, {
            startDate,
            endDate,
        })

        return c.json({
            period,
            data: chartData,
        })
    })

    app.get('/dashboard/top-posts/views', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const limit = Number(c.req.query('limit') || 10)

        const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined
        const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined

        const topPosts = await getTopPostsByViews(db, blog.id, {
            limit,
            startDate,
            endDate,
        })

        return c.json(topPosts)
    })

    app.get('/dashboard/top-posts/likes', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const limit = Number(c.req.query('limit') || 10)

        const startDate = c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined
        const endDate = c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined

        const topPosts = await getTopPostsByLikes(db, blog.id, {
            limit,
            startDate,
            endDate,
        })

        return c.json(topPosts)
    })

    return app
}
