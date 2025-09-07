import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { blogs, customDomains, customLink, user } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = DrizzleD1Database<typeof schema>

export const getBlogInfo = async (
    db: DB,
    blogId: string,
    userId: string
) => {
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
    
    return blog
}

export const updateBlogInfo = async (
    db: DB,
    blogId: string,
    userId: string,
    data: {
        title?: string
        description?: string
        faviconUrl?: string
    }
) => {
    const blog = await getBlogInfo(db, blogId, userId)
    
    const updateData: Partial<typeof blogs.$inferInsert> = {
        updatedAt: new Date(),
    }
    
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim()
    if (data.faviconUrl !== undefined) updateData.faviconUrl = data.faviconUrl
    
    await db
        .update(blogs)
        .set(updateData)
        .where(eq(blogs.id, blogId))
        .run()
    
    return { success: true }
}

export const getCustomDomains = async (
    db: DB,
    blogId: string,
    userId: string
) => {
    const blog = await getBlogInfo(db, blogId, userId)
    
    const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.blogId, blogId))
        .orderBy(desc(customDomains.createdAt))
        .all()
    
    return domains
}

export const createCustomDomain = async (
    db: DB,
    blogId: string,
    userId: string,
    domain: string
) => {
    const blog = await getBlogInfo(db, blogId, userId)
    
    if (!domain?.trim()) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.INVALID_FORMAT)
    }
    
    const existingDomain = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.domain, domain.trim()))
        .get()
    
    if (existingDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.ALREADY_IN_USE)
    }
    
    const domainId = crypto.randomUUID()
    
    await db
        .insert(customDomains)
        .values({
            id: domainId,
            blogId,
            domain: domain.trim(),
        })
        .run()
    
    return { id: domainId, domain: domain.trim() }
}

export const updateCustomDomain = async (
    db: DB,
    domainId: string,
    userId: string,
    newDomain: string
) => {
    const domainData = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.id, domainId))
        .get()
    
    if (!domainData) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.NOT_FOUND)
    }
    
    if (domainData.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }
    
    if (!newDomain?.trim()) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.INVALID_FORMAT)
    }
    
    const existingDomain = await db
        .select()
        .from(customDomains)
        .where(and(
            eq(customDomains.domain, newDomain.trim()),
            sql`${customDomains.id} != ${domainId}`
        ))
        .get()
    
    if (existingDomain) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.ALREADY_IN_USE)
    }
    
    await db
        .update(customDomains)
        .set({ domain: newDomain.trim() })
        .where(eq(customDomains.id, domainId))
        .run()
    
    return { success: true }
}

export const deleteCustomDomain = async (
    db: DB,
    domainId: string,
    userId: string
) => {
    const domainData = await db
        .select({
            domain: customDomains,
            blog: blogs
        })
        .from(customDomains)
        .innerJoin(blogs, eq(customDomains.blogId, blogs.id))
        .where(eq(customDomains.id, domainId))
        .get()
    
    if (!domainData) {
        throw new AppError(ERROR_MESSAGES.DOMAIN.NOT_FOUND)
    }
    
    if (domainData.blog.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.BLOG.UNAUTHORIZED)
    }
    
    await db
        .delete(customDomains)
        .where(eq(customDomains.id, domainId))
        .run()
    
    return { success: true }
}

export const getCustomLinks = async (
    db: DB,
    userId: string
) => {
    const links = await db
        .select()
        .from(customLink)
        .where(eq(customLink.userId, userId))
        .orderBy(asc(customLink.sortOrder), desc(customLink.createdAt))
        .all()
    
    return links
}

