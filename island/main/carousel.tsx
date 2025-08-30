import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import { Carousel, CarouselContent, CarouselItem } from '@/island/carousel'
import Autoplay from 'embla-carousel-autoplay'
import type { FC } from 'react'
import { Image } from '@/island/lazy-image'
import { useState, useEffect } from 'react'
import type { CarouselApi } from '@/island/carousel'

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
                                <div className='relative h-70 md:h-90 w-full overflow-hidden cursor-pointer group shadow-lg rounded-none'>
                                    <Image
                                        src={post.thumbnailUrl || '/favicon.ico'}
                                        alt={post.title}
                                        className='size-full object-cover transition-transform duration-500 group-hover:scale-120 scale-110 blur-sm'
                                        placeholderSrc='/favicon.ico'
                                        fetchPriority='high'
                                    />

                                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />

                                    <div className='absolute inset-0 flex flex-col justify-center p-8 gap-5'>
                                        <h3 className='text-background text-2xl md:text-4xl font-bold mb-4 text-balance leading-tight'>
                                            {post.title}
                                        </h3>
                                        <div>
                                            <p className='text-background/90 text-sm md:text-lg mb-3 line-clamp-2 text-pretty'>
                                                {post.summary || ''}
                                            </p>
                                            <div className='flex items-center gap-4 text-background/80 text-sm'>
                                                <div className='flex items-center gap-3'>
                                                    <Avatar className='size-8'>
                                                        <AvatarImage src={post.user.image || '/favicon.ico'} />
                                                        <AvatarFallback className='text-xs bg-background/20 text-background'>
                                                            {post.user.nickname[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className='font-medium'>{post.user.nickname}</span>
                                                </div>
                                                <div className='flex items-center gap-2 flex-row [&>*]:text-nowrap'>
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

            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
                {posts.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={`size-2 rounded-full transition-all ${
                            index === current ? 'bg-background w-6' : 'bg-background/50 hover:bg-background/70'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
