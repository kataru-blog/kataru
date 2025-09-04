import { Button } from '@/island/button'
import dayjs from 'dayjs'
import { ArrowLeft, Calendar, Eye, Heart } from 'lucide-react'
import { type FC } from 'react'

interface PostHeaderProps {
    title: string
    createdAt: Date
    viewCount: number
    likeCount: number
}

export const PostHeader: FC<PostHeaderProps> = ({ title, createdAt, viewCount, likeCount }) => {
    const onBack = () => {
        const pathList = window.location.href.split('/')
        window.location.href = pathList.slice(0, -1).join('/')
    }
    return (
        <div className='backdrop-blur-sm bg-background/80 flex gap-1 items-center justify-between border-b border-border px-3 py-0.5 sm:px-3 sm:py-2 flex-wrap'>
            <div className='flex gap-2 items-center'>
                <Button variant='ghost' size='sm' onClick={onBack} className='size-5 sm:size-10 p-0 rounded'>
                    <ArrowLeft className='size-3.5 sm:size-5' />
                    <span className='sr-only'>뒤로가기</span>
                </Button>
                <h1 className='text-md sm:text-xl font-semibold py-2 line-clamp-2 text-pretty'>{title}</h1>
            </div>
            <div className='flex gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-0'>
                <div className='flex gap-1 items-center'>
                    <Calendar className='size-3' />
                    <span className='text-primary/70'>{dayjs(createdAt).format('YY.MM.DD')}</span>
                </div>
                <div className='flex gap-1 items-center'>
                    <Eye className='size-3' />
                    <span className='text-primary/70'>{viewCount}</span>
                </div>
                <div className='flex gap-1 items-center'>
                    <Heart className='size-3' />
                    <span className='text-primary/70'>{likeCount}</span>
                </div>
            </div>
        </div>
    )
}
