import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { blogs } from '../entities/blog.schema'
import * as schema from '../entities/user.schema'

export const createAuth = (env: CloudflareEnv) => {
    const db = drizzle(env.DB, { schema })

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            schema,
        }),

        user: {
            additionalFields: {
                nickname: {
                    type: 'string',
                    required: false,
                    fieldName: 'nickname',
                    returned: true,
                    defaultValue: () => `user_${crypto.randomUUID().substring(0, 8)}`,
                },
            },
        },

        baseURL: env.BASE_URL,

        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        },

        socialProviders: {
            github: {
                clientId: env.GITHUB_CLIENT_ID || '',
                clientSecret: env.GITHUB_CLIENT_SECRET || '',
            },
            google: {
                clientId: env.GOOGLE_CLIENT_ID || '',
                clientSecret: env.GOOGLE_CLIENT_SECRET || '',
            },
        },

        trustedOrigins: [
            'http://localhost:3000',
            'http://localhost:10101',
            'https://kataru.gumyoincirno.workers.dev',
            'https://kataru.dev',
            'http://kataru.dev',
        ],

        hooks: {
            after: createAuthMiddleware(async (ctx) => {
                const context = ctx.context.newSession?.user.id ? ctx.context.newSession : ctx.context.session

                if (!context?.user?.nickname && context?.user?.id) {
                    await db
                        .update(schema.user)
                        .set({ nickname: context.user.email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8) })
                        .where(eq(schema.user.id, context.user.id))
                }

                if (context?.user?.id) {
                    const userId = context.user.id
                    const existingBlog = await db.select().from(blogs).where(eq(blogs.userId, userId)).get()

                    if (!existingBlog) {
                        const blogId = crypto.randomUUID()
                        await db.insert(blogs).values({
                            id: blogId,
                            userId: userId,
                            title: `${context.user.nickname || context.user.name}'s Blog`,
                            description: `Welcome to my blog!`,
                        })
                    }
                }

                // OAuth 성공 후 프론트엔드로 리다이렉트
                if (ctx.request && ctx.context.newSession?.user.id) {
                    const url = new URL(ctx.request.url)
                    const callbackURL = url.searchParams.get('callbackURL')

                    if (callbackURL && callbackURL.includes('localhost:10101')) {
                        throw ctx.redirect(`http://localhost:10101/auth/callback?success=true`)
                    }
                }
            }),
        },

        advanced: {
            crossSubDomainCookies: {
                enabled: false,
            },
            defaultCookieAttributes: {
                sameSite: 'lax',
                secure: env.NODE_ENV === 'production',
                httpOnly: true,
            },
        },
    })
}

export type Auth = ReturnType<typeof createAuth>
