import { CommentForm } from '@/features/comment'
import { CommentCard } from '@/widgets/comment-card'
import type { FC } from 'react'

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

interface CommentListProps {
    comments: Comment[]
    postId: string
    currentUser?: {
        id: string
        name: string
        image: string | null
        nickname: string
    }
}

export const Comments: FC<CommentListProps> = ({ comments, postId, currentUser }) => {
    const onReply = async (parentId: string | undefined, content: string, isSecret: boolean) => {
        if (!currentUser) {
            alert('로그인이 필요합니다.')
            return
        }

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

    if (comments.length === 0) {
        return (
            <div className='flex flex-col gap-7'>
                {currentUser && <CommentForm onSubmit={(content, isSecret) => onReply(undefined, content, isSecret)} />}
                <div className='text-center py-8 text-primary/60'>
                    <p className='text-sm'>아직 댓글이 없습니다.</p>
                </div>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-7'>
            {currentUser && <CommentForm onSubmit={(content, isSecret) => onReply(undefined, content, isSecret)} />}
            <section className='flex flex-col gap-7'>{renderComments(rootComments)}</section>
        </div>
    )
}
