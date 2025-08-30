import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, asc, inArray, count, max } from 'drizzle-orm'
import { posts, blogs, tags, postTags, views, likes } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'
import { ImageProcessor } from '../lib/image-utils'

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
    r2?: R2Bucket,
    baseUrl?: string
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
    
    // Get next postNumber for this blog
    const maxPostNumber = await db
        .select({ max: max(posts.postNumber) })
        .from(posts)
        .where(eq(posts.blogId, blogId))
        .get()
    
    const postNumber = (maxPostNumber?.max || 0) + 1
    
    // Process images if R2 is available
    let processedContent = data.content
    if (r2 && baseUrl) {
        const imageProcessor = new ImageProcessor(db, r2, baseUrl)
        processedContent = await imageProcessor.processContentImages(data.content, postId)
    }

    const newPost = await db
        .insert(posts)
        .values({
            id: postId,
            blogId,
            postNumber,
            title: data.title.trim(),
            content: processedContent,
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
                validTags.map(tag => ({
                    postId,
                    tagId: tag.id,
                }))
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
    r2?: R2Bucket,
    baseUrl?: string
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
        // Process images if R2 is available
        let processedContent = data.content
        if (r2 && baseUrl) {
            const imageProcessor = new ImageProcessor(db, r2, baseUrl)
            processedContent = await imageProcessor.processContentImages(data.content, postId)
        }
        updateData.content = processedContent
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

            for (const tag of validTags) {
                await db.insert(postTags).values({
                    postId,
                    tagId: tag.id,
                })
            }
        }
    }

    return updatedPost
}

export const deletePost = async (db: DB, postId: string, userId: string, r2?: R2Bucket, baseUrl?: string) => {
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

    // Delete associated images from R2
    if (r2 && baseUrl) {
        const imageProcessor = new ImageProcessor(db, r2, baseUrl)
        await imageProcessor.deletePostImages(postId)
    }

    await db.delete(posts).where(eq(posts.id, postId))

    return { success: true }
}

export const getPostById = async (db: DB, postId: string) => {
    const postData = await db
        .select({
            post: posts,
            blog: blogs,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()

    if (!postData) {
        return null
    }

    const [viewData, likeCount, postTagsData] = await Promise.all([
        db.select().from(views).where(eq(views.postId, postId)).get(),
        db.select({ count: count() }).from(likes).where(eq(likes.postId, postId)).get(),
        db
            .select({
                tag: tags,
            })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, postId))
            .all()
    ])

    return {
        ...postData.post,
        blog: postData.blog,
        viewCount: viewData?.count || 0,
        likeCount: likeCount?.count || 0,
        tags: postTagsData.map((pt) => pt.tag),
    }
}

