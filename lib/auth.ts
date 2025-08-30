import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../entities/user.schema'

export const createAuth = (env: CloudflareEnv) => {
    const db = drizzle(env.DB, { schema })
    
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            schema
        }),
        
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
            'http://localhost:3001',
            'https://kataru.gumyoincirno.workers.dev'
        ],
        
        hooks: {
            before: createAuthMiddleware(async (ctx) => {
                if (ctx.path === '/sign-up/email') {
                    const body = ctx.body as any
                    if (body?.email && !body?.nickname) {
                        const emailPrefix = body.email.split('@')[0]
                        const randomSuffix = Math.random().toString(36).substring(2, 8)
                        body.nickname = `${emailPrefix}_${randomSuffix}`
                    }
                    return {
                        context: {
                            ...ctx,
                            body
                        }
                    }
                }
            })
        },
        
        advanced: {
            crossSubDomainCookies: {
                enabled: false
            },
            defaultCookieAttributes: {
                sameSite: 'lax',
                secure: env.NODE_ENV === 'production',
                httpOnly: true,
            }
        },
    })
}

export type Auth = ReturnType<typeof createAuth>