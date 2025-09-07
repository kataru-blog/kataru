import { CommentCard } from '@/widgets/comment-card'
import { useEffect, useRef, useState, type FC } from 'react'

interface Comment {
    id: string
    postId: string
    userId: string
    content: string
    isSecret: boolean
    parentId: string | null
    createdAt: Date
    updatedAt: Date
    author: {
        id: string | null
        name: string
        image: string | null
        nickname: string
    }
}

interface CommentLoaderProps {
    apiUrl?: string
    currentUser?: {
        id: string
        name: string
        image: string | null
        nickname: string
    }
}

export const CommentLoader: FC<CommentLoaderProps> = ({ apiUrl, currentUser }) => {
    const loaderRef = useRef<HTMLDivElement>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [page, setPage] = useState(2)
    const [hasMore, setHasMore] = useState(true)
    const [isLoading, setIsLoading] = useState(false)

    const loadComments = async () => {
        if (!apiUrl || !hasMore || isLoading) return

        setIsLoading(true)
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                orderBy: 'oldest',
            })

            const response = await fetch(`${window.location.origin}${apiUrl}?${queryParams.toString()}`, {
                method: 'GET',
            })

            if (!response.ok) {
                setHasMore(false)
                return
            }

            const data: Comment[] = await response.json()

            if (!data || data.length === 0) {
                setHasMore(false)
                return
            }

            setComments((prev) => [...prev, ...data])
            setPage((prev) => prev + 1)
        } catch (error) {
            console.error('Failed to load comments:', error)
            setHasMore(false)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        setComments([])
        setPage(2)
        setHasMore(true)
    }, [apiUrl])

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && hasMore && !isLoading) {
                    loadComments()
                }
            })
        })

        if (loaderRef.current) {
            observer.observe(loaderRef.current)
        }

        return () => {
            observer.disconnect()
        }
    }, [hasMore, isLoading, page, apiUrl])

    const onReply = async (parentId: string | undefined, content: string, isSecret: boolean) => {
        if (!currentUser) {
            alert('로그인이 필요합니다.')
            return
        }

        const postId = apiUrl?.split('/').pop()
        if (!postId) return

        try {
            const response = await fetch(`${window.location.origin}/api/comments/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content,
                    isSecret,
                    parentId: parentId || null,
                }),
            })

            if (response.ok) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Failed to create comment:', error)
        }
    }

    const groupedComments = comments.reduce((acc, comment) => {
        const key = comment.parentId || 'root'
        if (!acc[key]) {
            acc[key] = []
        }
        acc[key].push(comment)
        return acc
    }, {} as Record<string, Comment[]>)

    const sortComments = (comments: Comment[]) => {
        return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    const renderComments = (comments: Comment[], depth = 0) => {
        return sortComments(comments).map((comment) => {
            const replies = groupedComments[comment.id] || []

            return (
                <div key={comment.id} className='space-y-4'>
                    <CommentCard comment={comment} onReply={onReply} depth={depth} />
                    {replies.length > 0 && <div className='space-y-4'>{renderComments(replies, depth + 1)}</div>}
                </div>
            )
        })
    }

    const rootComments = groupedComments['root'] || []

    return (
        apiUrl && (
            <>
                {rootComments.length > 0 && (
                    <div className='flex flex-col gap-7'>
                        {renderComments(rootComments)}
                    </div>
                )}
                {hasMore && (
                    <div ref={loaderRef} className='h-20 w-full flex items-center justify-center px-3 sm:px-5'>
                        {isLoading && <span className='text-gray-500'>댓글을 불러오는 중...</span>}
                    </div>
                )}
            </>
        )
    )
}