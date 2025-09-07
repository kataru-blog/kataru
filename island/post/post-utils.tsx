import { cn } from '@/lib/cn'
import { Copy, Facebook, Heart, Share, Twitter } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu'

interface PostUtilsProps {
    postId: string
}

export const PostUtils: FC<PostUtilsProps> = ({ postId }) => {
    const [isLiked, setIsLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchLikeStatus = async () => {
            try {
                const response = await fetch(`/api/likes/${postId}`)
                if (response.ok) {
                    const data = (await response.json()) as { isLiked: boolean; likeCount: number }
                    setIsLiked(data.isLiked)
                    setLikeCount(data.likeCount)
                }
            } catch (error) {
                console.error('Failed to fetch like status:', error)
            }
        }

        fetchLikeStatus()
    }, [postId])

    const handleLike = async () => {
        if (isLoading) return

        setIsLoading(true)
        try {
            const response = await fetch(`/api/likes/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (response.status === 401) {
                toast('로그인이 필요합니다', {
                    duration: 2000,
                })
                return
            }

            if (response.ok) {
                const data = (await response.json()) as { liked: boolean; likeCount: number }
                setIsLiked(data.liked)
                setLikeCount(data.likeCount)
                toast(data.liked ? '좋아요를 눌렀습니다' : '좋아요를 취소했습니다', {
                    duration: 2000,
                })
            }
        } catch (error) {
            console.error('Failed to toggle like:', error)
            toast('오류가 발생했습니다', {
                duration: 2000,
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleShare = (platform: string) => {
        const url = window.location.href

        switch (platform) {
            case '페이스북':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
                break
            case '트위터':
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank')
                break
            case '링크 복사':
                navigator.clipboard
                    .writeText(url)
                    .then(() => {
                        toast('링크가 복사되었습니다', {
                            duration: 2000,
                        })
                    })
                    .catch(() => {
                        toast('링크 복사에 실패했습니다', {
                            duration: 2000,
                        })
                    })
                break
            default:
                break
        }
    }

    return (
        <div className='flex items-center gap-1 px-1.5 sm:px-3.5 py-2'>
            <Button
                variant='ghost'
                size='sm'
                onClick={handleLike}
                disabled={isLoading}
                className={cn('flex items-center gap-2 transition-all duration-200', isLiked && 'text-red-500')}>
                <Heart className={cn('w-5 h-5 transition-all duration-200', isLiked ? 'fill-current scale-110' : 'hover:scale-105')} />
                <span className='text-sm font-medium'>{likeCount}</span>
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm' className='flex items-center gap-2 transition-all duration-200'>
                        <Share className='w-5 h-5' />
                        <span className='text-sm font-medium'>공유</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-48'>
                    <DropdownMenuItem onClick={() => handleShare('페이스북')}>
                        <div className='flex items-center gap-2'>
                            <Facebook className='size-3.5 rounded' />
                            페이스북 공유
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('트위터')}>
                        <div className='flex items-center gap-2'>
                            <Twitter className='size-3.5 rounded' />
                            트위터 공유
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className='bg-primary/10' />
                    <DropdownMenuItem onClick={() => handleShare('링크 복사')}>
                        <div className='flex items-center gap-2'>
                            <Copy className='size-3.5 rounded' />
                            링크 복사
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
