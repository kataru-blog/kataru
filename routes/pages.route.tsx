import { user as User } from 'entities'
import { Hono } from 'hono'
import { Blog, Home, Login, Post } from 'pages'
import { Layout } from 'widgets/layout'

const RouteMap = {
    '/': {
        Component: Home,
        title: 'Home',
        isRoot: true,
    },
    '/login': {
        Component: Login,
        title: 'Login',
        isRoot: true,
    },
    '/:nickname': {
        Component: Blog,
        title: 'Blog',
        isRoot: false,
    },
    '/:nickname/:postNumber': {
        Component: Post,
        title: 'Post',
        isRoot: false,
    },
}

export const PagesRoute = () => {
    const app = new Hono()

    Object.entries(RouteMap).forEach(([path, { Component, title, isRoot }]) => {
        app.get(path, async (c) => {
            c.set('title', title)
            const user = c.get('user')
            const blog = c.get('blog')
            const blogUser = c.get('blogUser')
            const content = await Component(c)
            return c.render(
                <Layout user={{ ...user, nickname: blogUser?.nickname || '' } as typeof User.$inferSelect} blog={blog} isRoot={isRoot}>
                    {content}
                </Layout>,
            )
        })
    })

    return app
}
