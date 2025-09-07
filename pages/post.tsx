import { Badge } from '@/island/badge'
import { toHTMLWithTOC } from '@/lib/unified'
import { getCommentsByPostId } from '@/services/comment.service'
import { getCustomLinksByNickname } from '@/services/user.service'
import { IslandRenderer } from '@/shared/islands/renderer'
import { Context } from 'hono'
import { trackPostView } from '../services/engagement.service'
import { getPostById } from '../services/post.service'

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

    const commentsData = postData
        ? await getCommentsByPostId(db, postData.id, currentUser?.id, {
              limit: 50,
              offset: 0,
              orderBy: 'oldest',
          })
        : []

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
        <main className='flex w-full gap-2 min-h-svh'>
            <section className='w-full border-r border-border relative'>
                <IslandRenderer className='sticky top-12 z-10' ssr={true} priority='high' name='PostHeader' props={{ ...postInfo }} />
                <article className='relative flex flex-col gap-2 justify-center mx-auto p-7'>
                    <div className='prose size-full' dangerouslySetInnerHTML={{ __html: html }} />
                </article>
                <section className='flex flex-col sm:flex-row gap-2 flex-wrap px-3 sm:px-5'>
                    {postInfo.tags.map((tag) => (
                        <a href={`/${user?.nickname}?tag=${tag.id}`} key={tag.id}>
                            <Badge
                                variant={'outline'}
                                className='text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-1.5 h-fit rounded select-none'
                                key={tag.id}>
                                {tag.name}
                            </Badge>
                        </a>
                    ))}
                </section>
                <IslandRenderer ssr={true} name='PostUtils' props={{ postId: postData ? postData.id : '' }} />
                <IslandRenderer
                    ssr={true}
                    className='border-t border-border my-5'
                    name='UserCard'
                    props={{ blogDescription: postData ? postData.blog.description || '' : '', user: user }}
                />
                <section className='p-7'>
                    <IslandRenderer
                        ssr={true}
                        priority='high'
                        name='Comments'
                        props={{
                            comments: commentsData,
                            postId: postData ? postData.id : '',
                            currentUser: currentUser
                                ? {
                                      id: currentUser.id,
                                      name: currentUser.name,
                                      image: currentUser.image || null,
                                      nickname: currentUser.nickname || '',
                                  }
                                : undefined,
                        }}
                    />
                    <IslandRenderer
                        ssr={false}
                        priority='low'
                        name='CommentLoader'
                        props={{
                            apiUrl: postData ? `/api/comments/${postData.id}` : undefined,
                            currentUser: currentUser
                                ? {
                                      id: currentUser.id,
                                      name: currentUser.name,
                                      image: currentUser.image || null,
                                      nickname: currentUser.nickname || '',
                                  }
                                : undefined,
                        }}
                    />
                </section>
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
