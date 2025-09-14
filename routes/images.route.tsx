import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { blogs } from '../entities'
import { ImagesService } from '../services/images.service'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'
import * as postService from '../services/post.service'

export const ImagesRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    // 이미지 업로드 및 변환
    app.post('/images/upload', async (c) => {
        try {
            const user = c.get('user')
            if (!user) {
                throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
            }

            const formData = await c.req.formData()
            const file = formData.get('file') as File
            const postId = formData.get('postId') as string | null
            const blogId = formData.get('blogId') as string | null

            if (!file) {
                throw new AppError(ERROR_MESSAGES.GENERAL.BAD_REQUEST)
            }

            const db = c.get('db')

            // 권한 확인
            if (postId) {
                const post = await postService.getPostById(db, postId)
                if (!post || post.blog.userId !== user.id) {
                    throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
                }
            } else if (blogId) {
                const blog = await db.select().from(blogs).where(eq(blogs.id, blogId)).get()
                if (!blog || blog.userId !== user.id) {
                    throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
                }
            }

            const imagesService = new ImagesService(db, c.env.R2, c.env.BASE_URL)
            const result = await imagesService.uploadAndConvertImage(file, postId, blogId)

            return c.json({
                success: true,
                data: result,
            })
        } catch (error) {
            if (error instanceof AppError) {
                return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
            }
            console.error('Images upload error:', error)
            return c.json(
                { error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message },
                ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.status as Parameters<typeof c.json>[1],
            )
        }
    })

    // 이미지 목록 조회 (전체)
    app.get('/images/list', async (c) => {
        try {
            const db = c.get('db')
            const imagesService = new ImagesService(db, c.env.R2, c.env.BASE_URL)
            const images = await imagesService.getImagesByPostId()

            return c.json({
                success: true,
                data: images,
            })
        } catch (error) {
            if (error instanceof AppError) {
                return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
            }
            console.error('Images list error:', error)
            return c.json(
                { error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message },
                ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.status as Parameters<typeof c.json>[1],
            )
        }
    })

    // 이미지 목록 조회 (특정 게시글)
    app.get('/images/list/:postId', async (c) => {
        try {
            const postId = c.req.param('postId')
            const db = c.get('db')
            const imagesService = new ImagesService(db, c.env.R2, c.env.BASE_URL)
            const images = await imagesService.getImagesByPostId(postId)

            return c.json({
                success: true,
                data: images,
            })
        } catch (error) {
            if (error instanceof AppError) {
                return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
            }
            console.error('Images list error:', error)
            return c.json(
                { error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message },
                ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.status as Parameters<typeof c.json>[1],
            )
        }
    })

    // R2 버킷 내용 디버그 (임시)
    app.get('/images/debug/r2', async (c) => {
        try {
            const prefix = c.req.query('prefix') || 'images/'
            const listed = await c.env.R2.list({ prefix, limit: 100 })
            
            return c.json({
                success: true,
                prefix,
                count: listed.objects.length,
                objects: listed.objects.map(obj => ({
                    key: obj.key,
                    size: obj.size,
                    uploaded: obj.uploaded
                }))
            })
        } catch (error) {
            return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
        }
    })

    // 이미지 삭제
    app.delete('/images/:imageId', async (c) => {
        try {
            const user = c.get('user')
            if (!user) {
                throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
            }

            const imageId = c.req.param('imageId')
            const db = c.get('db')

            const imagesService = new ImagesService(db, c.env.R2, c.env.BASE_URL)
            await imagesService.deleteImageById(imageId, user.id)

            return c.json({
                success: true,
                message: ERROR_MESSAGES.IMAGE.DELETED.message,
            })
        } catch (error) {
            if (error instanceof AppError) {
                return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
            }
            console.error('Images delete error:', error)
            return c.json(
                { error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message },
                ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.status as Parameters<typeof c.json>[1],
            )
        }
    })

    return app
}