export const getPostsByBlogId = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        offset?: number
        orderBy?: 'latest' | 'oldest' | 'popular'
        tagId?: string
    },
) => {
    const limit = options?.limit || 10
    const offset = options?.offset || 0

    let query = db
        .select({
            post: posts,
        })
        .from(posts)
        .where(eq(posts.blogId, blogId))
        .$dynamic()

    if (options?.tagId) {
        query = query
            .innerJoin(postTags, eq(postTags.postId, posts.id))
            .where(and(eq(posts.blogId, blogId), eq(postTags.tagId, options.tagId)))
    }

    if (options?.orderBy === 'popular') {
        const popularQuery = db
            .select({
                post: posts,
            })
            .from(posts)
            .leftJoin(views, eq(views.postId, posts.id))
            .where(eq(posts.blogId, blogId))
            .orderBy(desc(views.count))
            .$dynamic()
        
        if (options?.tagId) {
            popularQuery
                .innerJoin(postTags, eq(postTags.postId, posts.id))
                .where(and(eq(posts.blogId, blogId), eq(postTags.tagId, options.tagId)))
        }
        
        const popularPosts = await popularQuery.limit(limit).offset(offset).all()
        const postIds = popularPosts.map(p => p.post.id)
        
        if (postIds.length === 0) return []
        
        const [viewsData, likesData, tagsData] = await Promise.all([
            db.select({ postId: views.postId, count: views.count })
                .from(views)
                .where(inArray(views.postId, postIds))
                .all(),
            db.select({ postId: likes.postId, count: count() })
                .from(likes)
                .where(inArray(likes.postId, postIds))
                .groupBy(likes.postId)
                .all(),
            db.select({ postId: postTags.postId, tag: tags })
                .from(postTags)
                .innerJoin(tags, eq(postTags.tagId, tags.id))
                .where(inArray(postTags.postId, postIds))
                .all()
        ])
        
        const viewsMap = new Map(viewsData.map(v => [v.postId, v.count]))
        const likesMap = new Map(likesData.map(l => [l.postId, l.count]))
        const tagsMap = tagsData.reduce((acc, curr) => {
            if (!acc[curr.postId]) acc[curr.postId] = []
            acc[curr.postId].push(curr.tag)
            return acc
        }, {} as Record<string, typeof tags.$inferSelect[]>)
        
        return popularPosts.map(p => ({
            ...p.post,
            viewCount: viewsMap.get(p.post.id) || 0,
            likeCount: likesMap.get(p.post.id) || 0,
            tags: tagsMap[p.post.id] || [],
        }))
    }

    switch (options?.orderBy) {
        case 'oldest':
            query = query.orderBy(asc(posts.createdAt))
            break
        default:
            query = query.orderBy(desc(posts.createdAt))
    }

    const postsData = await query.limit(limit).offset(offset).all()
    const postIds = postsData.map((p) => p.post.id)

    if (postIds.length === 0) return []

    const [viewsData, likesData, tagsData] = await Promise.all([
        db.select({ postId: views.postId, count: views.count })
            .from(views)
            .where(inArray(views.postId, postIds))
            .all(),
        db.select({ postId: likes.postId, count: count() })
            .from(likes)
            .where(inArray(likes.postId, postIds))
            .groupBy(likes.postId)
            .all(),
        db.select({ postId: postTags.postId, tag: tags })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(inArray(postTags.postId, postIds))
            .all()
    ])

    const viewsMap = new Map(viewsData.map(v => [v.postId, v.count]))
    const likesMap = new Map(likesData.map(l => [l.postId, l.count]))
    const tagsMap = tagsData.reduce((acc, curr) => {
        if (!acc[curr.postId]) acc[curr.postId] = []
        acc[curr.postId].push(curr.tag)
        return acc
    }, {} as Record<string, typeof tags.$inferSelect[]>)

    return postsData.map((p) => ({
        ...p.post,
        viewCount: viewsMap.get(p.post.id) || 0,
        likeCount: likesMap.get(p.post.id) || 0,
        tags: tagsMap[p.post.id] || [],
    }))
}

export const getPostsByTag = async (
    db: DB,
    tagId: string,
    options?: {
        limit?: number
        offset?: number
    },
) => {
    const limit = options?.limit || 10
    const offset = options?.offset || 0

    const postsData = await db
        .select({
            post: posts,
            blog: blogs,
        })
        .from(postTags)
        .innerJoin(posts, eq(postTags.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(postTags.tagId, tagId))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset)
        .all()

    const postIds = postsData.map(p => p.post.id)
    
    if (postIds.length === 0) return []

    const [viewsData, likesData] = await Promise.all([
        db.select({ postId: views.postId, count: views.count })
            .from(views)
            .where(inArray(views.postId, postIds))
            .all(),
        db.select({ postId: likes.postId, count: count() })
            .from(likes)
            .where(inArray(likes.postId, postIds))
            .groupBy(likes.postId)
            .all()
    ])

    const viewsMap = new Map(viewsData.map(v => [v.postId, v.count]))
    const likesMap = new Map(likesData.map(l => [l.postId, l.count]))

    return postsData.map((p) => ({
        ...p.post,
        blog: p.blog,
        viewCount: viewsMap.get(p.post.id) || 0,
        likeCount: likesMap.get(p.post.id) || 0,
    }))
}