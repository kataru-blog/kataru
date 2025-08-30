import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { blogs, customDomains } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = ReturnType<typeof drizzle>

export const createBlog = async (db: DB, userId: string, data: {
    title: string
    description?: string
    faviconUrl?: string
}) => {
    const blogId = crypto.randomUUID()
    
    const existingBlog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.userId, userId))
        .get()
    
    if (existingBlog) {
        throw new AppError(ERROR_MESSAGES.BLOG.ALREADY_EXISTS)
    }
    
    const titleExists = await db
        .select()
        .from(blogs)
        .where(eq(blogs.title, data.title))
        .get()
    
    if (titleExists) {
        throw new AppError(ERROR_MESSAGES.BLOG.TITLE_EXISTS)
    }
    
    const newBlog = await db
        .insert(blogs)
        .values({
            id: blogId,
            userId,
            title: data.title,
            description: data.description || null,
            faviconUrl: data.faviconUrl || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning()
        .get()
    
    return newBlog
}

export const updateBlog = async (db: DB, blogId: string, userId: string, data: {
    title?: string
    description?: string
    faviconUrl?: string
}) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.id, blogId))
        .get()
    
    if (!blog) {
        throw new AppError(ERROR_MESSAGES.BLOG.NOT_FOUND)
    }
    
    if (blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }
    
    if (data.title && data.title !== blog.title) {
        const titleExists = await db
            .select()
            .from(blogs)
            .where(eq(blogs.title, data.title))
            .get()
        
        if (titleExists) {
            throw new AppError(ERROR_MESSAGES.BLOG.TITLE_EXISTS)
        }
    }
    
    const updatedBlog = await db
        .update(blogs)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(blogs.id, blogId))
        .returning()
        .get()
    
    return updatedBlog
}

export const getBlogByUserId = async (db: DB, userId: string) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.userId, userId))
        .get()
    
    if (!blog) {
        return null
    }
    
    const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.blogId, blog.id))
        .all()
    
    return {
        ...blog,
        customDomains: domains
    }
}

export const getBlogById = async (db: DB, blogId: string) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.id, blogId))
        .get()
    
    if (!blog) {
        return null
    }
    
    const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.blogId, blog.id))
        .all()
    
    return {
        ...blog,
        customDomains: domains
    }
}

export const getBlogByTitle = async (db: DB, title: string) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.title, title))
        .get()
    
    if (!blog) {
        return null
    }
    
    const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.blogId, blog.id))
        .all()
    
    return {
        ...blog,
        customDomains: domains
    }
}

export const deleteBlog = async (db: DB, blogId: string, userId: string) => {
    const blog = await db
        .select()
        .from(blogs)
        .where(eq(blogs.id, blogId))
        .get()
    
    if (!blog) {
        throw new AppError(ERROR_MESSAGES.BLOG.NOT_FOUND)
    }
    
    if (blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }
    
    await db
        .delete(blogs)
        .where(eq(blogs.id, blogId))
        .run()
    
    return { success: true }
}