import { and, desc, eq, like, not, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { posts, postTags, tags } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'
import { escapeLikePattern } from '../shared/utils/sql-escape'

type DB = ReturnType<typeof drizzle>

export const createTag = async (db: DB, name: string) => {
    if (!name?.trim()) {
        throw new AppError(ERROR_MESSAGES.TAG.NAME_REQUIRED)
    }

    name = name.trim().toLowerCase()

    const existingTag = await db.select().from(tags).where(eq(tags.name, name)).get()

    if (existingTag) {
        return existingTag
    }

    const tagId = crypto.randomUUID()

    const newTag = await db
        .insert(tags)
        .values({
            id: tagId,
            name,
        })
        .returning()
        .get()

    return newTag
}

export const updateTag = async (db: DB, tagId: string, name: string) => {
    if (!name?.trim()) {
        throw new AppError(ERROR_MESSAGES.TAG.NAME_REQUIRED)
    }

    name = name.trim().toLowerCase()

    const tag = await db.select().from(tags).where(eq(tags.id, tagId)).get()

    if (!tag) {
        throw new AppError(ERROR_MESSAGES.TAG.NOT_FOUND)
    }

    const existingTag = await db
        .select()
        .from(tags)
        .where(and(eq(tags.name, name), not(eq(tags.id, tagId))))
        .get()

    if (existingTag) {
        throw new AppError(ERROR_MESSAGES.TAG.ALREADY_EXISTS)
    }

    const updatedTag = await db.update(tags).set({ name }).where(eq(tags.id, tagId)).returning().get()

    return updatedTag
}

export const deleteTag = async (db: DB, tagId: string) => {
    const tag = await db.select().from(tags).where(eq(tags.id, tagId)).get()

    if (!tag) {
        throw new AppError(ERROR_MESSAGES.TAG.NOT_FOUND)
    }

    await db.delete(tags).where(eq(tags.id, tagId)).run()

    return { success: true }
}

export const getTagById = async (db: DB, tagId: string) => {
    const tagWithCount = await db
        .select({
            tag: tags,
            postCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${postTags}
                    WHERE ${postTags.tagId} = ${tags.id}
                ), 0)
            `.as('postCount'),
        })
        .from(tags)
        .where(eq(tags.id, tagId))
        .get()

    if (!tagWithCount) {
        return null
    }

    return {
        ...tagWithCount.tag,
        postCount: tagWithCount.postCount,
    }
}

export const getTagByName = async (db: DB, name: string) => {
    name = name.trim().toLowerCase()

    const tagWithCount = await db
        .select({
            tag: tags,
            postCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${postTags}
                    WHERE ${postTags.tagId} = ${tags.id}
                ), 0)
            `.as('postCount'),
        })
        .from(tags)
        .where(eq(tags.name, name))
        .get()

    if (!tagWithCount) {
        return null
    }

    return {
        ...tagWithCount.tag,
        postCount: tagWithCount.postCount,
    }
}

export const getAllTags = async (
    db: DB,
    options?: {
        limit?: number
        offset?: number
        orderBy?: 'name'
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 50, 1), 100)
    const offset = Math.max(options?.offset || 0, 0)

    const results = await db
        .select()
        .from(tags)
        .orderBy(desc(tags.name))
        .limit(limit)
        .offset(offset)
        .all()

    return results
}

export const getTagsByBlogId = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        orderBy?: 'name' | 'popular'
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 50, 1), 100)

    const tagsData = db
        .select({
            tag: tags,
            postCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${postTags}
                    INNER JOIN ${posts} ON ${postTags.postId} = ${posts.id}
                    WHERE ${postTags.tagId} = ${tags.id} 
                    AND ${posts.blogId} = ${blogId}
                ), 0)
            `.as('postCount'),
        })
        .from(tags)
        .where(
            sql`EXISTS (
                SELECT 1 FROM ${postTags}
                INNER JOIN ${posts} ON ${postTags.postId} = ${posts.id}
                WHERE ${postTags.tagId} = ${tags.id}
                AND ${posts.blogId} = ${blogId}
            )`
        )
        .$dynamic()

    if (options?.orderBy === 'popular') {
        tagsData.orderBy(desc(sql`postCount`))
    } else {
        tagsData.orderBy(desc(tags.name))
    }

    const results = await tagsData.limit(limit).all()

    return results.map((r) => ({
        ...r.tag,
        postCount: r.postCount,
    }))
}

export const searchTags = async (
    db: DB,
    query: string,
    options?: {
        limit?: number
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 50)
    query = query.trim().toLowerCase()

    if (!query) {
        return []
    }

    const tagsData = await db
        .select({
            tag: tags,
            postCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${postTags}
                    WHERE ${postTags.tagId} = ${tags.id}
                ), 0)
            `.as('postCount'),
        })
        .from(tags)
        .where(like(tags.name, `%${escapeLikePattern(query)}%`))
        .orderBy(desc(tags.name))
        .limit(limit)
        .all()

    return tagsData.map((r) => ({
        ...r.tag,
        postCount: r.postCount,
    }))
}

export const createOrGetTag = async (db: DB, name: string) => {
    name = name.trim().toLowerCase()

    if (!name) {
        throw new AppError(ERROR_MESSAGES.TAG.NAME_REQUIRED)
    }

    const existingTag = await db.select().from(tags).where(eq(tags.name, name)).get()

    if (existingTag) {
        return existingTag
    }

    return await createTag(db, name)
}
