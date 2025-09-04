import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq, asc, sql } from 'drizzle-orm'
import { user, customLink } from '../entities'
import * as schema from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

type DB = DrizzleD1Database<typeof schema>

export const getUserById = async (db: DB, userId: string) => {
    if (!userId) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const userData = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            nickname: user.nickname,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            customLinksCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${customLink}
                    WHERE ${customLink.userId} = ${user.id}
                ), 0)
            `.as('customLinksCount'),
        })
        .from(user)
        .where(eq(user.id, userId))
        .get()

    if (!userData) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const customLinks = await db
        .select({
            id: customLink.id,
            url: customLink.url,
            label: customLink.label,
            sortOrder: customLink.sortOrder,
        })
        .from(customLink)
        .where(eq(customLink.userId, userId))
        .orderBy(asc(customLink.sortOrder), asc(customLink.createdAt))
        .all()

    return {
        ...userData,
        customLinks,
    }
}

export const getCustomLinksByNickname = async (db: DB, nickname: string) => {
    if (!nickname) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const userData = await db
        .select({
            id: user.id,
            nickname: user.nickname,
        })
        .from(user)
        .where(eq(user.nickname, nickname))
        .get()

    if (!userData) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const customLinks = await db
        .select({
            id: customLink.id,
            url: customLink.url,
            label: customLink.label,
            sortOrder: customLink.sortOrder,
        })
        .from(customLink)
        .where(eq(customLink.userId, userData.id))
        .orderBy(asc(customLink.sortOrder), asc(customLink.createdAt))
        .all()

    return customLinks
}

export const getUserWithLinksByNickname = async (db: DB, nickname: string) => {
    if (!nickname) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const userData = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            nickname: user.nickname,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        })
        .from(user)
        .where(eq(user.nickname, nickname))
        .get()

    if (!userData) {
        throw new AppError(ERROR_MESSAGES.USER.NOT_FOUND)
    }

    const customLinks = await db
        .select({
            id: customLink.id,
            url: customLink.url,
            label: customLink.label,
            sortOrder: customLink.sortOrder,
        })
        .from(customLink)
        .where(eq(customLink.userId, userData.id))
        .orderBy(asc(customLink.sortOrder), asc(customLink.createdAt))
        .all()

    return {
        ...userData,
        customLinks,
    }
}