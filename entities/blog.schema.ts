import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { user } from './user.schema'

export const blogs = sqliteTable('blogs', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    faviconUrl: text('favicon_url'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
}, (table) => [
    index('idx_blogs_userId').on(table.userId),
])

export const customDomains = sqliteTable('custom_domains', {
    id: text('id').primaryKey(),
    blogId: text('blog_id')
        .notNull()
        .references(() => blogs.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
}, (table) => [
    index('idx_customDomains_blogId').on(table.blogId),
    index('idx_customDomains_domain').on(table.domain),
])
