
# Cloudflare D1 + Workers + Drizzle ORM 성능 최적화 가이드

이 문서는 **Cloudflare D1(SQLite 기반)** 환경에서 **Drizzle ORM**을 사용하는 프로젝트를 위한 최적화 가이드입니다.  
LLM이 기존 Drizzle 쿼리를 분석하고 **자동으로 최적화**할 때 준수해야 할 원칙과 패턴을 정리했습니다.

---

## 0) 환경 개요

- **실행 환경**: Cloudflare Workers  
- **DB**: Cloudflare D1 (SQLite 기반)  
- **ORM**: Drizzle ORM  
- **개발 환경**: Bun (실행 속도는 개발용, 최적화 대상 아님)  

---

## 1) 성능 최적화 핵심 원칙

| 원칙 | 설명 | LLM 행동 지침 |
|------|------|----------------|
| **JOIN 최소화** | D1은 네트워크 RTT 비용이 크므로 조인을 최소화 | LEFT JOIN → 스칼라 서브쿼리 또는 파생 집계 테이블로 전환 |
| **인덱스 활용** | SQLite/D1은 인덱스 효율성이 성능에 절대적 | Drizzle `sql` 또는 마이그레이션으로 인덱스 생성 여부 확인 |
| **Batch/Prepared 사용** | Workers ↔ D1 네트워크 왕복 최소화 | `db.batch()` / `db.prepare()` 적극 활용 |
| **쿼리 단순화** | 한 SQL 문장 안에서 CTE·서브쿼리로 최적화 | N+1 쿼리 → 한 방 처리 또는 IN 쿼리로 병합 |
| **키셋 페이지네이션** | OFFSET → 커서 기반 | Drizzle에서 `lt(likes.id, lastId)` 패턴 사용 |

---

## 2) 인덱스 설계

```sql
-- 좋아요 테이블: 유저별 최근 조회 최적화
CREATE INDEX IF NOT EXISTS idx_likes_userId_id_desc
ON likes(userId, id DESC);

-- 뷰 테이블: postId 기반 집계 최적화
CREATE INDEX IF NOT EXISTS idx_views_postId
ON views(postId);
```

> **LLM 주의**: 인덱스가 없을 경우 쿼리 최적화 효과가 반감되므로, 쿼리 리팩토링 시 반드시 인덱스 존재 여부를 확인할 것.

---

## 3) Drizzle ORM 최적화 패턴

### 3.1 스칼라 서브쿼리 (권장)

**Before (비효율적 LEFT JOIN):**
```ts
const likedPosts = await db
  .select({
    post: posts,
    blog: blogs,
    viewCount: views.count,
  })
  .from(likes)
  .innerJoin(posts, eq(likes.postId, posts.id))
  .innerJoin(blogs, eq(posts.blogId, blogs.id))
  .leftJoin(views, eq(views.postId, posts.id)) // ❌ JOIN 비용↑
  .where(eq(likes.userId, userId))
  .orderBy(desc(likes.id))
  .limit(limit)
  .offset(offset)
  .all();
```

**After (스칼라 서브쿼리로 최적화):**
```ts
const likedPosts = await db
  .select({
    post: posts,
    blog: blogs,
    viewCount: sql`
      COALESCE((
        SELECT COUNT(*)
        FROM ${views}
        WHERE ${views.postId} = ${posts.id}
      ), 0)
    `.as('viewCount'),
  })
  .from(likes)
  .innerJoin(posts, eq(likes.postId, posts.id))
  .innerJoin(blogs, eq(posts.blogId, blogs.id))
  .where(eq(likes.userId, userId))
  .orderBy(desc(likes.id))
  .limit(limit)
  .offset(offset)
  .all();
```

**효과**
- `views` 테이블을 전체 조인하지 않아 성능 향상.
- SQLite 옵티마이저가 postId 인덱스를 활용.

---

### 3.2 파생 집계 테이블 + JOIN (대규모 데이터)

```ts
const likedPosts = await db
  .select({
    post: posts,
    blog: blogs,
    viewCount: sql<number>`COALESCE(vc.c, 0)`,
  })
  .from(likes)
  .innerJoin(posts, eq(likes.postId, posts.id))
  .innerJoin(blogs, eq(posts.blogId, blogs.id))
  .leftJoin(
    sql`
      (SELECT ${views.postId} as postId, COUNT(*) as c
       FROM ${views}
       GROUP BY ${views.postId}) vc
    `,
    eq(sql`vc.postId`, posts.id)
  )
  .where(eq(likes.userId, userId))
  .orderBy(desc(likes.id))
  .limit(limit)
  .offset(offset)
  .all();
```

