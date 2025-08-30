import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { blogs } from './blog.schema'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  blogId: text('blog_id')
    .notNull()
    .references(() => blogs.id, { onDelete: 'cascade' }),
  postNumber: integer('post_number').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  summary: text('summary'),
  isNotice: integer('is_notice', { mode: 'boolean' })
    .notNull()
    .default(false),
  allowComment: integer('allow_comment', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const postTags = sqliteTable('post_tags', {
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
})