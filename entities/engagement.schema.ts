import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { posts } from './post.schema'
import { user } from './user.schema'

export const views = sqliteTable('views', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  count: integer('count').notNull().default(0),
})

export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})