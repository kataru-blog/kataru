import type { Context, Next } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { customDomains, blogs, user } from '../entities'

export const domainMiddleware = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const db = drizzle(c.env.DB)
    const hostname = new URL(c.req.url).hostname
    
    const isDefaultDomain = hostname === 'localhost' || hostname.includes('workers.dev') || hostname.includes(c.env.PRODUCTION_DOMAIN)

    console.log()
    
    if (isDefaultDomain) {
        const pathSegments = new URL(c.req.url).pathname.split('/').filter(Boolean)
        
        if (pathSegments.length > 0 && !pathSegments[0].startsWith('api') && !pathSegments[0].startsWith('auth') && !pathSegments[0].startsWith('r2')) {
            const userNickname = pathSegments[0]
            
            try {
                const blogData = await db
                    .select({
                        blog: blogs,
                        user: user
                    })
                    .from(blogs)
                    .innerJoin(user, eq(blogs.userId, user.id))
                    .where(eq(user.nickname, userNickname))
                    .get()
                
                if (blogData) {
                    c.set('blog', blogData.blog)
                    c.set('blogUser', blogData.user)
                    c.set('isCustomDomain', false)
                    
                    const adjustedPath = '/' + pathSegments.slice(1).join('/')
                    c.set('adjustedPath', adjustedPath)
                }
            } catch (error) {
                console.error('Error fetching blog by user email:', error)
            }
        }
    } else {
        try {
            const customDomain = await db
                .select({
                    domain: customDomains.domain,
                    blogId: customDomains.blogId,
                    blog: blogs
                })
                .from(customDomains)
                .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
                .where(eq(customDomains.domain, hostname))
                .get()
            
            if (customDomain) {
                c.set('blog', customDomain.blog)
                c.set('customDomain', customDomain.domain)
                c.set('isCustomDomain', true)
                c.set('adjustedPath', new URL(c.req.url).pathname)
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