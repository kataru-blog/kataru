import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { images, posts, blogs } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

interface ConvertResponse {
    mobile: string
    tablet: string
    pc: string
    thumbnail: string
    original: string
}

interface ImageVariant {
    type: 'mobile' | 'tablet' | 'pc' | 'thumbnail' | 'original'
    r2Key: string
    url: string
}

export class ImagesService {
    private db: DrizzleD1Database<typeof schema>
    private r2: R2Bucket
    private baseUrl: string
    private convertServerUrl = 'https://convert.gumyo.net'

    constructor(db: DrizzleD1Database<typeof schema>, r2: R2Bucket, baseUrl: string) {
        this.db = db
        this.r2 = r2
        this.baseUrl = baseUrl
    }

    /**
     * 이미지 업로드 및 변환 전체 플로우
     */
    async uploadAndConvertImage(
        file: File | Blob,
        postId: string | null,
        blogId: string | null
    ) {
        const imageId = crypto.randomUUID()
        const basePath = this.getBasePath(postId, blogId)
        
        try {
            // 1. 원본 파일을 R2에 저장
            const originalKey = await this.saveOriginalToR2(file, basePath, imageId)
            
            // 2. convert 서버에 이미지 변환 요청
            const convertedUrls = await this.convertImage(file)
            
            // 3. 변환된 이미지들을 다운로드하여 R2에 저장
            const variants = await this.downloadAndSaveVariants(convertedUrls, basePath, imageId)
            
            // 4. DB에 저장
            const imageRecord = await this.saveImageRecord(postId, blogId, imageId, variants, originalKey)
            
            return {
                ...imageRecord,
                url: variants.find(v => v.type === 'pc')?.url || variants[0].url,
                thumbnailUrl: variants.find(v => v.type === 'thumbnail')?.url,
                variants: {
                    mobile: variants.find(v => v.type === 'mobile')?.url,
                    tablet: variants.find(v => v.type === 'tablet')?.url,
                    pc: variants.find(v => v.type === 'pc')?.url,
                    thumbnail: variants.find(v => v.type === 'thumbnail')?.url,
                    original: `${this.baseUrl}/r2/${originalKey}`,
                },
            }
        } catch (error) {
            // 에러 발생 시 R2에서 이미 업로드된 파일들 삭제 (롤백)
            await this.rollbackUpload(basePath, imageId)
            throw error
        }
    }

    /**
     * 원본 파일을 R2에 저장
     */
    private async saveOriginalToR2(file: File | Blob, basePath: string, imageId: string): Promise<string> {
        const extension = file.type.split('/')[1] || 'jpg'
        const r2Key = `${basePath}/${imageId}/original.${extension}`
        
        console.log(`Saving original to R2: ${r2Key}, type: ${file.type}, size: ${file.size}`)
        await this.r2.put(r2Key, file, {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
            },
        })
        console.log(`Original saved to R2: ${r2Key}`)
        
