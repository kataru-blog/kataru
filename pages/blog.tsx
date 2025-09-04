import { getPostsByBlogId } from '@/services/post.service'
import { getTagsByBlogId } from '@/services/tag.service'
import { getCustomLinksByNickname } from '@/services/user.service'
import { IslandRenderer } from '@/shared/islands/renderer'
import { UserCard } from '@/widgets'
import { Context } from 'hono'
import { ComponentProps } from 'react'

export const Blog = async (c: Context<{ Bindings: CloudflareEnv }>) => {
    const blog = c.get('blog')
    const user = c.get('blogUser')
    const searchParams = c.req.query()
    const db = c.get('db')

    const [postsDataSettled, tagsDataSettled, customLinksSettled] = await Promise.allSettled([
        getPostsByBlogId(db, blog!.id, {
            orderBy: searchParams.sort as 'newest' | 'most_view' | 'most_like' | undefined,
            limit: 10,
            offset: 0,
            includeNotice: true,
            keyword: searchParams.keyword,
            tagId: searchParams.tag,
        }),
        getTagsByBlogId(db, blog!.id, {
            limit: 50,
            orderBy: 'popular',
        }),
        getCustomLinksByNickname(db, user!.nickname),
    ])

    const posts = (postsDataSettled.status === 'fulfilled' && postsDataSettled.value) || []
    const tags = (tagsDataSettled.status === 'fulfilled' && tagsDataSettled.value) || []
    const customLinks = (customLinksSettled.status === 'fulfilled' && customLinksSettled.value) || []

    return (
        <div className='flex flex-col min-h-dvh size-full gap-3 sm:gap-5 relative'>
            <UserCard
                className='sticky top-12 z-10 backdrop-blur-sm bg-background/80'
                blogDescription={blog?.description || ''}
                user={
                    {
                        ...user,
                        customLinks: !customLinks
                            ? []
                            : customLinks?.sort((a, b) => a.sortOrder - b.sortOrder).map((link) => ({ url: link.url, label: link.label })),
                    } as ComponentProps<typeof UserCard>['user']
                }
            />
            <main className='flex flex-col w-full h-full'>
                <IslandRenderer
                    className='w-full px-3 sm:px-5'
                    ssr={true}
                    name='SearchCondition'
                    props={{ allTags: tags.map((tag) => ({ id: tag.id, name: tag.name })), currentTag: searchParams.tag, sortBy: searchParams.sort }}
                />
                <IslandRenderer
                    className='w-full px-3 sm:px-5'
                    ssr={true}
                    name='Articles'
                    props={{
                        posts: posts.map((post) => ({
                            ...post,
                            user: {
                                image: user?.image ?? null,
                                nickname: user?.nickname ?? 'kataru',
                            },
                        })),
                    }}
                />
                <IslandRenderer ssr={false} priority='low' props={{ apiUrl: `/api/posts/${blog!.id}` }} name='ArticleLoader' />
            </main>
        </div>
    )
}
