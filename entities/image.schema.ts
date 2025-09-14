import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { posts } from './post.schema'
import { blogs } from './blog.schema'

export const images = sqliteTable('images', {
    id: text('id').primaryKey(),
    postId: text('post_id')
        .references(() => posts.id, { onDelete: 'cascade' }),
    blogId: text('blog_id')
        .references(() => blogs.id, { onDelete: 'cascade' }),
    originalUrl: text('original_url').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    r2Key: text('r2_key').notNull(),
    width: integer('width'),
    height: integer('height'),
    size: integer('size'),
    mimeType: text('mime_type'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
})
