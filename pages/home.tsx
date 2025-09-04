import { IslandRenderer } from '@/shared/islands/renderer'
import { Context } from 'hono'

const mockPosts = [
    {
        id: '1',
        title: '웹 개발의 미래: 2024년 트렌드',
        summary: '최신 웹 개발 트렌드와 기술 스택에 대해 알아봅니다. React Server Components, Edge Computing 등 주목해야 할 기술들을 소개합니다.',
        thumbnailUrl: 'https://picsum.photos/400/300?random=1',
        createdAt: new Date('2024-08-28'),
        user: {
            nickname: 'tech_writer',
            image: 'https://picsum.photos/100/100?random=10',
        },
        tags: ['웹개발', 'React', 'Next.js'],
        viewCount: 1234,
        likeCount: 89,
    },
    {
        id: '2',
        title: 'TypeScript 5.0 새로운 기능 완벽 가이드',
        summary: 'TypeScript 5.0에서 추가된 새로운 기능들을 상세히 살펴보고, 실제 프로젝트에 어떻게 적용할 수 있는지 알아봅니다.',
        thumbnailUrl: 'https://picsum.photos/400/300?random=2',
        createdAt: new Date('2024-08-27'),
        user: {
            nickname: 'ts_expert',
            image: 'https://picsum.photos/100/100?random=11',
        },
        tags: ['TypeScript', '프로그래밍'],
        viewCount: 2156,
        likeCount: 156,
    },
    {
        id: '3',
        title: 'AI와 함께하는 코딩: GitHub Copilot 활용법',
        summary: 'GitHub Copilot을 효과적으로 사용하여 개발 생산성을 높이는 방법과 팁을 공유합니다.',
        thumbnailUrl: 'https://picsum.photos/400/300?random=3',
        createdAt: new Date('2024-08-26'),
        user: {
            nickname: 'ai_coder',
            image: null,
        },
        tags: ['AI', 'GitHub', '생산성'],
        viewCount: 3421,
        likeCount: 234,
    },
    {
        id: '4',
        title: '클린 코드 작성하기: 실전 팁 10가지',
        summary: '읽기 쉽고 유지보수하기 좋은 코드를 작성하는 실용적인 팁들을 소개합니다.',
        thumbnailUrl: 'https://picsum.photos/400/300?random=4',
        createdAt: new Date('2024-08-25'),
        user: {
            nickname: 'clean_dev',
            image: 'https://picsum.photos/100/100?random=12',
        },
        tags: ['클린코드', '베스트프랙티스'],
        viewCount: 1876,
        likeCount: 145,
    },
    {
        id: '5',
        title: '마이크로서비스 아키텍처 실전 경험기',
        summary: null,
        thumbnailUrl: null,
        createdAt: new Date('2024-08-24'),
        user: {
            nickname: 'arch_designer',
            image: 'https://picsum.photos/100/100?random=13',
        },
        tags: ['아키텍처', '마이크로서비스'],
        viewCount: 987,
        likeCount: 67,
    },
]

export const Home = async (c: Context) => {
    const searchParams = c.req.query()
    return (
        <main className='flex flex-col gap-3 sm:gap-5 w-full items-start justify-center pb-3 sm:pb-5'>
            <IslandRenderer className='w-full' ssr={true} name='MainpageCarousel' props={{ posts: mockPosts }} />
            <IslandRenderer
                className='w-full px-3 sm:px-5'
                ssr={true}
                priority='high'
                name='SearchCondition'
                props={{ allTags: mockPosts.flatMap((post) => post.tags), currentTag: searchParams.tag, sortBy: searchParams.sort }}
            />
            <IslandRenderer
                className='w-full px-3 sm:px-5'
                ssr={true}
                priority='high'
                name='Articles'
                props={{ posts: mockPosts, apiUrl: 'http://localhost:3000' }}
            />
        </main>
    )
}
