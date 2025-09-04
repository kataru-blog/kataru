import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import renderer from 'routes/_renderer'
import { Layout } from 'widgets/layout'
import { Blog } from './pages/blog'
import { Home } from './pages/home'
import { Login } from './pages/login'
import { Post } from './pages/post'

type HonoEnv = { Bindings: CloudflareEnv }

const app = new Hono<HonoEnv>()

app.use(renderer)
app.use('/favicon.ico', serveStatic({ root: './assets' }))
app.use('/theme.js', serveStatic({ root: './assets' }))
app.use('/island/*', serveStatic({ root: './assets' }))
app.use('/styles.css', serveStatic({ root: './assets' }))
app.use('/assets/*', serveStatic({ root: './assets' }))

const RouteMap = {
    '/': {
        Component: Home,
        title: 'Home',
    },
    '/login': {
        Component: Login,
        title: 'Login',
    },
    '/:nickname': {
        Component: Blog,
        title: 'Blog',
    },
    '/:nickname/:postNumber': {
        Component: Post,
        title: 'Post',
    },
}

Object.entries(RouteMap).forEach(([path, { Component, title }]) => {
    app.get(path, async (c) => {
        c.set('title', title)
        const content = await Component(c)
        return c.render(<Layout>{content}</Layout>)
    })
})

export default {
    port: 30005,
    fetch: app.fetch,
}
