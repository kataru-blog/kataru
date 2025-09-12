import { GetPostsResponse } from '@/types/gateway.types'
import { ArticleCard } from '@/widgets'
import { ComponentProps, useEffect, useRef, useState, type FC } from 'react'

interface ArticleLoaderProps {
    apiUrl?: string
}
export const ArticleLoader: FC<ArticleLoaderProps> = ({ apiUrl }) => {
    const loaderRef = useRef<HTMLDivElement>(null)
    const [posts, setPosts] = useState<ComponentProps<typeof ArticleCard>[]>([])
    const [page, setPage] = useState(2)
    const [hasMore, setHasMore] = useState(true)
    const [isLoading, setIsLoading] = useState(false)

    const loadPosts = async () => {
        if (!apiUrl || !hasMore || isLoading) return

        setIsLoading(true)
        try {
            const urlParams = new URLSearchParams(window.location.search)
            const tag = urlParams.get('tag')
            const sort = urlParams.get('sort') || 'newest'
            const keyword = urlParams.get('keyword')

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                orderBy: sort,
            })

            if (tag) queryParams.set('tagId', tag)
            if (keyword) queryParams.set('keyword', keyword)

            const response = await fetch(`${window.location.origin}${apiUrl}?${queryParams.toString()}`, {
                method: 'GET',
            })

            if (!response.ok) {
                setHasMore(false)
                return
            }

            const data: GetPostsResponse = await response.json()

            if (!data || data.length === 0) {
                setHasMore(false)
                return
            }

            const formattedPosts = data.map((post: any) => ({
                id: post.id,
                title: post.title,
                summary: post.summary,
                thumbnailUrl: post.thumbnailUrl,
                createdAt: post.createdAt,
                user: {
                    nickname: post.blog?.title || 'Anonymous',
                    image: null,
                },
                tags: [],
                viewCount: post.viewCount,
                likeCount: post.likeCount,
            }))

            setPosts((prev) => [...prev, ...formattedPosts])
            setPage((prev) => prev + 1)
        } catch (error) {
            console.error('Failed to load posts:', error)
            setHasMore(false)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        setPosts([])
        setPage(2)
        setHasMore(true)
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && hasMore && !isLoading) {
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
    }, [hasMore, isLoading, page])

    return (
        apiUrl && (
            <>
                <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
                    {posts?.map((post) => (
                        <ArticleCard key={post.id} {...post} />
                    ))}
                </div>
                {hasMore && (
                    <div ref={loaderRef} className='h-20 w-full flex items-center justify-center px-3 sm:px-5'>
                        {isLoading && <span className='text-foreground/5'>Loading...</span>}
                    </div>
                )}
            </>
        )
    )
}
