import { Hono } from 'hono'
import { Home, Login, Blog, Post } from 'pages'

import { Layout } from 'widgets/layout'

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
    // '/:nickname/tags': {
    //     Component: null,
    //     title: 'Tags',
    // },
}

export const PagesRoute = () => {
    const app = new Hono()

    Object.entries(RouteMap).forEach(([path, { Component, title }]) => {
        app.get(path, async (c) => {
            c.set('title', title)
            const user = c.get('user')
            const blog = c.get('blog')
            const content = await Component(c)
            return c.render(
                <Layout user={user} blog={blog}>
                    {content}
                </Layout>,
            )
        })
    })

    return app
}
