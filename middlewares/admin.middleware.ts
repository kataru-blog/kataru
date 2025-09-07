import { blogs } from '@/entities'
import { createAuth } from '@/lib/auth'
import { User } from 'better-auth/*'
import { eq } from 'drizzle-orm'
import { Context, Next } from 'hono'

export const adminMiddleware = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const auth = createAuth(c.env)
    const db = c.get('db')

    try {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        })

        if (session) {
            c.set('user', session.user as User & { nickname?: string })
            c.set('session', session.session)
            const blogData = await db.select().from(blogs).where(eq(blogs.userId, session.user.id)).get()
            if (blogData) c.set('blog', blogData)
        } else {
            c.set('user', undefined)
            c.set('session', undefined)
        }
    } catch (error) {
        console.error('Auth middleware error:', error)
        c.set('user', undefined)
        c.set('session', undefined)
    }

    return await next()
}
