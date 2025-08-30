import { Badge } from '@/island/badge'
import { Button } from '@/island/button'
import { type FC } from 'react'
import { ArrowLeft, Calendar, Eye, Heart } from 'lucide-react'

interface PostHeaderProps {
    tag: string
    title: string
    createdAt: Date
    viewCount: number
    likeCount: number
}

export const PostHeader: FC<PostHeaderProps> = ({ tag, title, createdAt, viewCount, likeCount }) => {
    const onBack = () => {
        const pathList = window.location.href.split('/')
        window.location.href = pathList.slice(0, -1).join('/')
    }
    return (
        <div className='backdrop-blur-lg bg-background/80 flex gap-2 items-start md:items-center justify-between flex-col md:flex-row border-b border-border p-3 py-2'>
            <div className='flex gap-2 items-center'>
                <Button variant='ghost' size='sm' onClick={onBack} className='size-10 p-0 rounded'>
                    <ArrowLeft className='size-5' />
                    <span className='sr-only'>뒤로가기</span>
                </Button>
                <Badge variant={'outline'} className='text-sm  py-1 px-1.5 h-fit rounded'>
                    {tag}
                </Badge>
                <h1 className='text-2xl font-semibold py-2'>{title}</h1>
            </div>
            <div className='flex gap-2'>
                <div className='flex gap-1 items-center'>
                    <Calendar className='size-3' />
                    <span className='text-sm text-primary/70'>{new Date(createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className='flex gap-1 items-center'>
                    <Eye className='size-3' />
                    <span className='text-sm text-primary/70'>{viewCount}</span>
                </div>
                <div className='flex gap-1 items-center'>
                    <Heart className='size-3' />
                    <span className='text-sm text-primary/70'>{likeCount}</span>
                </div>
            </div>
        </div>
    )
}
