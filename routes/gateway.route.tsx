import { getCommentsByPostId, createComment } from '@/services/comment.service'
import { getHotArticles, getPostById, getPosts, getPostsByBlogId } from '@/services/post.service'
import { getAllTags, getTagsByBlogId } from '@/services/tag.service'
import { toggleLike, isLikedByUser } from '@/services/engagement.service'
import { ERROR_MESSAGES } from '@/shared/constant/error-messages'
import { Hono } from 'hono'

const validatePagination = (page?: string, limit?: string) => {
    const pageNum = Math.max(1, Number(page || 1))
    const limitNum = Math.min(100, Math.max(1, Number(limit || 10)))
    const offset = (pageNum - 1) * limitNum
    
    return { page: pageNum, limit: limitNum, offset }
}

const sanitizeSearchParam = (param?: string) => {
    if (!param) return undefined
    return param.replace(/[%_]/g, '\\$&')
}

export const GatewayRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/posts', async (c) => {
        const db = c.get('db')
        const { page, limit, offset } = validatePagination(c.req.query('page'), c.req.query('limit'))

        const posts = await getPosts(db, {
            tagId: c.req.query('tagId'),
            keyword: sanitizeSearchParam(c.req.query('keyword')),
            orderBy: c.req.query('orderBy') as 'newest' | 'most_view' | 'most_like' | undefined,
            limit,
            offset,
        })

        return c.json(posts)
    })

    app.get('/posts/:blogId', async (c) => {
        const db = c.get('db')
        const { limit, offset } = validatePagination(c.req.query('page'), c.req.query('limit'))
        
        return c.json(
            getPostsByBlogId(db, c.req.param('blogId'), {
                orderBy: c.req.query('orderBy') as 'newest' | 'most_view' | 'most_like' | undefined,
                limit,
                offset,
            }),
        )
    })

    app.get('/post/:postId', async (c) => {
        const db = c.get('db')
        return c.json(getPostById(db, c.req.param('postId')))
    })

    app.get('hots', async (c) => {
        const db = c.get('db')
        const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || 5)))
        return c.json(getHotArticles(db, limit))
    })

    app.get('/tags', async (c) => {
        const db = c.get('db')
        const { limit, offset } = validatePagination(c.req.query('page'), c.req.query('limit'))
        
        return c.json(
            getAllTags(db, {
                limit,
                offset,
                orderBy: 'name',
            }),
        )
    })

    app.get('/tags/:blogId', async (c) => {
        const db = c.get('db')
        const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || 5)))
        
        return c.json(
            getTagsByBlogId(db, c.req.param('blogId'), {
                limit,
                orderBy: c.req.query('orderBy') as 'name' | 'popular' | undefined,
            }),
        )
    })

    app.get('/comments/:postId', async (c) => {
        const db = c.get('db')
        const { limit, offset } = validatePagination(c.req.query('page'), c.req.query('limit'))
        
        return c.json(
            await getCommentsByPostId(db, c.req.param('postId'), c.get('user')?.id, {
                limit,
                offset,
                orderBy: c.req.query('orderBy') as 'latest' | 'oldest' | undefined,
            }),
        )
    })

    app.post('/comments/:postId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const body = await c.req.json()
        const comment = await createComment(db, c.req.param('postId'), user.id, {
            content: body.content,
            isSecret: body.isSecret,
            parentId: body.parentId
        })
        
        return c.json(comment)
    })

    app.get('/likes/:postId', async (c) => {
        const db = c.get('db')
        const postId = c.req.param('postId')
        const user = c.get('user')
        
        const postData = await getPostById(db, postId, false)
        const isLiked = user ? await isLikedByUser(db, postId, user.id) : false
        
        return c.json({
            likeCount: postData.likeCount || 0,
            isLiked
        })
    })

    app.post('/likes/:postId', async (c) => {
        const db = c.get('db')
        const user = c.get('user')
        const postId = c.req.param('postId')
        
        if (!user) {
            return c.json({ error: ERROR_MESSAGES.AUTH.UNAUTHORIZED.message }, ERROR_MESSAGES.AUTH.UNAUTHORIZED.status)
        }
        
        const result = await toggleLike(db, postId, user.id)
        const postData = await getPostById(db, postId, false)
        
        return c.json({
            liked: result.liked,
            likeCount: postData.likeCount || 0
        })
    })

    return app
}
