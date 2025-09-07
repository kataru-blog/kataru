'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import { Badge } from '@/island/badge'
import { Button } from '@/island/button'
import { Textarea } from '@/island/textarea'
import { User } from 'lucide-react'
import { type FC, useState } from 'react'

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

interface CommentCardProps {
    comment: Comment
    onReply?: (parentId: string, content: string, isSecret: boolean) => void
    depth?: number
}

export const CommentCard: FC<CommentCardProps> = ({ comment, onReply, depth = 0 }) => {
    const [showReplyInput, setShowReplyInput] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isSecretReply, setIsSecretReply] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleReplySubmit = async () => {
        if (!replyContent.trim() || !onReply) return

        setIsSubmitting(true)
        try {
            await onReply(comment.id, replyContent.trim(), isSecretReply)
            setReplyContent('')
            setIsSecretReply(false)
            setShowReplyInput(false)
        } catch (error) {
            console.error('Failed to submit reply:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        setReplyContent('')
        setIsSecretReply(false)
        setShowReplyInput(false)
    }

    return (
        <div className={`flex gap-3 ${depth > 0 ? 'ml-5' : ''}`}>
            <Avatar className='size-10'>
                <AvatarImage src={comment.author.image || '/placeholder.svg'} />
                <AvatarFallback>
                    <User className='size-5' />
                </AvatarFallback>
            </Avatar>

            <div className='flex flex-col gap-2 flex-1'>
                <div className='flex items-center gap-2'>
                    <span className='font-medium text-sm'>{comment.author.name}</span>
                    {comment.author.id && <span className='text-xs text-primary/70'>@{comment.author.nickname}</span>}
                    <span className='text-xs text-primary/70'>{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                    {comment.isSecret && (
                        <Badge variant='outline' className='text-xs'>
                            비밀
                        </Badge>
                    )}
                </div>

                <p className='text-sm leading-relaxed'>{comment.content}</p>

                <div className='flex items-center gap-2'>
                    <button
                        className='text-xs text-primary/70 hover:text-primary transition-colors'
                        onClick={() => setShowReplyInput(!showReplyInput)}>
                        답글
                    </button>
                </div>

                {showReplyInput && (
                    <div className='mt-3 space-y-3'>
                        <Textarea
                            placeholder='답글을 입력하세요...'
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className='min-h-[80px] resize-none'
                        />

                        <div className='flex items-center justify-between'>
                            <label className='flex items-center gap-2 text-xs'>
                                <input
                                    type='checkbox'
                                    checked={isSecretReply}
                                    onChange={(e) => setIsSecretReply(e.target.checked)}
                                    className='rounded'
                                />
                                비밀 댓글
                            </label>

                            <div className='flex gap-2'>
                                <Button variant='outline' size='sm' onClick={handleCancel} disabled={isSubmitting}>
                                    취소
                                </Button>
                                <Button size='sm' onClick={handleReplySubmit} disabled={!replyContent.trim() || isSubmitting}>
                                    {isSubmitting ? '등록 중...' : '답글 등록'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
