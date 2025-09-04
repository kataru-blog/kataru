import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, asc, count, sql } from 'drizzle-orm'
import { comments, posts, blogs, user } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = ReturnType<typeof drizzle>

export const createComment = async (db: DB, postId: string, userId: string, data: {
    content: string
    isSecret?: boolean
    parentId?: string | null
}) => {
    if (!data.content?.trim()) {
        throw new AppError(ERROR_MESSAGES.COMMENT.CONTENT_REQUIRED)
    }
    
    const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get()
    
    if (!post) {
        throw new AppError(ERROR_MESSAGES.COMMENT.POST_NOT_FOUND)
    }
    
    if (!post.allowComment) {
        throw new AppError(ERROR_MESSAGES.COMMENT.COMMENTS_DISABLED)
    }
    
    if (data.parentId) {
        const parentComment = await db
            .select()
            .from(comments)
            .where(and(
                eq(comments.id, data.parentId),
                eq(comments.postId, postId)
            ))
            .get()
        
        if (!parentComment) {
            throw new AppError(ERROR_MESSAGES.COMMENT.NOT_FOUND)
        }
    }
    
    const commentId = crypto.randomUUID()
    
    const newComment = await db
        .insert(comments)
        .values({
            id: commentId,
            postId,
            userId,
            content: data.content.trim(),
            isSecret: data.isSecret || false,
            parentId: data.parentId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning()
        .get()
    
    return newComment
}

export const updateComment = async (db: DB, commentId: string, userId: string, data: {
    content?: string
    isSecret?: boolean
}) => {
    const comment = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .get()
    
    if (!comment) {
        throw new AppError(ERROR_MESSAGES.COMMENT.NOT_FOUND)
    }
    
    if (comment.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.COMMENT.UNAUTHORIZED)
    }
    
    if (data.content !== undefined && !data.content.trim()) {
        throw new AppError(ERROR_MESSAGES.COMMENT.CONTENT_REQUIRED)
    }
    
    const updateData: Partial<typeof comments.$inferInsert> = {
        updatedAt: new Date(),
    }
    
    if (data.content !== undefined) updateData.content = data.content.trim()
    if (data.isSecret !== undefined) updateData.isSecret = data.isSecret
    
    const updatedComment = await db
        .update(comments)
        .set(updateData)
        .where(eq(comments.id, commentId))
        .returning()
        .get()
    
    return updatedComment
}

export const deleteComment = async (db: DB, commentId: string, userId: string, isOwner?: boolean) => {
    const commentWithPost = await db
        .select({
            comment: comments,
            post: posts,
            blog: blogs
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(comments.id, commentId))
        .get()
    
    if (!commentWithPost) {
        throw new AppError(ERROR_MESSAGES.COMMENT.NOT_FOUND)
    }
    
    const canDelete = 
        commentWithPost.comment.userId === userId || 
        (isOwner && commentWithPost.blog.userId === userId)
    
    if (!canDelete) {
        throw new AppError(ERROR_MESSAGES.COMMENT.UNAUTHORIZED)
    }
    
    const childComments = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.parentId, commentId))
        .all()
    
    if (childComments.length > 0) {
        await db
            .update(comments)
            .set({
                content: '삭제된 댓글입니다.',
                isSecret: false,
                updatedAt: new Date(),
            })
            .where(eq(comments.id, commentId))
    } else {
        await db.delete(comments).where(eq(comments.id, commentId))
    }
    
    return { success: true }
}

export const getCommentById = async (db: DB, commentId: string) => {
    const commentData = await db
        .select({
            comment: comments,
            author: user,
        })
        .from(comments)
        .innerJoin(user, eq(comments.userId, user.id))
        .where(eq(comments.id, commentId))
        .get()
    
    if (!commentData) {
        return null
    }
    
    return {
        ...commentData.comment,
        author: {
            id: commentData.author.id,
            name: commentData.author.name,
            image: commentData.author.image,
        }
    }
}

export const getCommentsByPostId = async (db: DB, postId: string, userId?: string, options?: {
    limit?: number
    offset?: number
    orderBy?: 'latest' | 'oldest'
    includeSecret?: boolean
}) => {
    const limit = Math.min(Math.max(options?.limit || 50, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)
    
    const postWithBlog = await db
        .select({
            post: posts,
            blogUserId: blogs.userId,
        })
        .from(posts)
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(posts.id, postId))
        .get()
    
    if (!postWithBlog) {
        throw new AppError(ERROR_MESSAGES.COMMENT.POST_NOT_FOUND)
    }
    
    let query = db
        .select({
            comment: comments,
            author: {
                id: user.id,
                name: user.name,
                image: user.image,
            },
        })
        .from(comments)
        .innerJoin(user, eq(comments.userId, user.id))
        .where(eq(comments.postId, postId))
        .$dynamic()
    
    if (options?.orderBy === 'oldest') {
        query = query.orderBy(asc(comments.createdAt))
    } else {
        query = query.orderBy(desc(comments.createdAt))
    }
    
    const commentsData = await query
        .limit(limit)
        .offset(offset)
        .all()
    
    return commentsData.map(c => {
        const isAuthor = c.comment.userId === userId
        const isBlogOwner = postWithBlog.blogUserId === userId
        const canViewSecret = isAuthor || isBlogOwner
        
        if (c.comment.isSecret && !canViewSecret) {
            return {
                ...c.comment,
                content: '비밀 댓글입니다.',
                author: {
                    id: null,
                    name: '비밀',
                    image: null,
                }
            }
        }
        
        return {
            ...c.comment,
            author: c.author,
        }
    })
}

export const getCommentsByUserId = async (db: DB, userId: string, options?: {
    limit?: number
    offset?: number
}) => {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)
    
    const commentsData = await db
        .select({
            comment: comments,
            post: {
                id: posts.id,
                title: posts.title,
                blogId: posts.blogId,
            },
            blog: {
                id: blogs.id,
                title: blogs.title,
            }
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(blogs, eq(posts.blogId, blogs.id))
        .where(eq(comments.userId, userId))
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(offset)
        .all()
    
    return commentsData.map(c => ({
        ...c.comment,
        post: c.post,
        blog: c.blog,
    }))
}

export const getCommentCount = async (db: DB, postId: string) => {
    const result = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.postId, postId))
        .get()
    
    return result?.count || 0
}

export const getRecentComments = async (db: DB, blogId: string, options?: {
    limit?: number
}) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 50)
    
    const commentsData = await db
        .select({
            comment: comments,
            author: {
                id: user.id,
                name: user.name,
                image: user.image,
            },
            post: {
                id: posts.id,
                title: posts.title,
            }
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(user, eq(comments.userId, user.id))
        .where(eq(posts.blogId, blogId))
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .all()
    
    return commentsData.map(c => ({
        ...c.comment,
        author: c.author,
        post: c.post,
    }))
}