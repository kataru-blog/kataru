# SFF (Service for Frontend) 패턴

## 개요
SFF 패턴은 프론트엔드를 위한 데이터 서비스 레이어로, 각 페이지마다 독립적인 서비스 파일을 구성하여 데이터 페칭 로직을 캡슐화합니다.

## 핵심 원칙

### 1. 페이지별 분리
각 페이지는 독립적인 SFF 서비스를 가집니다:
- `main.sff.ts` - 메인 페이지
- `blog.sff.ts` - 블로그 페이지
- `post.sff.ts` - 포스트 상세 페이지

### 2. 병렬 데이터 페칭
Promise.all을 사용하여 독립적인 쿼리들을 병렬로 실행합니다:

```typescript
const [hotArticles, allTags, filteredPosts, totalCount] = await Promise.all([
    getHotArticles(db, 5),
    getAllTags(db),
    getFilteredPosts(db, { tag, sortBy, offset, limit }),
    getTotalPostCount(db, tag)
])
```

### 3. 스칼라 서브쿼리 활용
LEFT JOIN 대신 스칼라 서브쿼리를 사용하여 D1의 성능을 최적화합니다:

```typescript
const posts = await db
    .select({
        id: posts.id,
        title: posts.title,
        viewCount: sql`(SELECT count FROM views WHERE post_id = ${posts.id})`.as('viewCount'),
        likeCount: sql`(SELECT COUNT(*) FROM likes WHERE post_id = ${posts.id})`.as('likeCount')
    })
    .from(posts)
```

## 파일 구조

```
sff/
├── main.sff.ts     # 메인 페이지 데이터 서비스
├── blog.sff.ts     # 블로그 페이지 데이터 서비스
└── post.sff.ts     # 포스트 페이지 데이터 서비스
```

## API 엔드포인트

각 SFF 서비스는 대응하는 API 엔드포인트를 가집니다:
- `/api/sff/main` - 메인 페이지 데이터
- `/api/sff/blog` - 블로그 데이터
- `/api/sff/post` - 포스트 데이터

## 클라이언트 통합

React Query를 사용하여 클라이언트에서 데이터를 페칭합니다:

```typescript
const { data } = useQuery({
    queryKey: ['posts', tag, sortBy],
    queryFn: () => fetch(`/api/sff/main?tag=${tag}&sortBy=${sortBy}`).then(r => r.json()),
    staleTime: 60 * 1000, // 1분
})
```