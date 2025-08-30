import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, count, sum, inArray, gte } from 'drizzle-orm'
import { views, likes, posts, blogs } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = ReturnType<typeof drizzle>

export const incrementViewCount = async (db: DB, postId: string, sessionId?: string) => {
    const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get()
    
    if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }
    
    const viewRecord = await db
        .select()
        .from(views)
        .where(eq(views.postId, postId))
        .get()
    
    if (viewRecord) {
        await db
            .update(views)
            .set({
                count: viewRecord.count + 1,
            })
            .where(eq(views.postId, postId))
    } else {
        await db
            .insert(views)
            .values({
                id: crypto.randomUUID(),
                postId,
                count: 1,
            })
    }
    
    return { success: true }
}

export const getViewCount = async (db: DB, postId: string) => {
    const viewRecord = await db
        .select()
        .from(views)
        .where(eq(views.postId, postId))
        .get()
    
    return viewRecord?.count || 0
}

export const toggleLike = async (db: DB, postId: string, userId: string) => {
    const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get()
    
    if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }
    
    const existingLike = await db
        .select()
        .from(likes)
        .where(and(
            eq(likes.postId, postId),
            eq(likes.userId, userId)
        ))
        .get()
    
    if (existingLike) {
        await db
            .delete(likes)
            .where(and(
                eq(likes.postId, postId),
                eq(likes.userId, userId)
            ))
        
        return { liked: false }
    } else {
        await db
            .insert(likes)
            .values({
                id: crypto.randomUUID(),
                postId,
                userId,
            })
        
        return { liked: true }
    }
}

export const getLikeCount = async (db: DB, postId: string) => {
    const result = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.postId, postId))
        .get()
    
    return result?.count || 0
}

export const isLikedByUser = async (db: DB, postId: string, userId: string) => {
    const like = await db
        .select()
        .from(likes)
        .where(and(
            eq(likes.postId, postId),
            eq(likes.userId, userId)
        ))
        .get()
    
    return !!like
}

export const getUserLikedPosts = async (db: DB, userId: string, options?: {
    limit?: number
    offset?: number
}) => {
    const limit = options?.limit || 20
    const offset = options?.offset || 0
    
    const likedPosts = await db
        .select({
            likeId: likes.id,
            post: posts,
            blog: blogs,
        })
        .from(likes)
        .innerJoin(posts, eq(likes.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(likes.userId, userId))
        .orderBy(desc(likes.id))
        .limit(limit)
        .offset(offset)
        .all()
    
    const postIds = likedPosts.map(lp => lp.post.id)
    
    if (postIds.length === 0) return []
    
    const viewsData = await db
        .select({ postId: views.postId, count: views.count })
        .from(views)
        .where(inArray(views.postId, postIds))
        .all()
    
    const viewsMap = new Map(viewsData.map(v => [v.postId, v.count]))
    
    return likedPosts.map(lp => ({
        ...lp.post,
        blog: lp.blog,
        viewCount: viewsMap.get(lp.post.id) || 0,
    }))
}

export const getPopularPosts = async (db: DB, blogId?: string, options?: {
    limit?: number
    period?: 'all' | 'month' | 'week'
}) => {
    const limit = options?.limit || 10
    
    let query = db
        .select({
            post: posts,
            blog: blogs,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .$dynamic()
    
    if (blogId) {
        query = query.where(eq(posts.blogId, blogId))
    }
    
    if (options?.period === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        if (blogId) {
            query = query.where(and(
                eq(posts.blogId, blogId),
                gte(posts.createdAt, weekAgo)
            ))
        } else {
            query = query.where(gte(posts.createdAt, weekAgo))
        }
    } else if (options?.period === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        if (blogId) {
            query = query.where(and(
                eq(posts.blogId, blogId),
                gte(posts.createdAt, monthAgo)
            ))
        } else {
            query = query.where(gte(posts.createdAt, monthAgo))
        }
    }
    
    const postsData = await query.all()
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
    
    const postsWithEngagement = postsData.map(p => {
        const viewCount = viewsMap.get(p.post.id) || 0
        const likeCount = likesMap.get(p.post.id) || 0
        return {
            ...p.post,
            blog: p.blog,
            viewCount,
            likeCount,
            popularity: viewCount + (likeCount * 2),
        }
    })
    
    postsWithEngagement.sort((a, b) => b.popularity - a.popularity)
    
    return postsWithEngagement.slice(0, limit)
}

export const getPostEngagement = async (db: DB, postId: string, userId?: string) => {
    const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get()
    
    if (!post) {
        throw new AppError(ERROR_MESSAGES.POST.NOT_FOUND)
    }
    
    const [viewCount, likeCount, isLiked] = await Promise.all([
        getViewCount(db, postId),
        getLikeCount(db, postId),
        userId ? isLikedByUser(db, postId, userId) : Promise.resolve(false)
    ])
    
    return {
        postId,
        viewCount,
        likeCount,
        isLiked,
    }
}

export const getBlogStats = async (db: DB, blogId: string) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.id, blogId))
        .get()
    
    if (!blog) {
        throw new AppError(ERROR_MESSAGES.BLOG.NOT_FOUND)
    }
    
    const blogPosts = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.blogId, blogId))
        .all()
    
    const postIds = blogPosts.map(p => p.id)
    
    if (postIds.length === 0) {
        return {
            blogId,
            postCount: 0,
            totalViews: 0,
            totalLikes: 0,
        }
    }
    
    const [viewsData, likesCount] = await Promise.all([
        db.select({ total: sum(views.count) })
            .from(views)
            .where(inArray(views.postId, postIds))
            .get(),
        db.select({ count: count() })
            .from(likes)
            .where(inArray(likes.postId, postIds))
            .get()
    ])
    
    return {
        blogId,
        postCount: postIds.length,
        totalViews: Number(viewsData?.total || 0),
        totalLikes: likesCount?.count || 0,
    }
}