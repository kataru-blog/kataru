import { Hono } from 'hono'
import * as postService from '../services/post.service'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

export const PostRoute = () => {
  const app = new Hono<{ Bindings: CloudflareEnv }>()

  // Create post
  app.post('/api/posts', async (c) => {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
      }

      const db = c.get('db')
      const data = await c.req.json()
      const { blogId, ...postData } = data

      if (!blogId) {
        throw new AppError(ERROR_MESSAGES.GENERAL.BAD_REQUEST)
      }

      const post = await postService.createPost(
        db,
        blogId,
        user.id,
        postData,
        c.env.R2,
        c.env.BASE_URL
      )

      return c.json({ success: true, data: post }, 201)
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
      }
      console.error('Create post error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Update post
  app.put('/api/posts/:id', async (c) => {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
      }

      const db = c.get('db')
      const postId = c.req.param('id')
      const data = await c.req.json()

      const post = await postService.updatePost(
        db,
        postId,
        user.id,
        data,
        c.env.R2,
        c.env.BASE_URL
      )

      return c.json({ success: true, data: post })
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
      }
      console.error('Update post error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Delete post
  app.delete('/api/posts/:id', async (c) => {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
      }

      const db = c.get('db')
      const postId = c.req.param('id')

      await postService.deletePost(
        db,
        postId,
        user.id,
        c.env.R2,
        c.env.BASE_URL
      )

      return c.json({ success: true })
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
      }
      console.error('Delete post error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Get post by ID
  app.get('/api/posts/:id', async (c) => {
    try {
      const db = c.get('db')
      const postId = c.req.param('id')

      const post = await postService.getPostById(db, postId)
      
      if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
      }

      return c.json({ success: true, data: post })
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
      }
      console.error('Get post error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Get posts by blog ID
  app.get('/api/blogs/:blogId/posts', async (c) => {
    try {
      const db = c.get('db')
      const blogId = c.req.param('blogId')
      
      const limit = parseInt(c.req.query('limit') || '10')
      const offset = parseInt(c.req.query('offset') || '0')
      const orderBy = c.req.query('orderBy') as 'latest' | 'oldest' | 'popular' | undefined
      const tagId = c.req.query('tagId')

      const posts = await postService.getPostsByBlogId(db, blogId, {
        limit,
        offset,
        orderBy,
        tagId,
      })

      return c.json({ success: true, data: posts })
    } catch (error) {
      console.error('Get posts error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Get posts by tag
  app.get('/api/tags/:tagId/posts', async (c) => {
    try {
      const db = c.get('db')
      const tagId = c.req.param('tagId')
      
      const limit = parseInt(c.req.query('limit') || '10')
      const offset = parseInt(c.req.query('offset') || '0')

      const posts = await postService.getPostsByTag(db, tagId, {
        limit,
        offset,
      })

      return c.json({ success: true, data: posts })
    } catch (error) {
      console.error('Get posts by tag error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  // Upload image for post
  app.post('/api/posts/:postId/images', async (c) => {
    try {
      const user = c.get('user')
      if (!user) {
        throw new AppError(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
      }

      const postId = c.req.param('postId')
      const formData = await c.req.formData()
      const file = formData.get('file') as File

      if (!file) {
        throw new AppError(ERROR_MESSAGES.GENERAL.BAD_REQUEST)
      }

      const db = c.get('db')
      
      // Verify post ownership
      const post = await postService.getPostById(db, postId)
      if (!post || post.blog.userId !== user.id) {
        throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
      }

      const { ImageService } = await import('../services/image.service')
      const imageService = new ImageService(db, c.env.R2, c.env.BASE_URL)
      const result = await imageService.uploadImage(file, postId)

      return c.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as Parameters<typeof c.json>[1])
      }
      console.error('Upload image error:', error)
      return c.json({ error: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR.message }, 500 as Parameters<typeof c.json>[1])
    }
  })

  return app
}