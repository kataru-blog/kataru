import { Hono } from 'hono'
import { 
    getAdminComments,
    deleteAdminComment
} from '@/services/comment.admin.service'

export const AdminCommentsRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/comments', async (c) => {
        const db = c.get('db')
        const blog = c.get('blog')!
        
        const keyword = c.req.query('keyword')
        const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined
        const limit = Number(c.req.query('limit') || 20)
        const page = Number(c.req.query('page') || 1)
        const offset = (page - 1) * limit
        
        const result = await getAdminComments(db, blog.id, {
            keyword,
            sortOrder,
            limit,
            offset
        })
        
        return c.json({
            ...result,
            page,
            totalPages: Math.ceil(result.totalCount / limit)
        })
    })
    
    app.delete('/comments/:commentId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const commentId = c.req.param('commentId')
        
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401)
        }
        
        const result = await deleteAdminComment(db, commentId, user.id)
        return c.json(result)
    })

    return app
}