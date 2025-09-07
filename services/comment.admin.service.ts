import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, asc, like, sql, lt, gt } from 'drizzle-orm'
import { comments, posts, blogs, user } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = DrizzleD1Database<typeof schema>

export const getAdminComments = async (
    db: DB,
    blogId: string,
    options?: {
        keyword?: string
        sortOrder?: 'asc' | 'desc'
        limit?: number
        offset?: number
        cursor?: string
        useCursor?: boolean
    }
) => {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)
    const sortOrder = options?.sortOrder || 'desc'

    const conditions = [
        sql`${posts.blogId} = ${blogId}`
    ]

    if (options?.keyword) {
        conditions.push(like(comments.content, `%${options.keyword}%`))
    }
    
    if (options?.useCursor && options?.cursor) {
        if (sortOrder === 'desc') {
            conditions.push(lt(comments.id, options.cursor))
        } else {
            conditions.push(gt(comments.id, options.cursor))
        }
    }

    const orderByDirection = sortOrder === 'asc' ? asc : desc

    const commentsQuery = db
        .select({
            comment: comments,
            post: {
                id: posts.id,
                postNumber: posts.postNumber,
                title: posts.title,
            },
            user: {
                id: user.id,
                username: user.name,
                profileImage: user.image,
            }
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(user, eq(comments.userId, user.id))
        .where(and(...conditions))
        .orderBy(orderByDirection(comments.createdAt))
        .limit(limit)
    
    const commentsList = await (options?.useCursor 
        ? commentsQuery 
        : commentsQuery.offset(offset)
    ).all()

    const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(and(
            sql`EXISTS (
                SELECT 1 FROM ${posts}
                WHERE ${posts.id} = ${comments.postId}
                AND ${posts.blogId} = ${blogId}
            )`,
            options?.keyword ? like(comments.content, `%${options.keyword}%`) : sql`1=1`
        ))
        .get()

    return {
        comments: commentsList.map(item => ({
            ...item.comment,
            post: item.post,
            user: item.user,
        })),
        totalCount: totalCount?.count || 0,
        limit,
        offset,
    }
}

export const deleteAdminComment = async (
    db: DB,
    commentId: string,
    userId: string
) => {
    const comment = await db
        .select({
            comment: comments,
            blog: blogs
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(comments.id, commentId))
        .get()

    if (!comment) {
        throw new AppError(ERROR_MESSAGES.COMMENT.NOT_FOUND)
    }

    if (comment.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }

    await db
        .update(comments)
        .set({ 
            isSecret: true,
            updatedAt: new Date()
        })
        .where(eq(comments.id, commentId))
        .run()

    return { success: true }
}