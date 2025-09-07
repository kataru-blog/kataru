import { User, Session } from 'better-auth'
import type { blogs, user } from '../entities'
import 'hono'

declare module 'hono' {
    interface ContextVariableMap extends CloudflareVariables {
        user?: User & { nickname?: string; }
        session?: Session
        env: CloudflareEnv
        title: string
        blog?: typeof blogs.$inferSelect
        blogUser?: typeof user.$inferSelect
        blogName?: string
        customDomain?: string
        isCustomDomain?: boolean
        adjustedPath?: string
        db: DB
    }
}
