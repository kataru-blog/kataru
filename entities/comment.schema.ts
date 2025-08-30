import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { posts } from './post.schema'
import { user } from './user.schema'

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isSecret: integer('is_secret', { mode: 'boolean' })
    .notNull()
    .default(false),
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})