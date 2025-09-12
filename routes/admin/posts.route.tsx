import { Hono } from 'hono'
import { 
    getAdminPosts,
    getAdminPostById,
    createAdminPost,
    updateAdminPost,
    deleteAdminPost
} from '@/services/post.admin.service'
import { ERROR_MESSAGES } from '@/shared/constant/error-messages'

export const AdminPostsRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/posts', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        
        const keyword = c.req.query('keyword')
        const sortBy = c.req.query('sortBy') as 'createdAt' | 'title' | undefined
        const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined
        const limit = Number(c.req.query('limit') || 20)
        const page = Number(c.req.query('page') || 1)
        const offset = (page - 1) * limit
        const includeHidden = c.req.query('includeHidden') === 'true'
        
        const result = await getAdminPosts(db, blog.id, {
            keyword,
            sortBy,
            sortOrder,
            limit,
            offset,
            includeHidden
        })
        
        return c.json({
            ...result,
            page,
            totalPages: Math.ceil(result.totalCount / limit)
        })
    })
    
    app.get('/posts/:postId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const postId = c.req.param('postId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const post = await getAdminPostById(db, postId, user.id)
        return c.json(post)
    })
    
    app.post('/posts', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await createAdminPost(db, blog.id, user.id, {
            title: body.title,
            content: body.content,
            thumbnailUrl: body.thumbnailUrl,
            summary: body.summary,
            isNotice: body.isNotice,
            allowComment: body.allowComment,
            tags: body.tags
        })
        
        return c.json(result, 201)
    })
    
    app.put('/posts/:postId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const postId = c.req.param('postId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        
        const result = await updateAdminPost(db, postId, user.id, {
            title: body.title,
            content: body.content,
            thumbnailUrl: body.thumbnailUrl,
            summary: body.summary,
            isNotice: body.isNotice,
            allowComment: body.allowComment,
            isHidden: body.isHidden,
            tags: body.tags
        })
        
        return c.json(result)
    })
    
    app.delete('/posts/:postId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const postId = c.req.param('postId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const result = await deleteAdminPost(db, postId, user.id)
        return c.json(result)
    })

    return app
}