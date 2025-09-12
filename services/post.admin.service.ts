import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, asc, or, like, sql, inArray, ne, lt, gt } from 'drizzle-orm'
import { posts, blogs, tags, postTags, views, likes, comments } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'
import { escapeLikePattern } from '../shared/utils/sql-escape'

type DB = DrizzleD1Database<typeof schema>

export const getAdminPosts = async (
    db: DB,
    blogId: string,
    options?: {
        keyword?: string
        sortBy?: 'createdAt' | 'title'
        sortOrder?: 'asc' | 'desc'
        limit?: number
        offset?: number
        includeHidden?: boolean
        cursor?: string
        useCursor?: boolean
    }
) => {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)
    const sortBy = options?.sortBy || 'createdAt'
    const sortOrder = options?.sortOrder || 'desc'
    const includeHidden = options?.includeHidden ?? true

    const conditions = [eq(posts.blogId, blogId)]
    
    if (!includeHidden) {
        conditions.push(eq(posts.isHidden, false))
    }

    if (options?.keyword) {
        const escapedKeyword = escapeLikePattern(options.keyword)
        const keywordConditions = [
            like(posts.title, `%${escapedKeyword}%`),
            like(posts.summary, `%${escapedKeyword}%`),
            sql`EXISTS (
                SELECT 1 FROM ${postTags}
                INNER JOIN ${tags} ON ${postTags.tagId} = ${tags.id}
                WHERE ${postTags.postId} = ${posts.id}
                AND ${tags.name} LIKE ${'%' + escapedKeyword + '%'}
            )`
        ]
        conditions.push(or(...keywordConditions)!)
    }
    
    if (options?.useCursor && options?.cursor) {
        if (sortOrder === 'desc') {
            conditions.push(lt(posts.id, options.cursor))
        } else {
            conditions.push(gt(posts.id, options.cursor))
        }
    }

    const orderByColumn = sortBy === 'title' ? posts.title : posts.createdAt
    const orderByDirection = sortOrder === 'asc' ? asc : desc

    let postsQuery = db
        .select({
            post: posts,
            blog: blogs,
            viewCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${views}
                    WHERE ${views.postId} = ${posts.id}
                ), 0)
            `.as('viewCount'),
            likeCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${likes}
                    WHERE ${likes.postId} = ${posts.id}
                ), 0)
            `.as('likeCount'),
            commentCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${comments}
                    WHERE ${comments.postId} = ${posts.id}
                ), 0)
            `.as('commentCount'),
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(and(...conditions))
        .orderBy(orderByDirection(orderByColumn))
        .limit(limit)
    
    if (!options?.useCursor) {
        postsQuery = postsQuery.offset(offset)
    }
    
    const postsList = await postsQuery.all()

    const postIds = postsList.map(item => item.post.id)
    
    let tagsMap = new Map<string, Array<{ id: string; name: string }>>()
    
    if (postIds.length > 0) {
        const allPostTags = await db
            .select({
                postId: postTags.postId,
                id: tags.id,
                name: tags.name,
            })
            .from(tags)
            .innerJoin(postTags, eq(tags.id, postTags.tagId))
            .where(inArray(postTags.postId, postIds))
            .all()
        
        for (const tag of allPostTags) {
            if (!tagsMap.has(tag.postId)) {
                tagsMap.set(tag.postId, [])
            }
            tagsMap.get(tag.postId)!.push({
                id: tag.id,
                name: tag.name,
            })
        }
    }
    
    const postsWithTags = postsList.map((item) => ({
        ...item.post,
        blog: item.blog,
        tags: tagsMap.get(item.post.id) || [],
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
    }))

    const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(...conditions))
        .get()

    return {
        posts: postsWithTags,
        totalCount: totalCount?.count || 0,
        limit,
        offset,
    }
}

export const createAdminPost = async (
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
        tags?: string[]
    }
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
        .select({ max: sql<number>`MAX(${posts.postNumber})` })
        .from(posts)
        .where(eq(posts.blogId, blogId))
        .get()

    const postNumber = (maxPostNumber?.max || 0) + 1

    await db
        .insert(posts)
        .values({
            id: postId,
            blogId,
            postNumber,
            title: data.title.trim(),
            content: data.content.trim(),
            thumbnailUrl: data.thumbnailUrl,
            summary: data.summary?.trim(),
            isNotice: data.isNotice || false,
            allowComment: data.allowComment ?? true,
            isHidden: false,
        })
        .run()

    if (data.tags && data.tags.length > 0) {
        await processPostTags(db, postId, data.tags)
    }

    return { id: postId, postNumber }
}

export const updateAdminPost = async (
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
        isHidden?: boolean
        tags?: string[]
    }
) => {
    const post = await db
        .select({ post: posts, blog: blogs })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    if (post.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }

    const updateData: Partial<typeof posts.$inferInsert> = {
        updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.content !== undefined) updateData.content = data.content.trim()
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
    if (data.summary !== undefined) updateData.summary = data.summary?.trim()
    if (data.isNotice !== undefined) updateData.isNotice = data.isNotice
    if (data.allowComment !== undefined) updateData.allowComment = data.allowComment
    if (data.isHidden !== undefined) updateData.isHidden = data.isHidden

    await db
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, postId))
        .run()

    if (data.tags !== undefined) {
        await db
            .delete(postTags)
            .where(eq(postTags.postId, postId))
            .run()

        if (data.tags.length > 0) {
            await processPostTags(db, postId, data.tags)
        }
    }

    return { success: true }
}

export const deleteAdminPost = async (
    db: DB,
    postId: string,
    userId: string
) => {
    const post = await db
        .select({ post: posts, blog: blogs })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    if (post.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }

    await db
        .update(posts)
        .set({ 
            isHidden: true,
            updatedAt: new Date()
        })
        .where(eq(posts.id, postId))
        .run()

    return { success: true }
}

const processPostTags = async (db: DB, postId: string, tagNames: string[]) => {
    const uniqueTagNames = [...new Set(tagNames.map(name => name.trim().toLowerCase()))]
        .filter(name => name.length > 0)
    
    if (uniqueTagNames.length === 0) return

    const existingTags = await db
        .select()
        .from(tags)
        .where(inArray(tags.name, uniqueTagNames))
        .all()

    const existingTagMap = new Map(existingTags.map(tag => [tag.name, tag.id]))
    const newTagNames = uniqueTagNames.filter(name => !existingTagMap.has(name))

    const tagIdsToLink: string[] = [...existingTagMap.values()]

    if (newTagNames.length > 0) {
        const newTags = newTagNames.map(name => ({
            id: crypto.randomUUID(),
            name
        }))

        await db
            .insert(tags)
            .values(newTags)
            .run()

        tagIdsToLink.push(...newTags.map(tag => tag.id))
    }

    const postTagValues = tagIdsToLink.map(tagId => ({
        postId,
        tagId
    }))

    await db
        .insert(postTags)
        .values(postTagValues)
        .run()
}

export const getAdminPostById = async (
    db: DB,
    postId: string,
    userId: string
) => {
    const result = await db
        .select({
            post: posts,
            blog: blogs,
            viewCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${views}
                    WHERE ${views.postId} = ${posts.id}
                ), 0)
            `.as('viewCount'),
            likeCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${likes}
                    WHERE ${likes.postId} = ${posts.id}
                ), 0)
            `.as('likeCount'),
            commentCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${comments}
                    WHERE ${comments.postId} = ${posts.id}
                ), 0)
            `.as('commentCount'),
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!result) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }

    if (result.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }

    const postTags = await db
        .select({
            id: tags.id,
            name: tags.name,
        })
        .from(tags)
        .innerJoin(postTags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, postId))
        .all()

    return {
        ...result.post,
        blog: result.blog,
        tags: postTags,
        viewCount: result.viewCount,
        likeCount: result.likeCount,
        commentCount: result.commentCount,
    }
}