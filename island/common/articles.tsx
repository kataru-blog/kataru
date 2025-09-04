import { IslandRenderer } from '@/shared/islands/renderer'
import { ArticleCard } from '@/widgets'
import type { ComponentProps, FC } from 'react'

interface ArticlesProps {
    posts: ComponentProps<typeof ArticleCard>[]
    apiUrl: string
}

export const Articles: FC<ArticlesProps> = ({ posts }) => {
    return (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            {posts.map((post) => (
                <ArticleCard key={post.id} {...post} />
            ))}
            <IslandRenderer ssr={false} priority='low' props={{ apiUrl: '/api/posts' }} name='ArticleLoader' />
        </div>
    )
}
