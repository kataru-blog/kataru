import { and, count, desc, eq, like, not } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { posts, postTags, tags } from '../entities'
import { AppError, ERROR_MESSAGES } from '../shared/constant/error-messages'

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
    const tag = await db.select().from(tags).where(eq(tags.id, tagId)).get()

    if (!tag) {
        return null
    }

    const postCount = await db.select({ count: count() }).from(postTags).where(eq(postTags.tagId, tagId)).get()

    return {
        ...tag,
        postCount: postCount?.count || 0,
    }
}

export const getTagByName = async (db: DB, name: string) => {
    name = name.trim().toLowerCase()

    const tag = await db.select().from(tags).where(eq(tags.name, name)).get()

    if (!tag) {
        return null
    }

    const postCount = await db.select({ count: count() }).from(postTags).where(eq(postTags.tagId, tag.id)).get()

    return {
        ...tag,
        postCount: postCount?.count || 0,
    }
}

export const getAllTags = async (
    db: DB,
    options?: {
        limit?: number
        offset?: number
        orderBy?: 'name' | 'popular'
    },
) => {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const tagsData = db
        .select({
            tag: tags,
            postCount: count(postTags.postId),
        })
        .from(tags)
        .leftJoin(postTags, eq(tags.id, postTags.tagId))
        .groupBy(tags.id)
        .$dynamic()

    if (options?.orderBy === 'popular') {
        tagsData.orderBy(desc(postTags.postId))
    } else {
        tagsData.orderBy(desc(tags.name))
    }

    const results = await tagsData.limit(limit).offset(offset).all()

    return results.map((r) => ({
        ...r.tag,
        postCount: r.postCount || 0,
    }))
}

export const getTagsByBlogId = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        orderBy?: 'name' | 'popular'
    },
) => {
    const limit = options?.limit || 50

    const tagsData = db
        .select({
            tag: tags,
            postCount: count(postTags.postId),
        })
        .from(tags)
        .innerJoin(postTags, eq(tags.id, postTags.tagId))
        .innerJoin(posts, eq(postTags.postId, posts.id))
        .where(eq(posts.blogId, blogId))
        .groupBy(tags.id)
        .$dynamic()

    if (options?.orderBy === 'popular') {
        tagsData.orderBy(desc(postTags.postId))
    } else {
        tagsData.orderBy(desc(tags.name))
    }

    const results = await tagsData.limit(limit).all()

    return results.map((r) => ({
        ...r.tag,
        postCount: r.postCount || 0,
    }))
}

export const searchTags = async (
    db: DB,
    query: string,
    options?: {
        limit?: number
    },
) => {
    const limit = options?.limit || 10
    query = query.trim().toLowerCase()

    if (!query) {
        return []
    }

    const tagsData = await db
        .select({
            tag: tags,
            postCount: count(postTags.postId),
        })
        .from(tags)
        .leftJoin(postTags, eq(tags.id, postTags.tagId))
        .where(like(tags.name, `%${query}%`))
        .groupBy(tags.id)
        .orderBy(desc(tags.name))
        .limit(limit)
        .all()

    return tagsData.map((r) => ({
        ...r.tag,
        postCount: r.postCount || 0,
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
