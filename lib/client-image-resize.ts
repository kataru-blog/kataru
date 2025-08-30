export interface ResizedImages {
  original: File
  thumbnail: File
}

export class ClientImageResizer {
  static async resizeImage(
    file: File,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): Promise<Blob> {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.85,
      format = 'webp'
    } = options

    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        let { width, height } = img

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  static async processImageForUpload(file: File): Promise<ResizedImages> {
    // Create thumbnail
    const thumbnailBlob = await this.resizeImage(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: 'webp'
    })

    // Create optimized original
    const originalBlob = await this.resizeImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.9,
      format: 'webp'
    })

    return {
      original: new File([originalBlob], `original_${file.name}.webp`, { type: 'image/webp' }),
      thumbnail: new File([thumbnailBlob], `thumb_${file.name}.webp`, { type: 'image/webp' })
    }
  }
}

// Usage in React component
export const useImageUpload = () => {
  const uploadImage = async (file: File, postId: string) => {
    try {
      const { original, thumbnail } = await ClientImageResizer.processImageForUpload(file)
      
      const formData = new FormData()
      formData.append('original', original)
      formData.append('thumbnail', thumbnail)
      formData.append('postId', postId)

      const response = await fetch('/api/posts/images/upload', {
        method: 'POST',
        body: formData
      })

      return response.json()
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }

  return { uploadImage }
}