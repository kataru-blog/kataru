import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { images } from '../entities'
import * as schema from '../entities'

export interface CloudflareImageResult {
  id: string
  filename: string
  uploaded: string
  variants: string[]
  requireSignedURLs: boolean
}

export class CloudflareImagesService {
  private accountId: string
  private apiToken: string
  private accountHash: string
  private db: DrizzleD1Database<typeof schema>

  constructor(
    db: DrizzleD1Database<typeof schema>,
    accountId: string,
    apiToken: string,
    accountHash: string
  ) {
    this.db = db
    this.accountId = accountId
    this.apiToken = apiToken
    this.accountHash = accountHash
  }

  /**
   * Cloudflare Images에 이미지 업로드
   */
  async uploadImage(
    file: File | Blob,
    postId: string,
    metadata?: Record<string, string>
  ): Promise<CloudflareImageResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    // 메타데이터 추가
    if (metadata) {
      formData.append('metadata', JSON.stringify({
        postId,
        ...metadata
      }))
    }

    // 커스텀 ID 설정 (선택사항)
    const customId = `post-${postId}-${crypto.randomUUID()}`
    formData.append('id', customId)

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload image: ${error}`)
    }

    const result = await response.json() as { success: boolean; result?: CloudflareImageResult; errors?: { message: string }[] }
    
    if (!result.success || !result.result) {
      throw new Error(`Upload failed: ${result.errors?.[0]?.message || 'No result returned'}`)
    }

    // DB에 이미지 정보 저장
    await this.saveImageRecord(postId, result.result)

    return result.result
  }

  /**
   * 이미지 URL 생성 (변환 포함)
   */
  getImageUrl(
    imageId: string,
    variant: 'public' | 'thumbnail' | 'original' = 'public'
  ): string {
    return `https://imagedelivery.net/${this.accountHash}/${imageId}/${variant}`
  }

  /**
   * 커스텀 변환 URL 생성
   */
  getCustomVariantUrl(
    imageId: string,
    options: {
      width?: number
      height?: number
      fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
      quality?: number
      format?: 'auto' | 'webp' | 'jpeg' | 'png'
    }
  ): string {
    const params = new URLSearchParams()
    
    if (options.width) params.append('w', options.width.toString())
    if (options.height) params.append('h', options.height.toString())
    if (options.fit) params.append('fit', options.fit)
    if (options.quality) params.append('q', options.quality.toString())
    if (options.format) params.append('f', options.format)

    return `https://imagedelivery.net/${this.accountHash}/${imageId}/public?${params}`
  }

  /**
   * DB에 이미지 정보 저장
   */
  private async saveImageRecord(
    postId: string,
    cfImage: CloudflareImageResult
  ) {
    const imageRecord = {
      id: crypto.randomUUID(),
      postId,
      originalUrl: this.getImageUrl(cfImage.id, 'original'),
      thumbnailUrl: this.getImageUrl(cfImage.id, 'thumbnail'),
      r2Key: cfImage.id, // Cloudflare Images ID를 키로 사용
      mimeType: 'image/webp',
      createdAt: new Date(),
    }

    await this.db.insert(images).values(imageRecord)
    return imageRecord
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imageId: string): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${response.statusText}`)
    }
  }

  /**
   * URL에서 이미지 업로드 (외부 이미지 처리)
   */
  async uploadFromUrl(
    imageUrl: string,
    postId: string
  ): Promise<CloudflareImageResult> {
    const formData = new FormData()
    formData.append('url', imageUrl)
    formData.append('metadata', JSON.stringify({ postId, originalUrl: imageUrl }))
    
    const customId = `post-${postId}-${crypto.randomUUID()}`
    formData.append('id', customId)

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload from URL: ${error}`)
    }

    const result = await response.json() as { success: boolean; result?: CloudflareImageResult; errors?: { message: string }[] }
    
    if (!result.success || !result.result) {
      throw new Error(`Upload failed: ${result.errors?.[0]?.message || 'No result returned'}`)
    }

    await this.saveImageRecord(postId, result.result)
    return result.result
  }

  /**
   * 본문의 외부 이미지를 Cloudflare Images로 마이그레이션
   */
  async processContentImages(content: string, postId: string): Promise<string> {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)|<img[^>]+src=["'](https?:\/\/[^\s"']+)["']/gi
    const urls: string[] = []
    let match

    while ((match = imageRegex.exec(content)) !== null) {
      const url = match[1] || match[2]
      if (url && !url.includes('imagedelivery.net')) {
        urls.push(url)
      }
    }

    if (urls.length === 0) {
      return content
    }

    let processedContent = content
    const uniqueUrls = [...new Set(urls)]
    
    for (const url of uniqueUrls) {
      try {
        const result = await this.uploadFromUrl(url, postId)
        const newUrl = this.getImageUrl(result.id, 'public')
        
        processedContent = processedContent.replace(
          new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newUrl
        )
      } catch (error) {
        console.error(`Failed to process image ${url}:`, error)
        // 실패한 이미지는 원본 URL 유지
      }
    }

    return processedContent
  }
}