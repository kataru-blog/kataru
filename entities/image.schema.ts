import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { posts } from './post.schema'

export const images = sqliteTable('images', {
    id: text('id').primaryKey(),
    postId: text('post_id')
        .notNull()
        .references(() => posts.id, { onDelete: 'cascade' }),
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
