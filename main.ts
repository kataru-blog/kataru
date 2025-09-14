import { Hono } from 'hono'
import { getAssetFromKV } from '@cloudflare/kv-asset-handler'
import { InitializeMiddlewares } from './middlewares'
import { InitializeRoutes } from './routes'
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

type HonoEnv = { Bindings: CloudflareEnv }

const app = new Hono<HonoEnv>()

// R2 이미지 직접 제공
app.get('/r2/*', async (c) => {
    const path = c.req.path
    const key = path.substring(4) // '/r2/' 제거
    console.log('Direct R2 request:', path, 'Key:', key)
    
    const object = await c.env.R2.get(key)
    
    if (!object) {
        console.error('R2 object not found:', key)
        return c.text('Not Found', 404)
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('cache-control', 'public, max-age=31536000')
    
    return c.body(object.body, 200, Object.fromEntries(headers))
})

app.get('*', async (c, next) => {
    const url = new URL(c.req.url)

    if (
        url.pathname.startsWith('/island/') ||
        url.pathname === '/styles.css' ||
        url.pathname === '/theme.js' ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/favicon-32x32.ico' ||
        url.pathname === '/favicon-16x16.ico' ||
        url.pathname === '/apple-touch-icon.png' ||
        url.pathname === '/android-chrome-192x192.png' ||
        url.pathname === '/android-chrome-512x512.png' ||
        url.pathname.startsWith('/assets/')
    ) {
        try {
            const event = {
                request: c.req.raw,
                waitUntil: (promise: Promise<unknown>) => c.executionCtx.waitUntil(promise),
            }

            const response = await getAssetFromKV(event, {
                ASSET_NAMESPACE: c.env.__STATIC_CONTENT,
                ASSET_MANIFEST: JSON.parse(manifestJSON),
            })

            return response
        } catch (e) {
            console.error('Asset not found:', url.pathname, e)
        }
    }

    await next()
})

InitializeMiddlewares(app)
InitializeRoutes(app)

export default app
