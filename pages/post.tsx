import { toHTMLWithTOC } from '@/lib/unified'
import { getCustomLinksByNickname } from '@/services/user.service'
import { IslandRenderer } from '@/shared/islands/renderer'
import { UserCard } from '@/widgets'
import { Context } from 'hono'
import { getPostById } from '../services/post.service'
import { trackPostView } from '../services/engagement.service'
import { Badge } from '@/island/badge'
import { GetPostByIdResponse } from '@/types/gateway.types'

export const Post = async (c: Context<{ Bindings: CloudflareEnv }>) => {
    const user = c.get('blogUser')
    const currentUser = c.get('user')
    const postNumber = c.req.param('postNumber')
    const db = c.get('db')

    const [postDataSettled, customLinksSettled] = await Promise.allSettled([
        getPostById(db, postNumber, true),
        getCustomLinksByNickname(db, user?.nickname || ''),
    ])
    const postData = postDataSettled.status === 'fulfilled' && postDataSettled.value
    const customLinks = (customLinksSettled.status === 'fulfilled' && customLinksSettled.value) || []
    const { html, toc } = await toHTMLWithTOC(postData ? postData?.content : '')

    if (postData) {
        trackPostView(db, postData.id, {
            userId: currentUser?.id || null,
            ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null,
            userAgent: c.req.header('User-Agent') || null,
        })
    }

    const postInfo = {
        title: postData ? postData?.title : 'kataru',
        tags: postData ? postData?.tags : [],
        createdAt: postData ? postData?.createdAt : new Date(),
        viewCount: postData ? postData?.viewCount : 0,
        likeCount: postData ? postData?.likeCount : 0,
    }

    Object.assign(user || {}, { customLinks })

    return (
        <main className='flex w-full gap-2'>
            <section className='w-full border-r border-border relative'>
                <IslandRenderer className='sticky top-12 z-10' ssr={true} priority='high' name='PostHeader' props={{ ...postInfo }} />
                <article className='relative flex gap-2 justify-center mx-auto p-7'>
                    <div className='prose size-full' dangerouslySetInnerHTML={{ __html: html }} />
                    <section className='flex flex-col gap-2 flex-wrap'>
                        {postInfo.tags.map((tag) => (
                            <Badge variant={'outline'} className='text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-1.5 h-fit rounded' key={tag.id}>
                                {tag.name}
                            </Badge>
                        ))}
                    </section>
                </article>
                <UserCard className='border-t border-border my-5' blogDescription={postData ? postData.blog.description || '' : ''} user={user} />
                <IslandRenderer ssr={false} priority='low' className='p-7' name='Comments' props={{ postId: '1' }} />
            </section>
            <IslandRenderer
                className='w-64 sm:block hidden'
                ssr={false}
                priority='low'
                name='TOC'
                props={{ toc }}
                fallback={<div className='w-64 h-full animate-pulse' />}
            />
        </main>
    )
}
