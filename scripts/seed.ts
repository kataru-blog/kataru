#!/usr/bin/env bun
import { drizzle } from 'drizzle-orm/d1'
import { createAuth } from '../lib/auth'
import * as schema from '../entities'

const seed = async () => {
    console.log('🌱 시드 데이터 생성 시작...')
    
    try {
        const env = {
            DB: {} as D1Database,
            NODE_ENV: 'development',
            BASE_URL: 'https://kataru.dev',
        } as CloudflareEnv
        
        const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/22272691-bf6b-4057-b6fe-3ec4dbf2c58e.sqlite'
        const { Database } = await import('bun:sqlite')
        const bunDb = new Database(dbPath)
        
        const d1Mock = {
            prepare: (query: string) => ({
                bind: (...params: Parameters<ReturnType<typeof bunDb.query>['all']>) => ({
                    first: async () => bunDb.query(query).get(...params),
                    all: async () => ({ results: bunDb.query(query).all(...params) }),
                    run: async () => bunDb.query(query).run(...params),
                }),
                first: async () => bunDb.query(query).get(),
                all: async () => ({ results: bunDb.query(query).all() }),
                run: async () => bunDb.query(query).run(),
            }),
            batch: async (statements: { run: () => Promise<unknown> }[]) => {
                const results = []
                for (const stmt of statements) {
                    results.push(await stmt.run())
                }
                return results
            },
            exec: async (query: string) => bunDb.exec(query),
        } as unknown as D1Database
        
        env.DB = d1Mock
        const db = drizzle(env.DB, { schema })
        
        console.log('👤 테스트 사용자 생성 중...')
        const userId = crypto.randomUUID()
        await db.insert(schema.user).values({
            id: userId,
            name: 'Test User',
            nickname: 'testuser',
            email: 'test@kataru.dev',
            emailVerified: false,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        
        console.log('📝 테스트 블로그 생성 중...')
        const blogId = crypto.randomUUID()
        await db.insert(schema.blogs).values({
            id: blogId,
            userId: userId,
            title: 'testblog',
            description: 'Kataru 테스트 블로그입니다',
            faviconUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        
        console.log('🌐 커스텀 도메인 추가 중...')
        await db.insert(schema.customDomains).values({
            id: crypto.randomUUID(),
            blogId: blogId,
            domain: 'test.kataru.dev',
            createdAt: new Date(),
        })
        
        console.log('🏷️ 태그 생성 중...')
        const tagIds = []
        const tagNames = ['JavaScript', 'TypeScript', 'React', 'Cloudflare', 'Web Development']
        for (const tagName of tagNames) {
            const tagId = crypto.randomUUID()
            tagIds.push(tagId)
            await db.insert(schema.tags).values({
                id: tagId,
                name: tagName,
            })
        }
        
        console.log('📄 샘플 게시글 생성 중...')
        let postNumber = 1
        const posts = [
            {
                title: 'Kataru 블로그 플랫폼 소개',
                content: `# Kataru 블로그 플랫폼에 오신 것을 환영합니다!

![배너 이미지](https://picsum.photos/1200/400)

Kataru는 개발자를 위한 현대적인 블로그 플랫폼입니다.

## 주요 기능
- 🎨 커스텀 도메인 지원
- 📝 마크다운 기반 글쓰기
- 🏷️ 태그 시스템
- 💬 댓글 기능
- ❤️ 추천 시스템

## 기술 스택
- Cloudflare Workers & D1
- Hono Framework
- React 19
- Drizzle ORM
- Better Auth`,
                isNotice: true,
                tagIds: [tagIds[3], tagIds[4]]
            },
            {
                title: 'TypeScript로 타입 안전한 코드 작성하기',
                content: `# TypeScript 베스트 프랙티스

![TypeScript Logo](https://picsum.photos/800/300)

TypeScript를 활용한 타입 안전한 코드 작성 방법을 알아봅시다.

## 1. 명시적 타입 선언
\`\`\`typescript
const add = (a: number, b: number): number => {
    return a + b
}
\`\`\`

## 2. 인터페이스 활용
\`\`\`typescript
interface User {
    id: string
    name: string
    email: string
}
\`\`\`

## 3. 제네릭 활용
\`\`\`typescript
const identity = <T>(arg: T): T => {
    return arg
}
\`\`\``,
                isNotice: false,
                tagIds: [tagIds[0], tagIds[1]]
            },
            {
                title: 'React 19의 새로운 기능들',
                content: `# React 19 업데이트

![React 19](https://picsum.photos/800/350)

React 19에서 추가된 주요 기능들을 살펴봅시다.

## Server Components
- 서버에서 렌더링되는 컴포넌트
- 번들 크기 감소
- 향상된 성능

## use() Hook
- Promise를 직접 처리
- 더 간단한 비동기 로직

## Actions
- 폼 처리 개선
- 서버 액션 지원`,
                isNotice: false,
                tagIds: [tagIds[2]]
            }
        ]
        
        for (const post of posts) {
            const postId = crypto.randomUUID()
            await db.insert(schema.posts).values({
                id: postId,
                blogId: blogId,
                postNumber: postNumber++,
                title: post.title,
                content: post.content,
                thumbnailUrl: `https://picsum.photos/seed/${postNumber}/800/400`,
                summary: post.content.substring(0, 150) + '...',
                isNotice: post.isNotice,
                allowComment: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            
            for (const tagId of post.tagIds) {
                await db.insert(schema.postTags).values({
                    postId: postId,
                    tagId: tagId,
                })
            }
            
            await db.insert(schema.views).values({
                id: crypto.randomUUID(),
                postId: postId,
                count: Math.floor(Math.random() * 100),
            })
        }
        
        console.log('✨ 시드 데이터 생성 완료!')
        console.log('📌 테스트 계정:')
        console.log('   Email: test@kataru.dev')
        console.log('   Blog URL: http://localhost:3000/test@kataru.dev')
        console.log('   게시글 예시: http://localhost:3000/test@kataru.dev/post/1')
        console.log('')
        console.log('💡 이미지 처리:')
        console.log('   - 외부 이미지는 Cloudflare Images로 자동 변환')
        console.log('   - WebP/AVIF 자동 최적화')
        console.log('   - 실시간 리사이징 지원')
        
    } catch (error) {
        console.error('❌ 시드 데이터 생성 실패:', error)
        process.exit(1)
    }
}

seed()