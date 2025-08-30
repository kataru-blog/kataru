import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { user, blogs, posts, tags, postTags, comments, views, likes } from '../entities'
import { DB } from 'better-auth/adapters/drizzle'

export const DevRoute = () => {
    const app = new Hono()

    app.get('/dev/seed', async (c) => {
        const db = c.get('db')

        try {
            // Find or create user
            let existingUser = await db.select().from(user).where(eq(user.email, 'hs@gumyo.net')).get()

            if (!existingUser) {
                // Create test user
                const userId = crypto.randomUUID()
                await db.insert(user).values({
                    id: userId,
                    name: 'Test User',
                    email: 'hs@gumyo.net',
                    nickname: 'testuser',
                    emailVerified: false,
                    image: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                existingUser = { id: userId, email: 'hs@gumyo.net', nickname: 'testuser', name: 'Test User' }
            }

            // Create blog
            const blogId = crypto.randomUUID()
            await db.insert(blogs).values({
                id: blogId,
                userId: existingUser.id,
                title: 'Dev Test Blog',
                description: 'Development test blog for various tech posts',
                faviconUrl: 'https://via.placeholder.com/32',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Create tags
            const tagNames = ['javascript', 'typescript', 'react', 'nodejs', 'database', 'testing', 'devops', 'ai', 'web', 'mobile']
            const createdTags = []

            for (const name of tagNames) {
                const tagId = crypto.randomUUID()
                await db.insert(tags).values({
                    id: tagId,
                    name: name,
                })
                createdTags.push({ id: tagId, name })
            }

            // Create 10 posts
            const createdPosts = []

            for (let i = 0; i < 10; i++) {
                const postId = crypto.randomUUID()
                const isNotice = i === 0

                const title = `Test Post ${i + 1}: Sample Article About Technology`
                const content = `This is the content of test post ${i + 1}. 
                
                It contains multiple paragraphs to simulate real blog content.
                
                Key points:
                - Point 1: Important information
                - Point 2: Additional details
                - Point 3: Conclusion
                
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`

                await db.insert(posts).values({
                    id: postId,
                    blogId: blogId,
                    postNumber: i + 1,
                    title: title,
                    content: content,
                    thumbnailUrl: `https://picsum.photos/seed/${i}/800/400`,
                    summary: content.substring(0, 150) + '...',
                    isNotice: isNotice,
                    allowComment: true,
                    createdAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
                })

                // Add 2-4 random tags to each post
                const tagCount = Math.floor(Math.random() * 3) + 2
                const selectedTags = [...createdTags].sort(() => Math.random() - 0.5).slice(0, tagCount)

                for (const tag of selectedTags) {
                    await db.insert(postTags).values({
                        postId: postId,
                        tagId: tag.id,
                    })
                }

                // Add view count
                await db.insert(views).values({
                    id: crypto.randomUUID(),
                    postId: postId,
                    count: Math.floor(Math.random() * 500) + 10,
                })

                // Randomly add likes (50% chance)
                if (Math.random() > 0.5) {
                    await db.insert(likes).values({
                        id: crypto.randomUUID(),
                        postId: postId,
                        userId: existingUser.id,
                    })
                }

                createdPosts.push(postId)
            }

            // Create 1-10 comments for each post
            const commentTexts = [
                'Great post! Thanks for sharing.',
                'Very helpful information.',
                'I have a question about this part.',
                'This solved my problem!',
                'Looking forward to more posts.',
                'Excellent explanation.',
                'Could you elaborate more on this?',
                'Thanks for the detailed guide.',
                'This is exactly what I was looking for.',
                'Keep up the good work!',
            ]

            for (const postId of createdPosts) {
                const commentCount = Math.floor(Math.random() * 10) + 1

                for (let j = 0; j < commentCount; j++) {
                    const commentId = crypto.randomUUID()
                    const isSecret = Math.random() > 0.8

                    await db.insert(comments).values({
                        id: commentId,
                        postId: postId,
                        userId: existingUser.id,
                        content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
                        isSecret: isSecret,
                        parentId: null,
                        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
                        updatedAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
                    })

                    // 30% chance to add a reply
                    if (Math.random() > 0.7 && j > 0) {
                        await db.insert(comments).values({
                            id: crypto.randomUUID(),
                            postId: postId,
                            userId: existingUser.id,
                            content: 'Reply: ' + commentTexts[Math.floor(Math.random() * commentTexts.length)],
                            isSecret: false,
                            parentId: commentId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                    }
                }
            }

            return c.json({
                success: true,
                message: 'Seed data created successfully',
                data: {
                    blogId,
                    postCount: createdPosts.length,
                    tagCount: createdTags.length,
                    userEmail: existingUser.email,
                    userNickname: existingUser.nickname,
                    urls: {
                        blog: `/${existingUser.nickname}`,
                        firstPost: `/${existingUser.nickname}/post/1`
                    }
                },
            })
        } catch (error) {
            console.error('Seed error:', error)
            return c.json({ error: 'Failed to create seed data', details: error }, 500)
        }
    })

    app.get('/dev/remove', async (c) => {
        const db = c.get('db')

        try {
            // Find user
            const existingUser = await db.select().from(user).where(eq(user.email, 'hs@gumyo.net')).get()

            if (!existingUser) {
                return c.json({ error: 'User hs@gumyo.net not found' }, 404)
            }

            // Find blog
            const existingBlog = await db.select().from(blogs).where(eq(blogs.userId, existingUser.id)).get()

            if (!existingBlog) {
                return c.json({ message: 'No blog found for user' })
            }

            // Delete blog (cascade will handle related data)
            await db.delete(blogs).where(eq(blogs.id, existingBlog.id)).run()

            // Delete test tags
            const testTags = ['javascript', 'typescript', 'react', 'nodejs', 'database', 'testing', 'devops', 'ai', 'web', 'mobile']
            for (const tagName of testTags) {
                await db.delete(tags).where(eq(tags.name, tagName)).run()
            }

            return c.json({
                success: true,
                message: 'All test data removed successfully',
                data: {
                    blogId: existingBlog.id,
                },
            })
        } catch (error) {
            console.error('Remove error:', error)
            return c.json({ error: 'Failed to remove test data', details: error }, 500)
        }
    })

    return app
}
