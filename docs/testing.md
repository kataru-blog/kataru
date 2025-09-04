# 테스트 가이드

## 테스트 데이터 생성

### 종합 테스트 데이터
전체 시스템을 테스트할 수 있는 종합적인 시드 데이터를 생성합니다.

```bash
curl http://localhost:3000/seed/comprehensive
```

생성되는 데이터:
- 5명의 테스트 사용자
- 각 사용자별 블로그
- 60개 이상의 태그
- 사용자당 3-8개의 포스트
- 조회수, 좋아요, 댓글, 답글

### 테스트 사용자
```
- johndev (john.dev@example.com) - Tech Insights 블로그
- sarahdesign (sarah.design@example.com) - Design & Code 블로그
- mikedata (mike.data@example.com) - Data Science Hub 블로그
- emilycloud (emily.cloud@example.com) - Cloud Native Journey 블로그
- alexmobile (alex.mobile@example.com) - Mobile First 블로그
```

### 테스트 데이터 삭제
```bash
curl http://localhost:3000/seed/clean
```

## 주요 테스트 시나리오

### 1. 메인 페이지 테스트
```bash
# 기본 메인 페이지
http://localhost:3000/

# 태그 필터링
http://localhost:3000/?tag=react

# 정렬 옵션
http://localhost:3000/?sortBy=mostView
http://localhost:3000/?sortBy=mostLike
```

### 2. 블로그 페이지 테스트
```bash
# 개별 블로그 페이지
http://localhost:3000/johndev
http://localhost:3000/sarahdesign

# 블로그 내 태그 필터
http://localhost:3000/johndev?tag=javascript

# 블로그 내 정렬
http://localhost:3000/johndev?sortBy=oldest
```

### 3. 포스트 상세 페이지
```bash
# 포스트 보기
http://localhost:3000/johndev/1
http://localhost:3000/sarahdesign/2

# 포스트 기능 테스트
- 조회수 증가 확인
- 댓글 작성
- 답글 작성
- 좋아요 기능
```

### 4. API 엔드포인트 테스트

#### SFF API
```bash
# 메인 페이지 데이터
curl http://localhost:3000/api/sff/main

# 필터링된 데이터
curl "http://localhost:3000/api/sff/main?tag=react&sortBy=mostView&page=1&limit=10"

# 블로그 데이터
curl "http://localhost:3000/api/sff/blog?blogId=BLOG_ID"

# 포스트 데이터
curl "http://localhost:3000/api/sff/post/BLOG_ID/1"
```

#### 댓글 API
```bash
# 댓글 목록
curl "http://localhost:3000/api/sff/post/POST_ID/comments?page=1&limit=10"

# 답글 목록
curl "http://localhost:3000/api/sff/comment/COMMENT_ID/replies?page=1&limit=5"
```

## 성능 테스트

### 쿼리 성능 모니터링
콘솔에서 쿼리 실행 시간을 확인할 수 있습니다:
```
Query executed in 12ms
```

### 병렬 쿼리 확인
Promise.all을 사용한 병렬 쿼리가 제대로 동작하는지 확인:
- 네트워크 탭에서 동시 요청 확인
- 총 로딩 시간이 개별 쿼리 합보다 짧은지 확인

### React Query 캐싱
- 페이지 이동 후 재방문 시 캐시 적용 확인
- staleTime (1분) 동안 추가 요청 없음 확인

## 타입 체크

```bash
# TypeScript 타입 체크
tsc --noEmit

# 특정 파일만 체크
tsc --noEmit routes/seed.route.tsx
```

## 디버깅

### Wrangler 로그
```bash
# 자세한 로그 출력
wrangler dev --log-level debug
```

### D1 쿼리 로그
```typescript
// 쿼리 로그 추가
console.log('Query:', query.toSQL())
```

## 체크리스트

### 기능 테스트
- [ ] 메인 페이지 로딩
- [ ] 인기 포스트 캐러셀 동작
- [ ] 태그 필터링
- [ ] 정렬 옵션 (최신순, 조회순, 좋아요순)
- [ ] 무한 스크롤
- [ ] 블로그 페이지 접근
- [ ] 포스트 상세 보기
- [ ] 댓글/답글 로딩
- [ ] 조회수 증가

### 성능 테스트
- [ ] 초기 로딩 시간 < 2초
- [ ] 병렬 쿼리 동작
- [ ] React Query 캐싱
- [ ] 이미지 최적화

### 엣지 케이스
- [ ] 빈 데이터 처리
- [ ] 404 페이지
- [ ] 에러 처리
- [ ] 로딩 상태