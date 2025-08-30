import { cn } from '@/lib/cn'
import { useState, useEffect, type FC, type ImgHTMLAttributes, ComponentProps } from 'react'

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string
    alt: string
    placeholderSrc?: string
    blurDataUrl?: string
    eager?: boolean
}

export const LazyImage: FC<LazyImageProps> = ({ src, alt, placeholderSrc, blurDataUrl, className, eager = false, ...props }) => {
    const fallbackSrc = placeholderSrc || blurDataUrl || '/favicon.ico'
    const initialSrc = eager ? src : fallbackSrc
    const [imageSrc, setImageSrc] = useState(initialSrc)
    const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
    const [isLoading, setIsLoading] = useState(!eager)
    const [isInView, setIsInView] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        if (eager) {
            setIsInView(true)
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!isMounted || !imageRef || eager) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true)
                        observer.unobserve(entry.target)
                    }
                })
            },
            { threshold: 0.01, rootMargin: '50px' },
        )

        observer.observe(imageRef)

        return () => {
            if (imageRef) {
                observer.unobserve(imageRef)
            }
        }
    }, [imageRef, eager, isMounted, src])

    useEffect(() => {
        if (!isInView || !isMounted) return
        if (eager || imageSrc === src) return

        const img = new window.Image()
        img.src = src
        img.onload = () => {
            setImageSrc(src)
            setIsLoading(false)
        }
        img.onerror = () => {
            setImageSrc(fallbackSrc)
            setIsLoading(false)
        }
    }, [isInView, src, fallbackSrc, eager, isMounted, imageSrc])

    const shouldShowPlaceholder = isLoading && isMounted && !eager

    return (
        <>
            <img
                ref={setImageRef}
                src={imageSrc}
                alt={alt}
                className={cn('transition-opacity duration-300', shouldShowPlaceholder ? 'opacity-0' : 'opacity-100', className)}
                decoding='async'
                {...props}
            />
            {shouldShowPlaceholder && <div className={cn('absolute inset-0 bg-muted animate-pulse', className)} aria-hidden='true' />}
        </>
    )
}

export const OptimizedImage: FC<LazyImageProps & { sizes?: string }> = ({ src, alt, sizes, className, ...props }) => {
    const [srcSet, setSrcSet] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!src.includes('/favicon.ico') && typeof window !== 'undefined') {
            const widths = [320, 640, 768, 1024, 1280, 1536]
            const generatedSrcSet = widths
                .map((w) => {
                    const url = new URL(src, window.location.origin)
                    url.searchParams.set('w', w.toString())
                    url.searchParams.set('q', '75')
                    return `${url.toString()} ${w}w`
                })
                .join(', ')
            setSrcSet(generatedSrcSet)
        }
    }, [src])

    const isEager = props.fetchPriority === 'high' || props.eager

    return (
        <LazyImage
            src={src}
            alt={alt}
            srcSet={srcSet}
            sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
            className={className}
            loading={isEager ? 'eager' : 'lazy'}
            eager={isEager}
            {...props}
        />
    )
}

export const Image: FC<ComponentProps<typeof OptimizedImage>> = (props) => {
    return <OptimizedImage {...props} />
}
