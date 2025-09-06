import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { posts } from './post.schema'
import { user } from './user.schema'

export const views = sqliteTable(
    'views',
    {
        id: text('id').primaryKey(),
        postId: text('post_id')
            .notNull()
            .references(() => posts.id, { onDelete: 'cascade' }),
        userId: text('user_id'),
        viewedAt: integer('viewed_at', { mode: 'timestamp' })
            .notNull()
            .$defaultFn(() => new Date()),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
    },
    (table) => [
        index('idx_views_postId').on(table.postId),
        index('idx_views_postId_viewedAt').on(table.postId, table.viewedAt),
        index('idx_views_userId').on(table.userId),
    ],
)

export const likes = sqliteTable(
    'likes',
    {
        id: text('id').primaryKey(),
        postId: text('post_id')
            .notNull()
            .references(() => posts.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
    },
    (table) => [
        index('idx_likes_postId').on(table.postId),
        index('idx_likes_userId').on(table.userId),
        index('idx_likes_userId_id').on(table.userId, table.id),
    ],
)
