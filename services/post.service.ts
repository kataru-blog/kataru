import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, asc, inArray, count, max, gte, lte, or, like, SQL } from 'drizzle-orm'
import { posts, blogs, tags, postTags, views, likes } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = DrizzleD1Database<typeof schema>

export const createPost = async (
    db: DB,
    blogId: string,
    userId: string,
    data: {
        title: string
        content: string
        thumbnailUrl?: string
        summary?: string
        isNotice?: boolean
        allowComment?: boolean
        tagIds?: string[]
    },
) => {
    const blog = await db.select().from(blogs).where(eq(blogs.id, blogId)).get()

    if (!blog) {
        throw new AppError(ERROR_MESSAGES.BLOG.NOT_FOUND)
    }

    if (blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }

    if (!data.title?.trim()) {
        throw new AppError(ERROR_MESSAGES.POST.TITLE_REQUIRED)
    }

    if (!data.content?.trim()) {
        throw new AppError(ERROR_MESSAGES.POST.CONTENT_REQUIRED)
    }

    const postId = crypto.randomUUID()

    const maxPostNumber = await db
        .select({ max: max(posts.postNumber) })
        .from(posts)
        .where(eq(posts.blogId, blogId))
        .get()

    const postNumber = (maxPostNumber?.max || 0) + 1

    const newPost = await db
        .insert(posts)
        .values({
            id: postId,
            blogId,
            postNumber,
            title: data.title.trim(),
            content: data.content,
            thumbnailUrl: data.thumbnailUrl,
            summary: data.summary,
            isNotice: data.isNotice || false,
            allowComment: data.allowComment ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning()
        .get()

    if (data.tagIds && data.tagIds.length > 0) {
        const validTags = await db.select().from(tags).where(inArray(tags.id, data.tagIds)).all()

        if (validTags.length > 0) {
            await db.insert(postTags).values(
                validTags.map((tag) => ({
                    postId,
                    tagId: tag.id,
                })),
            )
        }
    }

    await db.insert(views).values({
        id: crypto.randomUUID(),
        postId,
        count: 0,
    })

    return newPost
}

export const updatePost = async (
    db: DB,
    postId: string,
    userId: string,
    data: {
        title?: string
        content?: string
        thumbnailUrl?: string
        summary?: string
        isNotice?: boolean
        allowComment?: boolean
        tagIds?: string[]
    },
) => {
    const postWithBlog = await db
        .select({
            post: posts,
            blog: blogs,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!postWithBlog) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    if (postWithBlog.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
    }

    if (data.title !== undefined && !data.title.trim()) {
        throw new AppError(ERROR_MESSAGES.POST.TITLE_REQUIRED)
    }

    if (data.content !== undefined && !data.content.trim()) {
        throw new AppError(ERROR_MESSAGES.POST.CONTENT_REQUIRED)
    }

    const updateData: Partial<typeof posts.$inferInsert> = {
        updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.content !== undefined) {
        updateData.content = data.content
    }
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
    if (data.summary !== undefined) updateData.summary = data.summary
    if (data.isNotice !== undefined) updateData.isNotice = data.isNotice
    if (data.allowComment !== undefined) updateData.allowComment = data.allowComment

    const updatedPost = await db.update(posts).set(updateData).where(eq(posts.id, postId)).returning().get()

    if (data.tagIds !== undefined) {
        await db.delete(postTags).where(eq(postTags.postId, postId))

        if (data.tagIds.length > 0) {
            const validTags = await db.select().from(tags).where(inArray(tags.id, data.tagIds)).all()

            if (validTags.length > 0) {
                await db.insert(postTags).values(
                    validTags.map((tag) => ({
                        postId,
                        tagId: tag.id,
                    })),
                )
            }
        }
    }

    return updatedPost
}

export const deletePost = async (db: DB, postId: string, userId: string) => {
    const postWithBlog = await db
        .select({
            post: posts,
            blog: blogs,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!postWithBlog) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    if (postWithBlog.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.POST.UNAUTHORIZED)
    }

    await db.delete(posts).where(eq(posts.id, postId))

    return { success: true }
}

export const getPosts = async (
    db: DB,
    options?: {
        tagId?: string
        keyword?: string
        limit?: number
        offset?: number
        orderBy?: 'newest' | 'most_view' | 'most_like'
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)

    const likeCountSq = db
        .select({
            postId: likes.postId,
            likeCount: count(likes.id).as('likeCount'),
        })
        .from(likes)
        .groupBy(likes.postId)
        .as('lc')

    let postsQuery

    if (options?.tagId) {
        postsQuery = db
            .select({
                post: posts,
                blog: blogs,
                viewCount: views.count,
                likeCount: likeCountSq.likeCount,
            })
            .from(postTags)
            .innerJoin(posts, eq(postTags.postId, posts.id))
            .innerJoin(blogs, eq(posts.blogId, blogs.id))
            .leftJoin(views, eq(views.postId, posts.id))
            .leftJoin(likeCountSq, eq(likeCountSq.postId, posts.id))
            .where(eq(postTags.tagId, options.tagId))
            .$dynamic()
    } else {
        postsQuery = db
            .select({
                post: posts,
                blog: blogs,
                viewCount: views.count,
                likeCount: likeCountSq.likeCount,
            })
            .from(posts)
            .innerJoin(blogs, eq(posts.blogId, blogs.id))
            .leftJoin(views, eq(views.postId, posts.id))
            .leftJoin(likeCountSq, eq(likeCountSq.postId, posts.id))
            .$dynamic()
    }

    if (options?.keyword && options.keyword.trim()) {
        const searchPattern = `%${options.keyword.trim()}%`
        const conditions: SQL<unknown>[] = []

        if (options.tagId) {
            conditions.push(eq(postTags.tagId, options.tagId))
        }

        conditions.push(or(like(posts.title, searchPattern), like(posts.content, searchPattern)) as SQL<unknown>)

        postsQuery = postsQuery.where(and(...conditions))
    }

    if (options?.orderBy === 'most_view') {
        postsQuery = postsQuery.orderBy(desc(views.count))
    } else if (options?.orderBy === 'most_like') {
        postsQuery = postsQuery.orderBy(desc(likeCountSq.likeCount))
    } else {
        postsQuery = postsQuery.orderBy(desc(posts.createdAt))
    }

    const postsData = await postsQuery.limit(limit).offset(offset).all()

    return postsData.map((p) => ({
        ...p.post,
        blog: p.blog,
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
        page: Math.ceil((offset + 1) / limit),
        limit,
    }))
}

export const getPostsByBlogId = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        offset?: number
        orderBy?: 'newest' | 'most_view' | 'most_like'
        tagId?: string
        keyword?: string
        includeNotice?: boolean
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)

    const likeCountSq = db
        .select({
            postId: likes.postId,
            likeCount: count(likes.id).as('likeCount'),
        })
        .from(likes)
        .groupBy(likes.postId)
        .as('lc')

    let postsQuery = db
        .select({
            post: posts,
            viewCount: views.count,
            likeCount: likeCountSq.likeCount,
        })
        .from(posts)
        .leftJoin(views, eq(views.postId, posts.id))
        .leftJoin(likeCountSq, eq(likeCountSq.postId, posts.id))
        .where(eq(posts.blogId, blogId))
        .$dynamic()

    const conditions: SQL<unknown>[] = [eq(posts.blogId, blogId)]

    if (options?.tagId) {
        postsQuery = postsQuery.innerJoin(postTags, eq(postTags.postId, posts.id))
        conditions.push(eq(postTags.tagId, options.tagId))
    }

    if (!options?.includeNotice) {
        conditions.push(eq(posts.isNotice, false))
    }

    if (options?.keyword && options.keyword.trim()) {
        const searchPattern = `%${options.keyword.trim()}%`
        conditions.push(or(like(posts.title, searchPattern), like(posts.content, searchPattern)) as SQL<unknown>)
    }

    if (conditions.length > 0) {
        postsQuery = postsQuery.where(and(...conditions))
    }

    if (options?.orderBy === 'most_view') {
        postsQuery = postsQuery.orderBy(desc(views.count))
    } else if (options?.orderBy === 'most_like') {
        postsQuery = postsQuery.orderBy(desc(likeCountSq.likeCount))
    } else {
        postsQuery = postsQuery.orderBy(desc(posts.createdAt))
    }

    const postsData = await postsQuery.limit(limit).offset(offset).all()

    return postsData.map((p) => ({
        ...p.post,
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
        page: Math.ceil((offset + 1) / limit),
        limit,
    }))
}

export const getHotArticles = async (db: DB, limit: number = 5) => {
    const safeLimit = Math.min(Math.max(limit, 1), 20)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const likeCountSq = db
        .select({
            postId: likes.postId,
            likeCount: count(likes.id).as('likeCount'),
        })
        .from(likes)
        .groupBy(likes.postId)
        .as('lc')

    const hotPosts = await db
        .select({
            post: posts,
            blog: blogs,
            viewCount: views.count,
            likeCount: likeCountSq.likeCount,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .leftJoin(views, eq(views.postId, posts.id))
        .leftJoin(likeCountSq, eq(likeCountSq.postId, posts.id))
        .where(and(gte(posts.createdAt, startOfWeek), lte(posts.createdAt, endOfWeek)))
        .orderBy(desc(likeCountSq.likeCount), desc(views.count), asc(posts.title))
        .limit(safeLimit)
        .all()

    return hotPosts.map((p) => ({
        ...p.post,
        blog: p.blog,
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
    }))
}

export const getPostById = async (db: DB, postId: string, includeRelated: boolean = true) => {
    if (!postId) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    const likeCountSq = db
        .select({
            postId: likes.postId,
            likeCount: count(likes.id).as('likeCount'),
        })
        .from(likes)
        .groupBy(likes.postId)
        .as('lc')

    const postData = await db
        .select({
            post: posts,
            blog: blogs,
            viewCount: views.count,
            likeCount: likeCountSq.likeCount,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .leftJoin(views, eq(views.postId, posts.id))
        .leftJoin(likeCountSq, eq(likeCountSq.postId, posts.id))
        .where(eq(posts.id, postId))
        .get()

    if (!postData) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    let tagsData: (typeof tags.$inferSelect)[] = []
    if (includeRelated) {
        const postTagsData = await db
            .select({
                tag: tags,
            })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, postId))
            .all()

        tagsData = postTagsData.map((t) => t.tag)
    }

    db.update(views)
        .set({ count: (postData.viewCount || 0) + 1 })
        .where(eq(views.postId, postId))
        .run()
        .catch(console.error)

    return {
        ...postData.post,
        blog: postData.blog,
        viewCount: postData.viewCount || 0,
        likeCount: postData.likeCount || 0,
        tags: tagsData,
    }
}
