import { drizzle } from 'drizzle-orm/d1'
import { eq, and, not } from 'drizzle-orm'
import { customDomains, blogs } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = ReturnType<typeof drizzle>

export const addCustomDomain = async (db: DB, blogId: string, userId: string, domain: string) => {
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
    
    domain = domain.toLowerCase().trim()
    
    if (!isValidDomain(domain)) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.INVALID_FORMAT)
    }
    
    const existingDomain = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.domain, domain))
        .get()
    
    if (existingDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.ALREADY_IN_USE)
    }
    
    const domainId = crypto.randomUUID()
    
    const newDomain = await db
        .insert(customDomains)
        .values({
            id: domainId,
            blogId,
            domain,
            createdAt: new Date(),
        })
        .returning()
        .get()
    
    return newDomain
}

export const removeCustomDomain = async (db: DB, domainId: string, userId: string) => {
    const customDomain = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.id, domainId))
        .get()
    
    if (!customDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.NOT_FOUND)
    }
    
    if (customDomain.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.UNAUTHORIZED)
    }
    
    await db
        .delete(customDomains)
        .where(eq(customDomains.id, domainId))
        .run()
    
    return { success: true }
}

export const getCustomDomainsByBlogId = async (db: DB, blogId: string) => {
    const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.blogId, blogId))
        .all()
    
    return domains
}

export const getBlogByCustomDomain = async (db: DB, domain: string) => {
    domain = domain.toLowerCase().trim()
    
    const result = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.domain, domain))
        .get()
    
    if (!result) {
        return null
    }
    
    return {
        blog: result.blog,
        customDomain: result.domain
    }
}

export const updateCustomDomain = async (db: DB, domainId: string, userId: string, newDomain: string) => {
    newDomain = newDomain.toLowerCase().trim()
    
    if (!isValidDomain(newDomain)) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.INVALID_FORMAT)
    }
    
    const customDomain = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.id, domainId))
        .get()
    
    if (!customDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.NOT_FOUND)
    }
    
    if (customDomain.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.UNAUTHORIZED)
    }
    
    const existingDomain = await db
        .select()
        .from(customDomains)
        .where(and(
            eq(customDomains.domain, newDomain),
            not(eq(customDomains.id, domainId))
        ))
        .get()
    
    if (existingDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.ALREADY_IN_USE)
    }
    
    const updatedDomain = await db
        .update(customDomains)
        .set({
            domain: newDomain,
        })
        .where(eq(customDomains.id, domainId))
        .returning()
        .get()
    
    return updatedDomain
}

export const verifyDomainOwnership = async (db: DB, domain: string, userId: string) => {
    domain = domain.toLowerCase().trim()
    
    const result = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.domain, domain))
        .get()
    
    if (!result) {
        return false
    }
    
    return result.blog.userId === userId
}

const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
    
    if (!domainRegex.test(domain)) {
        return false
    }
    
    const parts = domain.split('.')
    if (parts.length < 2) {
        return false
    }
    
    for (const part of parts) {
        if (part.length > 63 || part.length === 0) {
            return false
        }
    }
    
    return true
}