export const createCustomLink = async (
    db: DB,
    userId: string,
    data: {
        url: string
        label: string
        sortOrder?: number
    }
) => {
    if (!data.url?.trim() || !data.label?.trim()) {
        throw new AppError(ERROR_MESSAGES.GENERAL.BAD_REQUEST)
    }
    
    const maxOrder = await db
        .select({ max: sql<number>`MAX(${customLink.sortOrder})` })
        .from(customLink)
        .where(eq(customLink.userId, userId))
        .get()
    
    const linkId = crypto.randomUUID()
    const sortOrder = data.sortOrder ?? ((maxOrder?.max || 0) + 1)
    
    await db
        .insert(customLink)
        .values({
            id: linkId,
            userId,
            url: data.url.trim(),
            label: data.label.trim(),
            sortOrder,
        })
        .run()
    
    return { id: linkId, url: data.url.trim(), label: data.label.trim(), sortOrder }
}

export const updateCustomLink = async (
    db: DB,
    linkId: string,
    userId: string,
    data: {
        url?: string
        label?: string
        sortOrder?: number
    }
) => {
    const link = await db
        .select()
        .from(customLink)
        .where(eq(customLink.id, linkId))
        .get()
    
    if (!link) {
        throw new AppError(ERROR_MESSAGES.GENERAL.NOT_FOUND)
    }
    
    if (link.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.GENERAL.NOT_FOUND)
    }
    
    const updateData: Partial<typeof customLink.$inferInsert> = {
        updatedAt: new Date(),
    }
    
    if (data.url !== undefined) updateData.url = data.url.trim()
    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    
    await db
        .update(customLink)
        .set(updateData)
        .where(eq(customLink.id, linkId))
        .run()
    
    return { success: true }
}

export const deleteCustomLink = async (
    db: DB,
    linkId: string,
    userId: string
) => {
    const link = await db
        .select()
        .from(customLink)
        .where(eq(customLink.id, linkId))
        .get()
    
    if (!link) {
        throw new AppError(ERROR_MESSAGES.GENERAL.NOT_FOUND)
    }
    
    if (link.userId !== userId) {
        throw new AppError(ERROR_MESSAGES.GENERAL.NOT_FOUND)
    }
    
    await db
        .delete(customLink)
        .where(eq(customLink.id, linkId))
        .run()
    
    return { success: true }
}

export const reorderCustomLinks = async (
    db: DB,
    userId: string,
    linkOrders: Array<{ id: string; sortOrder: number }>
) => {
    const links = await db
        .select({ id: customLink.id })
        .from(customLink)
        .where(eq(customLink.userId, userId))
        .all()
    
    const userLinkIds = new Set(links.map(l => l.id))
    
    for (const order of linkOrders) {
        if (!userLinkIds.has(order.id)) {
            throw new AppError(ERROR_MESSAGES.GENERAL.NOT_FOUND)
        }
    }
    
    await db.batch(
        linkOrders.map(order => 
            db
                .update(customLink)
                .set({ 
                    sortOrder: order.sortOrder,
                    updatedAt: new Date()
                })
                .where(eq(customLink.id, order.id))
        )
    )
    
    return { success: true }
}

export const getUserInfo = async (
    db: DB,
    userId: string
) => {
    const userInfo = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .get()
    
    if (!userInfo) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }
    
    return userInfo
}

export const updateUserInfo = async (
    db: DB,
    userId: string,
    data: {
        name?: string
        nickname?: string
        image?: string
    }
) => {
    const userInfo = await getUserInfo(db, userId)
    
    const updateData: Partial<typeof user.$inferInsert> = {
        updatedAt: new Date(),
    }
    
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.image !== undefined) updateData.image = data.image
    
    if (data.nickname !== undefined) {
        const trimmedNickname = data.nickname.trim()
        
        if (trimmedNickname !== userInfo.nickname) {
            const existingNickname = await db
                .select()
                .from(user)
                .where(and(
                    eq(user.nickname, trimmedNickname),
                    sql`${user.id} != ${userId}`
                ))
                .get()
            
            if (existingNickname) {
                throw new AppError({
                    status: 409,
                    message: 'Nickname already in use'
                })
            }
            
            updateData.nickname = trimmedNickname
        }
    }
    
    await db
        .update(user)
        .set(updateData)
        .where(eq(user.id, userId))
        .run()
    
    return { success: true }
}