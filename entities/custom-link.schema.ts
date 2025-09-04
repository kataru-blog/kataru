import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { user } from './user.schema'

export const customLink = sqliteTable(
    'custom_link',
    {
        id: text('id').primaryKey(),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        url: text('url').notNull(),
        label: text('label').notNull(),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: integer('created_at', { mode: 'timestamp' })
            .notNull()
            .$defaultFn(() => new Date()),
        updatedAt: integer('updated_at', { mode: 'timestamp' })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => ({
        userIdIdx: index('custom_link_user_id_idx').on(table.userId),
        sortOrderIdx: index('custom_link_sort_order_idx').on(table.sortOrder),
    })
)