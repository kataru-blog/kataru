import { Button } from '@/island/button'
import { Textarea } from '@/island/textarea'
import { type FC, useState } from 'react'

interface CommentFormProps {
    onSubmit: (content: string, isSecret: boolean) => void
    placeholder?: string
    submitText?: string
}

export const CommentForm: FC<CommentFormProps> = ({ onSubmit, placeholder = '댓글을 입력하세요', submitText = '댓글 등록' }) => {
    const [content, setContent] = useState('')
    const [isSecret, setIsSecret] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!content.trim()) return

        setIsSubmitting(true)
        try {
            onSubmit(content.trim(), isSecret)
            setContent('')
            setIsSecret(false)
        } catch (error) {
            console.error('Failed to submit comment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className='space-y-3'>
            <Textarea
                placeholder={placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className='min-h-[100px] resize-none rounded'
            />

            <div className='flex items-center justify-between'>
                <label className='flex items-center gap-2 text-sm'>
                    <input type='checkbox' checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} className='rounded' />
                    비밀 댓글
                </label>

                <Button className='rounded' onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
                    {isSubmitting ? '등록 중...' : submitText}
                </Button>
            </div>
        </div>
    )
}
