import type { FC } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import { Card } from '@/island/card'
import { Eye, Heart } from 'lucide-react'
import { Image } from '@/island/lazy-image'
import { user, posts } from '@/entities'

interface ArticleCardProps extends Pick<typeof posts.$inferSelect, 'id' | 'thumbnailUrl' | 'title' | 'summary' | 'createdAt'> {
    user: Pick<typeof user.$inferSelect, 'image' | 'nickname'>
    viewCount: number
    likeCount: number
}

export const ArticleCard: FC<ArticleCardProps> = ({ id, thumbnailUrl, title, summary, user, createdAt, viewCount, likeCount }) => {
    return (
        <Card
            key={id}
            className='overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border-border/50 hover:border-border py-0 min-h-45'>
            <a href={`/${user.nickname}/${id}`} className='flex h-full flex-col sm:flex-row'>
                <div className='relative aspect-video overflow-hidden w-full sm:w-50 xl:w-80 rounded-lg bg-muted sm:h-full'>
                    <Image
                        src={thumbnailUrl || '/favicon.ico'}
                        alt={title}
                        className='absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-300'
                        fetchPriority='high'
                    />
                </div>

                <div className='flex-1 min-w-0 flex flex-col justify-between p-3'>
                    <div>
                        <h3 className='font-bold text-lg sm:text-xl line-clamp-1 text-balance group-hover:text-primary transition-colors'>{title}</h3>
                        <p className='text-muted-foreground text-md sm:text-base mb-4 line-clamp-2 leading-relaxed'>{summary || ''}</p>
                    </div>

                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <Avatar className='w-8 h-8'>
                                <AvatarImage src={user.image || '/favicon.ico'} />
                                <AvatarFallback className='text-sm bg-muted'>{user.nickname[0]}</AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col'>
                                <span className='text-sm font-medium text-foreground'>{user.nickname}</span>
                                <span className='text-xs text-muted-foreground'>{new Date(createdAt).toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>

                        <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                            <div className='flex items-center gap-1'>
                                <Eye className='w-4 h-4' />
                                <span>{viewCount.toLocaleString()}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Heart className='w-4 h-4' />
                                <span>{likeCount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        </Card>
    )
}