        return r2Key
    }

    /**
     * convert 서버에 이미지 변환 요청
     */
    private async convertImage(file: File | Blob): Promise<ConvertResponse> {
        const formData = new FormData()
        formData.append('image', file)
        
        console.log('Sending image to convert server...')
        const response = await fetch(`${this.convertServerUrl}/convert`, {
            method: 'POST',
            body: formData,
        })
        
        if (!response.ok) {
            const errorText = await response.text()
            console.error('Convert server error:', response.status, errorText)
            throw new Error(`Convert server error: ${response.statusText}`)
        }
        
        const result = await response.json() as ConvertResponse
        console.log('Convert server response:', result)
        return result
    }

    /**
     * 변환된 이미지들을 다운로드하여 R2에 저장
     */
    private async downloadAndSaveVariants(
        convertedUrls: ConvertResponse,
        basePath: string,
        imageId: string
    ): Promise<ImageVariant[]> {
        const variants: ImageVariant[] = []
        
        for (const [type, path] of Object.entries(convertedUrls)) {
            if (type === 'original') continue // 원본은 이미 저장했으므로 스킵
            
            // convert 서버에서 이미지 다운로드
            const imageUrl = `${this.convertServerUrl}${path}`
            console.log(`Downloading ${type} from: ${imageUrl}`)
            const response = await fetch(imageUrl)
            
            if (!response.ok) {
                console.error(`Failed to download variant ${type}:`, response.status)
                throw new Error(`Failed to download variant ${type}`)
            }
            
            const imageBuffer = await response.arrayBuffer()
            console.log(`Downloaded ${type}, size: ${imageBuffer.byteLength} bytes`)
            
            // R2에 저장
            const r2Key = `${basePath}/${imageId}/${type}.webp`
            console.log(`Saving to R2: ${r2Key}`)
            await this.r2.put(r2Key, imageBuffer, {
                httpMetadata: {
                    contentType: 'image/webp',
                    cacheControl: 'public, max-age=31536000',
                },
            })
            console.log(`Saved ${type} to R2: ${r2Key}`)
            
            variants.push({
                type: type as ImageVariant['type'],
                r2Key,
                url: `${this.baseUrl}/r2/${r2Key}`,
            })
        }
        
        return variants
    }

    /**
     * DB에 이미지 정보 저장
     */
    private async saveImageRecord(
        postId: string | null,
        blogId: string | null,
        imageId: string,
        variants: ImageVariant[],
        originalKey: string
    ) {
        const thumbnailUrl = variants.find(v => v.type === 'thumbnail')?.url || ''
        
        const imageRecord = {
            id: imageId,
            postId: postId || null,
            blogId: blogId || null,
            originalUrl: `${this.baseUrl}/r2/${originalKey}`,
            thumbnailUrl,
            r2Key: imageId, // 이미지 폴더 ID로 사용
            mimeType: 'image/webp',
            createdAt: new Date(),
        }
        
        await this.db.insert(images).values(imageRecord as any)
        return imageRecord
    }

    /**
     * 에러 발생 시 R2에서 업로드된 파일들 삭제
     */
    private async rollbackUpload(basePath: string, imageId: string) {
        try {
            // R2에서 해당 폴더의 모든 파일 삭제
            const prefix = `${basePath}/${imageId}/`
            const objects = await this.r2.list({ prefix })
            
            for (const object of objects.objects) {
                await this.r2.delete(object.key)
            }
        } catch (error) {
            console.error('Failed to rollback upload:', error)
        }
    }

    /**
     * 경로 생성 헬퍼
     */
    private getBasePath(postId: string | null, blogId: string | null): string {
        if (postId) return `images/posts/${postId}`
        if (blogId) return `images/blogs/${blogId}`
        return `images/temp`
    }

    /**
     * 이미지 목록 조회
     */
    async getImagesByPostId(postId?: string) {
        const imagesData = postId
            ? await this.db.select().from(images).where(eq(images.postId, postId)).orderBy(desc(images.createdAt)).all()
            : await this.db.select().from(images).orderBy(desc(images.createdAt)).all()
        
        return imagesData.map(img => {
            const basePath = this.getBasePath(img.postId, img.blogId)
            const imageId = img.r2Key
            
            return {
                ...img,
                originalUrl: img.originalUrl.startsWith('http') ? img.originalUrl : `${this.baseUrl}${img.originalUrl}`,
                thumbnailUrl: img.thumbnailUrl?.startsWith('http') ? img.thumbnailUrl : img.thumbnailUrl ? `${this.baseUrl}${img.thumbnailUrl}` : '',
                variants: {
                    mobile: `${this.baseUrl}/r2/${basePath}/${imageId}/mobile.webp`,
                    tablet: `${this.baseUrl}/r2/${basePath}/${imageId}/tablet.webp`,
                    pc: `${this.baseUrl}/r2/${basePath}/${imageId}/pc.webp`,
                    thumbnail: `${this.baseUrl}/r2/${basePath}/${imageId}/thumbnail.webp`,
                    original: img.originalUrl.startsWith('http') ? img.originalUrl : `${this.baseUrl}${img.originalUrl}`,
                }
            }
        })
    }

    /**
     * 이미지 삭제 (R2 + DB)
     */
    async deleteImageById(imageId: string, userId: string): Promise<void> {
        // 이미지 정보 조회
        const imageData = await this.db
            .select({
                image: images,
                blog: blogs,
            })
            .from(images)
            .leftJoin(posts, eq(images.postId, posts.id))
            .leftJoin(blogs, eq(posts.blogId, blogs.id))
            .where(eq(images.id, imageId))
            .get()
        
        if (!imageData) {
            throw new AppError(ERROR_MESSAGES.IMAGE.NOT_FOUND)
        }
        
        // 권한 확인
        if (imageData.blog && imageData.blog.userId !== userId) {
            throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
        }
        
        // R2에서 모든 이미지 파일 삭제
        const basePath = this.getBasePath(imageData.image.postId, imageData.image.blogId)
        const imageFolder = imageData.image.r2Key
        
        const variants = ['original', 'mobile', 'tablet', 'pc', 'thumbnail']
        for (const variant of variants) {
            const ext = variant === 'original' ? 'jpg' : 'webp' // 원본은 jpg일 수 있음
            const r2Key = `${basePath}/${imageFolder}/${variant}.${ext}`
            try {
                await this.r2.delete(r2Key)
            } catch (error) {
                console.error(`Failed to delete ${r2Key}:`, error)
            }
        }
        
        // DB에서 삭제
        await this.db.delete(images).where(eq(images.id, imageId))
    }
}