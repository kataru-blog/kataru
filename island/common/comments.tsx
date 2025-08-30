import { CommentForm } from '@/features/comment'
import { CommentCard } from '@/widgets/comment-card'
import type { FC } from 'react'
import { useState } from 'react'

interface Comment {
    id: string
    postId: string
    userId: string
    content: string
    isSecret: boolean
    parentId: string | undefined
    createdAt: Date
    updatedAt: Date
    user: {
        image: string
        name: string
        nickname: string
    }
}

interface CommentListProps {
    postId: string
}

const MOCK_COMMENTS = [
    {
        id: '1',
        postId: '1',
        userId: '1',
        content: '댓글 내용',
        isSecret: false,
        parentId: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: {
            image: 'https://picsum.photos/100/100?random=10',
            name: '댓글 작성자',
            nickname: 'comment_writer',
        },
    },
    {
        id: '2',
        postId: '1',
        userId: '2',
        content: '댓글 내용',
        isSecret: false,
        parentId: '1',
        createdAt: new Date('2024-01-01T01:00:00Z'),
        updatedAt: new Date('2024-01-01T01:00:00Z'),
        user: {
            image: 'https://picsum.photos/100/100?random=11',
            name: '댓글 작성자',
            nickname: 'comment_writer',
        },
    },
    {
        id: '3',
        postId: '1',
        userId: '3',
        content: '댓글 내용',
        isSecret: false,
        parentId: '1',
        createdAt: new Date('2024-01-01T02:00:00Z'),
        updatedAt: new Date('2024-01-01T02:00:00Z'),
        user: {
            image: 'https://picsum.photos/100/100?random=12',
            name: '댓글 작성자',
            nickname: 'comment_writer',
        },
    },
]

export const Comments: FC<CommentListProps> = ({ postId }) => {
    const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)

    const onSubmit = (content: string, isSecret: boolean) => {
        onReply(undefined, content, isSecret)
    }

    const onReply = (parentId: string | undefined, content: string, isSecret: boolean) => {
        const now = new Date()
        setComments([
            ...comments,
            {
                id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                postId: postId,
                userId: '1',
                content: content,
                isSecret: isSecret,
                parentId: parentId,
                createdAt: now,
                updatedAt: now,
                user: {
                    image: `https://picsum.photos/100/100?random=${Date.now()}`,
                    name: '댓글 작성자',
                    nickname: 'comment_writer',
                },
            },
        ])
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
        return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
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
            <div className='text-center py-8 text-primary/60'>
                <p className='text-sm'>아직 댓글이 없습니다.</p>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-7'>
            <CommentForm onSubmit={(content, isSecret) => onReply(undefined, content, isSecret)} />
            <section className='flex flex-col gap-7'>{renderComments(rootComments)}</section>
        </div>
    )
}
