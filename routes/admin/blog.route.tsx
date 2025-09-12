import { Hono } from 'hono'
import { 
    getBlogInfo,
    updateBlogInfo,
    getCustomDomains,
    createCustomDomain,
    updateCustomDomain,
    deleteCustomDomain,
    getCustomLinks,
    createCustomLink,
    updateCustomLink,
    deleteCustomLink,
    reorderCustomLinks,
    getUserInfo,
    updateUserInfo
} from '@/services/blog.admin.service'
import { ERROR_MESSAGES } from '@/shared/constant/error-messages'

export const AdminBlogRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/blog', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const blogInfo = await getBlogInfo(db, blog.id, user.id)
        return c.json(blogInfo)
    })
    
    app.put('/blog', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await updateBlogInfo(db, blog.id, user.id, {
            title: body.title,
            description: body.description,
            faviconUrl: body.faviconUrl,
        })
        
        return c.json(result)
    })
    
    app.get('/domains', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const domains = await getCustomDomains(db, blog.id, user.id)
        return c.json({ domains })
    })
    
    app.post('/domains', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await createCustomDomain(db, blog.id, user.id, body.domain)
        return c.json(result, 201)
    })
    
    app.put('/domains/:domainId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const domainId = c.req.param('domainId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await updateCustomDomain(db, domainId, user.id, body.domain)
        return c.json(result)
    })
    
    app.delete('/domains/:domainId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const domainId = c.req.param('domainId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const result = await deleteCustomDomain(db, domainId, user.id)
        return c.json(result)
    })
    
    app.get('/links', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const links = await getCustomLinks(db, user.id)
        return c.json({ links })
    })
    
    app.post('/links', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await createCustomLink(db, user.id, {
            url: body.url,
            label: body.label,
            sortOrder: body.sortOrder,
        })
        
        return c.json(result, 201)
    })
    
    app.put('/links/:linkId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const linkId = c.req.param('linkId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await updateCustomLink(db, linkId, user.id, {
            url: body.url,
            label: body.label,
            sortOrder: body.sortOrder,
        })
        
        return c.json(result)
    })
    
    app.delete('/links/:linkId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const linkId = c.req.param('linkId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const result = await deleteCustomLink(db, linkId, user.id)
        return c.json(result)
    })
    
    app.put('/links/reorder', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await reorderCustomLinks(db, user.id, body.linkOrders)
        return c.json(result)
    })
    
    app.get('/user', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const userInfo = await getUserInfo(db, user.id)
        return c.json(userInfo)
    })
    
    app.put('/user', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await updateUserInfo(db, user.id, {
            name: body.name,
            nickname: body.nickname,
            image: body.image,
        })
        
        return c.json(result)
    })

    return app
}