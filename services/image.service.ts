import { eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { images } from '../entities'
import * as schema from '../entities'

interface ImageUploadResult {
  originalUrl: string
  thumbnailUrl: string
  r2Key: string
  width?: number
  height?: number
  size?: number
  mimeType?: string
}

export class ImageService {
  private db: DrizzleD1Database<typeof schema>
  private r2: R2Bucket
  private baseUrl: string

  constructor(db: DrizzleD1Database<typeof schema>, r2: R2Bucket, baseUrl: string) {
    this.db = db
    this.r2 = r2
    this.baseUrl = baseUrl
  }

  async uploadImage(
    file: File,
    postId: string
  ): Promise<ImageUploadResult> {
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${postId}/${crypto.randomUUID()}-${file.name}`
    
    const originalKey = `original/${fileName}`
    const thumbnailKey = `thumbnail/${fileName}`

    await this.r2.put(originalKey, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    })

    const thumbnailBuffer = await this.generateThumbnail(fileBuffer, file.type)
    await this.r2.put(thumbnailKey, thumbnailBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    })

    const imageData = {
      id: crypto.randomUUID(),
      postId,
      originalUrl: `${this.baseUrl}/r2/${originalKey}`,
      thumbnailUrl: `${this.baseUrl}/r2/${thumbnailKey}`,
      r2Key: originalKey,
      size: file.size,
      mimeType: file.type,
    }

    await this.db.insert(images).values(imageData)

    return imageData
  }

  private async generateThumbnail(
    buffer: ArrayBuffer,
    mimeType: string
  ): Promise<ArrayBuffer> {
    return buffer
  }

  async getImagesByPostId(postId: string) {
    return await this.db
      .select()
      .from(images)
      .where(eq(images.postId, postId))
      .all()
  }

  async deleteImage(imageId: string) {
    const image = await this.db
      .select()
      .from(images)
      .where(eq(images.id, imageId))
      .get()

    if (image) {
      const originalKey = image.r2Key
      const thumbnailKey = originalKey.replace('original/', 'thumbnail/')
      
      await this.r2.delete(originalKey)
      await this.r2.delete(thumbnailKey)
      
      await this.db.delete(images).where(eq(images.id, imageId))
    }

    return image
  }

  async deleteImagesByPostId(postId: string) {
    const postImages = await this.getImagesByPostId(postId)
    
    for (const image of postImages) {
      await this.deleteImage(image.id)
    }
  }
}