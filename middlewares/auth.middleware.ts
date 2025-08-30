import { createAuth } from '../lib/auth'
import type { Context, Next } from 'hono'

export const authMiddleware = async (c: Context<{ Bindings: CloudflareEnv }>, next: Next) => {
    const auth = createAuth(c.env)
    
    try {
        const session = await auth.api.getSession({ 
            headers: c.req.raw.headers 
        })
        
        if (session) {
            c.set('user', session.user)
            c.set('session', session.session)
        } else {
            c.set('user', undefined)
            c.set('session', undefined)
        }
    } catch (error) {
        console.error('Auth middleware error:', error)
        c.set('user', undefined)
        c.set('session', undefined)
    }
    
    return await next()
}