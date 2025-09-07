import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { Context, Next } from 'hono'
import { blogs, customDomains, user } from '../entities'

export const domainMiddleware = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const db = drizzle(c.env.DB)
    const hostname = new URL(c.req.url).hostname

    const isDefaultDomain = hostname.includes('localhost') || hostname.includes('workers.dev') || hostname.includes(c.env.PRODUCTION_DOMAIN)

    if (isDefaultDomain) {
        const pathSegments = new URL(c.req.url).pathname.split('/').filter(Boolean)

        if (
            pathSegments.length > 0 &&
            !pathSegments[0].startsWith('api') &&
            !pathSegments[0].startsWith('auth') &&
            !pathSegments[0].startsWith('r2') &&
            !pathSegments[0].startsWith('.well-known') &&
            !pathSegments[0].startsWith('login') &&
            !pathSegments[0].startsWith('sign-up') &&
            !pathSegments[0].startsWith('logout')
        ) {
            const userNickname = decodeURIComponent(pathSegments[0])

            try {
                const userData = await db.select().from(user).where(eq(user.nickname, userNickname)).get()

                if (userData) {
                    const blogData = await db.select().from(blogs).where(eq(blogs.userId, userData.id)).get()

                    if (blogData) {
                        c.set('blog', blogData)
                        c.set('blogUser', userData)
                        c.set('isCustomDomain', false)

                        const adjustedPath = '/' + pathSegments.slice(1).join('/')
                        c.set('adjustedPath', adjustedPath)
                    }
                }
            } catch (error) {
                console.error('Error fetching blog by user email:', error)
            }
        }
    } else {
        try {
            const customDomain = await db.select().from(customDomains).where(eq(customDomains.domain, hostname)).get()

            if (customDomain) {
                const blogData = await db.select().from(blogs).where(eq(blogs.id, customDomain.blogId)).get()

                if (blogData) {
                    c.set('blog', blogData)
                    c.set('customDomain', customDomain.domain)
                    c.set('isCustomDomain', true)
                    c.set('adjustedPath', new URL(c.req.url).pathname)
                }
            } else {
                return c.text(`Domain not found 'isDefaultDomain', isDefaultDomain, ${hostname} : ${c.env.BASE_URL}`, 404)
            }
        } catch (error) {
            console.error('Error fetching custom domain:', error)
            return c.text('Internal Server Error', 500)
        }
    }

    return await next()
}

export const requireBlog = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const blog = c.get('blog')

    if (!blog) {
        return c.text('Blog not found', 404)
    }

    return await next()
}
