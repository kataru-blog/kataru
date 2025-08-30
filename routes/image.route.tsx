import { Hono } from 'hono'
import { ImageService } from '../services/image.service'

export const ImageRoute = () => {
  const app = new Hono<{ Bindings: CloudflareEnv }>()

  app.get('/r2/*', async (c) => {
    const key = c.req.param('*')
    if (!key) {
      return c.text('Not Found', 404)
    }

    const object = await c.env.R2.get(key)
    if (!object) {
      return c.text('Not Found', 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('cache-control', 'public, max-age=31536000, immutable')

    return new Response(object.body, {
      headers,
    })
  })

  app.post('/api/images/upload', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const postId = formData.get('postId') as string

    if (!file || !postId) {
      return c.json({ error: 'Missing file or postId' }, 400)
    }

    const db = c.get('db')
    const imageService = new ImageService(db, c.env.R2, c.env.BASE_URL)

    try {
      const result = await imageService.uploadImage(file, postId)
      return c.json(result)
    } catch (error) {
      console.error('Image upload error:', error)
      return c.json({ error: 'Failed to upload image' }, 500)
    }
  })

  app.delete('/api/images/:id', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const imageId = c.req.param('id')
    const db = c.get('db')
    const imageService = new ImageService(db, c.env.R2, c.env.BASE_URL)

    try {
      const deleted = await imageService.deleteImage(imageId)
      if (!deleted) {
        return c.json({ error: 'Image not found' }, 404)
      }
      return c.json({ success: true })
    } catch (error) {
      console.error('Image delete error:', error)
      return c.json({ error: 'Failed to delete image' }, 500)
    }
  })

  return app
}