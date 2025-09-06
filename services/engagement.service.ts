import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, sql } from 'drizzle-orm'
import { views, likes, posts, blogs } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = ReturnType<typeof drizzle>


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

export const trackPostView = async (
    db: DB, 
    postId: string, 
    options?: {
        userId?: string | null
        ipAddress?: string | null
        userAgent?: string | null
    }
) => {
    try {
        await db.insert(views).values({
            id: crypto.randomUUID(),
            postId,
            userId: options?.userId || null,
            viewedAt: new Date(),
            ipAddress: options?.ipAddress || null,
            userAgent: options?.userAgent || null,
        }).run()
    } catch (error) {
        console.error('Failed to track post view:', error)
    }
}

export const getUserLikedPosts = async (db: DB, userId: string, options?: {
    limit?: number
    offset?: number
}) => {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)
    
    const likedPosts = await db
        .select({
            likeId: likes.id,
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
                    FROM ${likes} l2
                    WHERE l2.${likes.postId} = ${posts.id}
                ), 0)
            `.as('likeCount'),
        })
        .from(likes)
        .innerJoin(posts, eq(likes.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(likes.userId, userId))
        .orderBy(desc(likes.id))
        .limit(limit)
        .offset(offset)
        .all()
    
    return likedPosts.map(lp => ({
        ...lp.post,
        blog: lp.blog,
        viewCount: lp.viewCount,
        likeCount: lp.likeCount,
    }))
}

