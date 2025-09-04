import { ArticleCard } from '@/widgets'
import type { ComponentProps, FC } from 'react'

interface ArticlesProps {
    posts: ComponentProps<typeof ArticleCard>[]
}

export const Articles: FC<ArticlesProps> = ({ posts }) => {
    return (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            {posts.map((post) => (
                <ArticleCard key={post.id} {...post} />
            ))}
        </div>
    )
}
