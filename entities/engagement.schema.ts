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
        count: integer('count').notNull().default(0),
    },
    (table) => [index('idx_views_postId').on(table.postId), index('idx_views_postId_count').on(table.postId, table.count)],
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
