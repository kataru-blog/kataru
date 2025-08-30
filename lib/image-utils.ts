import { eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { images } from '../entities'
import * as schema from '../entities'

export interface ProcessedImage {
  originalUrl: string
  thumbnailUrl: string
  r2Key: string
}

export class ImageProcessor {
  private db: DrizzleD1Database<typeof schema>
  private r2: R2Bucket
  private baseUrl: string

  constructor(db: DrizzleD1Database<typeof schema>, r2: R2Bucket, baseUrl: string) {
    this.db = db
    this.r2 = r2
    this.baseUrl = baseUrl
  }

  extractImageUrls(content: string): string[] {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)|<img[^>]+src=["'](https?:\/\/[^\s"']+)["']/gi
    const urls: string[] = []
    let match

    while ((match = imageRegex.exec(content)) !== null) {
      const url = match[1] || match[2]
      if (url && !url.startsWith(this.baseUrl)) {
        urls.push(url)
      }
    }

    return [...new Set(urls)]
  }

  async downloadImage(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KataruBot/1.0)',
        },
      })

      if (!response.ok) {
        console.error(`Failed to download image: ${url}, status: ${response.status}`)
        return null
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.startsWith('image/')) {
        console.error(`Invalid content type for image: ${contentType}`)
        return null
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error(`Error downloading image: ${url}`, error)
      return null
    }
  }

  async uploadToR2(
    buffer: ArrayBuffer,
    postId: string,
    originalUrl: string
  ): Promise<ProcessedImage | null> {
    try {
      const urlObj = new URL(originalUrl)
      const ext = urlObj.pathname.split('.').pop() || 'jpg'
      const fileName = `${crypto.randomUUID()}.${ext}`
      const originalKey = `posts/${postId}/original/${fileName}`
      
      const contentType = this.getContentType(ext)

      await this.r2.put(originalKey, buffer, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000',
        },
        customMetadata: {
          originalUrl,
          postId,
        },
      })

      const processedUrl = `${this.baseUrl}/r2/${originalKey}`
      const thumbnailUrl = processedUrl
      
      const imageRecord = {
        id: crypto.randomUUID(),
        postId,
        originalUrl: processedUrl,
        thumbnailUrl,
        r2Key: originalKey,
        size: buffer.byteLength,
        mimeType: contentType,
        createdAt: new Date(),
      }

      await this.db.insert(images).values(imageRecord)

      return {
        originalUrl: processedUrl,
        thumbnailUrl,
        r2Key: originalKey,
      }
    } catch (error) {
      console.error('Error uploading to R2:', error)
      return null
    }
  }

  async processContentImages(content: string, postId: string): Promise<string> {
    const imageUrls = this.extractImageUrls(content)
    
    if (imageUrls.length === 0) {
      return content
    }

    let processedContent = content
    const processPromises = imageUrls.map(async (url) => {
      const buffer = await this.downloadImage(url)
      if (!buffer) return { url, processed: null }

      const processed = await this.uploadToR2(buffer, postId, url)
      return { url, processed }
    })

    const results = await Promise.all(processPromises)

    for (const result of results) {
      if (result.processed) {
        processedContent = processedContent.replace(
          new RegExp(result.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          result.processed.originalUrl
        )
      }
    }

    return processedContent
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
    }
    return types[ext.toLowerCase()] || 'image/jpeg'
  }

  async deletePostImages(postId: string) {
    const postImages = await this.db
      .select()
      .from(images)
      .where(eq(images.postId, postId))
      .all()

    for (const image of postImages) {
      try {
        await this.r2.delete(image.r2Key)
        
        const thumbnailKey = image.r2Key.replace('/original/', '/thumbnail/')
        await this.r2.delete(thumbnailKey).catch(() => {})
      } catch (error) {
        console.error(`Error deleting image ${image.r2Key}:`, error)
      }
    }

    await this.db.delete(images).where(eq(images.postId, postId))
  }
}