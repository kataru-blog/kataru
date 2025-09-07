import { getCommentsByPostId, createComment } from '@/services/comment.service'
import { getHotArticles, getPostById, getPosts, getPostsByBlogId } from '@/services/post.service'
import { getAllTags, getTagsByBlogId } from '@/services/tag.service'
import { toggleLike, isLikedByUser } from '@/services/engagement.service'
import { Hono } from 'hono'

export const GatewayRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.get('/posts', async (c) => {
        const db = c.get('db')
        const page = Number(c.req.query('page') || 1)
        const limit = Number(c.req.query('limit') || 10)
        const offset = (page - 1) * limit

        const posts = await getPosts(db, {
            tagId: c.req.query('tagId'),
            keyword: c.req.query('keyword'),
            orderBy: c.req.query('orderBy') as 'newest' | 'most_view' | 'most_like' | undefined,
            limit,
            offset,
        })

        return c.json(posts)
    })

    app.get('/posts/:blogId', async (c) => {
        const db = c.get('db')
        return c.json(
            getPostsByBlogId(db, c.req.param('blogId'), {
                orderBy: c.req.query('orderBy') as 'newest' | 'most_view' | 'most_like' | undefined,
                limit: Number(c.req.query('limit') || 10),
                offset: Number(c.req.query('page') || 1),
            }),
        )
    })

    app.get('/post/:postId', async (c) => {
        const db = c.get('db')
        return c.json(getPostById(db, c.req.param('postId')))
    })

    app.get('hots', async (c) => {
        const db = c.get('db')
        return c.json(getHotArticles(db, Number(c.req.query('limit') || 5)))
    })

    app.get('/tags', async (c) => {
        const db = c.get('db')
        return c.json(
            getAllTags(db, {
                limit: Number(c.req.query('limit') || 5),
                offset: Number(c.req.query('page') || 1),
                orderBy: 'name',
            }),
        )
    })

    app.get('/tags/:blogId', async (c) => {
        const db = c.get('db')
        return c.json(
            getTagsByBlogId(db, c.req.param('blogId'), {
                limit: Number(c.req.query('limit') || 5),
                orderBy: c.req.query('orderBy') as 'name' | 'popular' | undefined,
            }),
        )
    })

    app.get('/comments/:postId', async (c) => {
        const db = c.get('db')
        const page = Number(c.req.query('page') || 1)
        const limit = Number(c.req.query('limit') || 50)
        const offset = (page - 1) * limit
        
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
            return c.json({ error: '로그인이 필요합니다.' }, 401)
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
            return c.json({ error: '로그인이 필요합니다.' }, 401)
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
