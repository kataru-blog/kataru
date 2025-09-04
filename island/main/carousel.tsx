import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import type { CarouselApi } from '@/island/carousel'
import { Carousel, CarouselContent, CarouselItem } from '@/island/carousel'
import { Image } from '@/island/lazy-image'
import { cn } from '@/lib/cn'
import Autoplay from 'embla-carousel-autoplay'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

interface MainpageCarouselProps {
    posts: {
        id: string
        title: string
        summary: string | null
        thumbnailUrl: string | null
        createdAt: Date
        user: {
            nickname: string
            image: string | null
        }
        tags: string[]
        viewCount: number
        likeCount: number
    }[]
}

export const MainpageCarousel: FC<MainpageCarouselProps> = ({ posts }) => {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        if (!api) {
            return
        }

        setCurrent(api.selectedScrollSnap())

        api.on('select', () => {
            setCurrent(api.selectedScrollSnap())
        })
    }, [api])

    return (
        <div className='relative w-full'>
            <Carousel setApi={setApi} className='w-full' opts={{ loop: true }} plugins={[Autoplay({ delay: 5000 })]}>
                <CarouselContent>
                    {posts.map((post) => (
                        <CarouselItem key={post.id}>
                            <a href={`/${post.user.nickname}/${post.id}`}>
                                <div className='relative h-50 sm:h-85 w-full overflow-hidden cursor-pointer group shadow-lg rounded-none'>
                                    <Image
                                        src={post.thumbnailUrl || '/favicon.ico'}
                                        alt={post.title}
                                        className='size-full object-cover transition-transform duration-500 group-hover:scale-120 scale-110 blur-sm'
                                        placeholderSrc='/favicon.ico'
                                        fetchPriority='high'
                                    />

                                    <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent' />

                                    <div className='absolute inset-0 flex flex-col justify-center p-8 gap-1.5 sm:gap-5'>
                                        <h3 className='text-white text-lg sm:text-3xl font-bold text-pretty leading-tight line-clamp-2'>
                                            {post.title}
                                        </h3>
                                        <div>
                                            <p className='text-white/90 text-sm sm:text-lg mb-3 line-clamp-2 text-pretty'>{post.summary || ''}</p>
                                            <div className='flex items-center gap-3.5 text-white/80 text-sm'>
                                                <div className='flex items-center gap-3'>
                                                    <Avatar className='size-5 sm:size-8'>
                                                        <AvatarImage src={post.user.image || '/favicon.ico'} />
                                                        <AvatarFallback className='text-xs bg-white/20 text-white'>
                                                            {post.user.nickname[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className='font-medium'>{post.user.nickname}</span>
                                                </div>
                                                <div className='flex items-center gap-2 flex-row [&>*]:text-nowrap text-white/80'>
                                                    <span className='sm:block hidden'>•</span>
                                                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                                                    <span className='sm:block hidden'>•</span>
                                                    <span>조회수 {post.viewCount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2'>
                {posts.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={cn(
                            `size-2 rounded-full transition-all cursor-pointer`,
                            index === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70',
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
