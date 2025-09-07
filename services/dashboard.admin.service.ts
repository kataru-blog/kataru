import { and, desc, gte, lte, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../entities'
import { blogs, likes, posts, views } from '../entities'

type DB = DrizzleD1Database<typeof schema>

type Period = 'daily' | 'weekly' | 'monthly'

export const getDashboardChartData = async (
    db: DB,
    blogId: string,
    period: Period,
    options?: {
        startDate?: Date
        endDate?: Date
    },
) => {
    const now = new Date()
    const endDate = options?.endDate || now

    let startDate: Date
    let groupFormat: string
    let maxItems: number = 0

    switch (period) {
        case 'daily':
            startDate = options?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            groupFormat = '%Y-%m-%d'
            break
        case 'weekly':
            startDate = options?.startDate || new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
            groupFormat = '%Y-%W'
            break
        case 'monthly':
            startDate = options?.startDate || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            groupFormat = '%Y-%m'
            maxItems = 12
            break
    }

    const viewsData = await db
        .select({
            period: sql<string>`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${views.viewedAt} / 1000, 'unixepoch'))`,
            count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(views)
        .innerJoin(posts, sql`${views.postId} = ${posts.id}`)
        .where(and(sql`${posts.blogId} = ${blogId}`, gte(views.viewedAt, startDate), lte(views.viewedAt, endDate)))
        .groupBy(sql`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${views.viewedAt} / 1000, 'unixepoch'))`)
        .orderBy(desc(sql`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${views.viewedAt} / 1000, 'unixepoch'))`))
        .limit(maxItems || 100)
        .all()

    const likesData = await db
        .select({
            period: sql<string>`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${posts.createdAt} / 1000, 'unixepoch'))`,
            count: sql<number>`COUNT(${likes.id})`.as('count'),
        })
        .from(likes)
        .innerJoin(posts, sql`${likes.postId} = ${posts.id}`)
        .where(and(sql`${posts.blogId} = ${blogId}`, gte(posts.createdAt, startDate), lte(posts.createdAt, endDate)))
        .groupBy(sql`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${posts.createdAt} / 1000, 'unixepoch'))`)
        .orderBy(desc(sql`strftime(${sql.raw(`'${groupFormat}'`)}, datetime(${posts.createdAt} / 1000, 'unixepoch'))`))
        .limit(maxItems || 100)
        .all()

    const chartData: Record<string, { views: number; likes: number }> = {}

    viewsData.forEach((item) => {
        chartData[item.period] = {
            views: item.count,
            likes: 0,
        }
    })

    likesData.forEach((item) => {
        if (!chartData[item.period]) {
            chartData[item.period] = {
                views: 0,
                likes: 0,
            }
        }
        chartData[item.period].likes = item.count
    })

    const sortedData = Object.entries(chartData)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, maxItems || undefined)
        .reverse()
        .map(([period, data]) => ({
            period,
            ...data,
        }))

    return sortedData
}

export const getTopPostsByViews = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        startDate?: Date
        endDate?: Date
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 100)

    const conditions = [sql`${posts.blogId} = ${blogId}`]
    if (options?.startDate) {
        conditions.push(gte(views.viewedAt, options.startDate))
    }
    if (options?.endDate) {
        conditions.push(lte(views.viewedAt, options.endDate))
    }

    const topPosts = await db
        .select({
            post: posts,
            blog: blogs,
            viewCount: sql<number>`COUNT(${views.id})`.as('viewCount'),
            likeCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${likes}
                    WHERE ${likes.postId} = ${posts.id}
                ), 0)
            `.as('likeCount'),
        })
        .from(posts)
        .innerJoin(blogs, sql`${posts.blogId} = ${blogs.id}`)
        .innerJoin(views, sql`${views.postId} = ${posts.id}`)
        .where(and(...conditions))
        .groupBy(posts.id, blogs.id)
        .orderBy(desc(sql`COUNT(${views.id})`))
        .limit(limit)
        .all()

    return topPosts.map((item) => ({
        ...item.post,
        blog: item.blog,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
    }))
}

export const getTopPostsByLikes = async (
    db: DB,
    blogId: string,
    options?: {
        limit?: number
        startDate?: Date
        endDate?: Date
    },
) => {
    const limit = Math.min(Math.max(options?.limit || 10, 1), 100)

    const conditions = [sql`${posts.blogId} = ${blogId}`]
    if (options?.startDate) {
        conditions.push(gte(posts.createdAt, options.startDate))
    }
    if (options?.endDate) {
        conditions.push(lte(posts.createdAt, options.endDate))
    }

    const topPosts = await db
        .select({
            post: posts,
            blog: blogs,
            likeCount: sql<number>`COUNT(${likes.id})`.as('likeCount'),
            viewCount: sql<number>`
                COALESCE((
                    SELECT COUNT(*)
                    FROM ${views}
                    WHERE ${views.postId} = ${posts.id}
                ), 0)
            `.as('viewCount'),
        })
        .from(posts)
        .innerJoin(blogs, sql`${posts.blogId} = ${blogs.id}`)
        .innerJoin(likes, sql`${likes.postId} = ${posts.id}`)
        .where(and(...conditions))
        .groupBy(posts.id, blogs.id)
        .orderBy(desc(sql`COUNT(${likes.id})`))
        .limit(limit)
        .all()

    return topPosts.map((item) => ({
        ...item.post,
        blog: item.blog,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
    }))
}

export const getDashboardSummary = async (db: DB, blogId: string) => {
    const totalPosts = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(sql`${posts.blogId} = ${blogId}`)
        .get()

    const totalViews = await db
        .select({ count: sql<number>`COUNT(${views.id})` })
        .from(views)
        .innerJoin(posts, sql`${views.postId} = ${posts.id}`)
        .where(sql`${posts.blogId} = ${blogId}`)
        .get()

    const totalLikes = await db
        .select({ count: sql<number>`COUNT(${likes.id})` })
        .from(likes)
        .innerJoin(posts, sql`${likes.postId} = ${posts.id}`)
        .where(sql`${posts.blogId} = ${blogId}`)
        .get()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayViews = await db
        .select({ count: sql<number>`COUNT(${views.id})` })
        .from(views)
        .innerJoin(posts, sql`${views.postId} = ${posts.id}`)
        .where(and(sql`${posts.blogId} = ${blogId}`, gte(views.viewedAt, today)))
        .get()

    const todayLikes = await db
        .select({ count: sql<number>`COUNT(${likes.id})` })
        .from(likes)
        .innerJoin(posts, sql`${likes.postId} = ${posts.id}`)
        .where(and(sql`${posts.blogId} = ${blogId}`, gte(posts.createdAt, today)))
        .get()

    return {
        blogId,
        totalPosts: totalPosts?.count || 0,
        totalViews: totalViews?.count || 0,
        totalLikes: totalLikes?.count || 0,
        todayViews: todayViews?.count || 0,
        todayLikes: todayLikes?.count || 0,
    }
}
