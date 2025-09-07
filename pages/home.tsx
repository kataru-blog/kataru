import { IslandRenderer } from '@/shared/islands/renderer'
import { Context } from 'hono'
import { getPosts, getHotArticles } from '@/services/post.service'
import { getAllTags } from '@/services/tag.service'

export const Home = async (c: Context<{ Bindings: CloudflareEnv }>) => {
    const searchParams = c.req.query()
    const db = c.get('db')

    const [postsData, hotPostsData, tagsData] = await Promise.all([
        getPosts(db, {
            tagId: searchParams.tag,
            keyword: searchParams.keyword,
            orderBy: searchParams.sort as 'newest' | 'most_view' | 'most_like' | undefined,
            limit: 10,
            offset: 0,
        }),
        getHotArticles(db, 5),
        getAllTags(db, { limit: 20, offset: 0 }),
    ])

    const posts = postsData.map((post) => ({
        id: post.id,
        title: post.title,
        summary: post.summary,
        thumbnailUrl: post.thumbnailUrl,
        createdAt: post.createdAt,
        user: post.user,
        tags: [],
        viewCount: post.viewCount,
        likeCount: post.likeCount,
    }))

    return (
        <main className='flex flex-col gap-3 sm:gap-5 w-full items-start justify-center pb-3 sm:pb-5'>
            <IslandRenderer
                className='w-full'
                ssr={true}
                name='MainpageCarousel'
                props={{
                    posts: hotPostsData.map((post) => ({
                        id: post.id,
                        title: post.title,
                        summary: post.summary,
                        thumbnailUrl: post.thumbnailUrl,
                        createdAt: post.createdAt,
                        user: {
                            nickname: post.blog?.title || 'Anonymous',
                            image: null,
                        },
                        tags: [],
                        viewCount: post.viewCount,
                        likeCount: post.likeCount,
                    })),
                }}
            />
            <IslandRenderer
                className='w-full px-3 sm:px-5'
                ssr={true}
                priority='high'
                name='SearchCondition'
                props={{
                    allTags: tagsData.map((tag) => ({ id: tag.id, name: tag.name })),
                    currentTag: searchParams.tag,
                    sortBy: searchParams.sort,
                }}
            />
            <section className='w-full'>
                <IslandRenderer className='w-full px-3 sm:px-5' ssr={true} priority='high' name='Articles' props={{ posts }} />
                <IslandRenderer ssr={false} priority='low' props={{ apiUrl: '/api/posts' }} name='ArticleLoader' />
            </section>
        </main>
    )
}