**효과**
- `views` 전체 조인 대신, 집계용 파생 테이블과 조인.
- 대규모 데이터에서 서브쿼리보다 유리.

---

### 3.3 2-쿼리 배치(IN) 방식

```ts
// Q1. 좋아요한 포스트 목록
const liked = await db
  .select({ post: posts, blog: blogs })
  .from(likes)
  .innerJoin(posts, eq(likes.postId, posts.id))
  .innerJoin(blogs, eq(posts.blogId, blogs.id))
  .where(eq(likes.userId, userId))
  .orderBy(desc(likes.id))
  .limit(limit)
  .offset(offset);

const postIds = liked.map(r => r.post.id);
if (postIds.length === 0) return [];

// Q2. views에서 필요한 postId만 카운트
const counts = await db
  .select({ postId: views.postId, c: sql<number>`COUNT(*)` })
  .from(views)
  .where(inArray(views.postId, postIds))
  .groupBy(views.postId);

const countMap = new Map(counts.map(c => [c.postId, c.c]));

// 매핑 후 반환
return liked.map(r => ({
  ...r.post,
  blog: r.blog,
  viewCount: countMap.get(r.post.id) ?? 0,
}));
```

> **LLM 행동 지침**  
> - 이 방식은 D1 `db.batch()` 또는 Workers 바인딩에서 최적화 가능.  
> - IN 쿼리 사용 시 반드시 `postId`에 인덱스가 있어야 함.

---

## 4) 페이지네이션 최적화

**Before (OFFSET 방식 — 비효율적)**
```ts
.orderBy(desc(likes.id))
.limit(limit)
.offset(offset)
```

**After (키셋 페이지네이션 — 권장)**
```ts
.where(and(
  eq(likes.userId, userId),
  lt(likes.id, lastSeenId) // 커서 기반
))
.orderBy(desc(likes.id))
.limit(limit);
```

---

## 5) Cloudflare D1에서의 성능 팁

### 5.1 Prepared Statements (권장)
```ts
const stmt = db.prepare(sql`
  SELECT COUNT(*) FROM ${views} WHERE ${views.postId} = ?
`);
const result = await stmt.bind(postId).first();
```

- SQL 파싱 & 실행 계획 재사용 → 성능 향상.

### 5.2 Batch Execution
```ts
const results = await db.batch([
  db.prepare(sql`SELECT COUNT(*) FROM ${likes} WHERE ${likes.userId}=?`).bind(userId),
  db.prepare(sql`SELECT COUNT(*) FROM ${views} WHERE ${views.postId}=?`).bind(postId),
]);
```

- 여러 쿼리를 한 번에 전송해 **RTT 최소화**.

### 5.3 EXPLAIN QUERY PLAN
```sql
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM views WHERE postId = ?;
```
- 인덱스 사용 여부를 반드시 확인.

---

## 6) 전략 비교표

| 전략               | 왕복 횟수 | 성능 | 난이도 | 권장도 |
|------------------|---------|------|--------|--------|
| LEFT JOIN + COUNT | 1 | 느림 | 쉬움 | ❌ |
| 스칼라 서브쿼리   | 1 | 빠름 | 쉬움 | ✅ |
| 집계 테이블 + JOIN | 1 | 대규모 데이터 유리 | 중간 | ✅ |
| 2-쿼리 배치(IN) | 1(배치)~2 | 빠름 | 중간 | ✅ |
| 카운터 캐시     | 1 | 최상 | 어려움 | ⚡️ |

---

## 7) LLM 최적화 가이드라인

- Drizzle 코드에서 **LEFT JOIN** 대신 **스칼라 서브쿼리** 또는 **집계 테이블 JOIN**을 우선 제안.
- 필요 시 **2-쿼리 배치** 또는 **db.batch()**를 활용해 네트워크 왕복 최소화.
- `views.postId`, `likes.userId,id` 인덱스 필수 확인.
- 대규모 데이터일수록 **키셋 페이지네이션** 사용.
- 쿼리 리팩토링 후 `EXPLAIN QUERY PLAN`으로 인덱스 적용 여부 검증.

---

## 8) 요약 체크리스트

- [ ] `views(postId)` 인덱스 생성 여부 확인
- [ ] `likes(userId, id DESC)` 인덱스 확인
- [ ] 스칼라 서브쿼리 우선 적용
- [ ] OFFSET → 키셋 페이지네이션 전환
- [ ] Prepared + Batch 활용으로 RTT 최적화
- [ ] `EXPLAIN QUERY PLAN`으로 플랜 검증
