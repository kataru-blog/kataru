import { Hono } from 'hono'
import { CloudflareImagesService } from '../services/cloudflare-images.service'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'
import * as postService from '../services/post.service'

export const CloudflareImagesRoute = () => {
    const app = new Hono<{ Bindings: CloudflareEnv }>()

    app.post('/api/cf-images/upload', async (c) => {
        try {
            const user = c.get('user')
            if (!user) {
                throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
            }

            const formData = await c.req.formData()
            const file = formData.get('file') as File
            const postId = formData.get('postId') as string

            if (!file || !postId) {
                throw new AppError(ERROR_MESSAGES.GENERAL.BAD_REQUEST)
            }

            const db = c.get('db')

            const post = await postService.getPostById(db, postId)
            if (!post || post.blog.userId !== user.id) {
                throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
            }

            if (!c.env.CF_ACCOUNT_ID || !c.env.CF_IMAGES_API_TOKEN || !c.env.CF_IMAGES_ACCOUNT_HASH) {
                throw new Error('Cloudflare Images credentials not configured')
            }

            const cfImages = new CloudflareImagesService(db, c.env.CF_ACCOUNT_ID, c.env.CF_IMAGES_API_TOKEN, c.env.CF_IMAGES_ACCOUNT_HASH)

            const result = await cfImages.uploadImage(file, postId, {
                uploadedBy: user.id,
                timestamp: new Date().toISOString(),
            })

            return c.json({
                success: true,
                data: {
                    id: result.id,
                    url: cfImages.getImageUrl(result.id, 'public'),
                    thumbnailUrl: cfImages.getImageUrl(result.id, 'thumbnail'),
                    variants: {
                        small: cfImages.getCustomVariantUrl(result.id, { width: 400, quality: 80 }),
                        medium: cfImages.getCustomVariantUrl(result.id, { width: 800, quality: 85 }),
                        large: cfImages.getCustomVariantUrl(result.id, { width: 1200, quality: 90 }),
                    },
                },
            })
        } catch (error) {
            if (error instanceof AppError) {
                return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
            }
            console.error('CF Images upload error:', error)
            return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.status as Parameters<typeof c.json>[1])
        }
    })

    return app
}
