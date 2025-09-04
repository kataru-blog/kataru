import { ArticleCard } from '@/widgets'
import { ComponentProps, useEffect, useRef, useState, type FC } from 'react'

interface ArticleLoaderProps {
    apiUrl?: string
}
export const ArticleLoader: FC<ArticleLoaderProps> = ({ apiUrl }) => {
    const loaderRef = useRef<HTMLDivElement>(null)
    const [posts, setPosts] = useState<ComponentProps<typeof ArticleCard>[]>([])
    const [page, setPage] = useState(1)

    const loadPosts = async () => {
        if (!apiUrl) return

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({
                    page,
                    limit: 10,
                }),
            })

            if (!response.ok) return

            const data: { posts: ComponentProps<typeof ArticleCard>[] } = await response.json()
            setPosts((prev) => [...prev, ...data?.posts])
            setPage((prev) => prev + 1)
        } catch {}
    }

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    loadPosts()
                }
            })
        })

        if (loaderRef.current) {
            observer.observe(loaderRef.current)
        }

        return () => {
            observer.disconnect()
        }
    }, [loaderRef])

    return (
        apiUrl && (
            <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
                {posts?.map((post) => (
                    <ArticleCard key={post.id} {...post} />
                ))}
                <div ref={loaderRef} className='h-3' />
            </div>
        )
    )
}
