# SFF (Service for Frontend) PRD

## 개요
프론트엔드에서 필요한 데이터를 효율적으로 제공하기 위한 서비스 레이어 정의

## 페이지별 데이터 요구사항

### 1. 메인페이지 (Main Page)
```
목적: 전체 블로그 플랫폼의 최신 게시글 표시
데이터:
- 게시글 목록 (100개 단위 페이징)
  - title: 게시글 제목
  - thumbnail_url: 썸네일 이미지 URL
  - summary: 게시글 요약 (최대 200자)
  - created_at: 작성일시
  - likes_count: 좋아요 수
  - blog_title: 블로그 이름
  - blog_id: 블로그 ID
정렬: created_at DESC (최신순)
```

### 2. 레이아웃 (Layout)
```
목적: 블로그 전체 레이아웃에 필요한 기본 정보
데이터:
- 블로그 정보
  - title: 블로그 제목
  - description: 블로그 설명
  - favicon_url: 파비콘 URL
  - user_name: 블로그 소유자 이름
  - user_image: 블로그 소유자 프로필 이미지
- 인기 태그 목록 (상위 10개)
  - tag_name: 태그 이름
  - post_count: 해당 태그 게시글 수
```

### 3. 게시글 상세 (Post Detail)
```
목적: 개별 게시글 상세 정보 표시
데이터:
- 게시글 정보
  - title: 제목
  - content: 본문 내용
  - thumbnail_url: 썸네일 이미지
  - summary: 요약
  - created_at: 작성일시
  - updated_at: 수정일시
  - is_notice: 공지 여부
  - allow_comment: 댓글 허용 여부
- 참여 정보
  - view_count: 조회수
  - like_count: 좋아요 수
  - comment_count: 댓글 수
  - is_liked: 현재 사용자 좋아요 여부
- 태그 목록
  - tag_id: 태그 ID
  - tag_name: 태그 이름
- 블로그 정보
  - blog_title: 블로그 제목
  - blog_id: 블로그 ID
```

### 4. 게시글 목록 (Post List)
```
목적: 블로그 내 게시글 목록 표시
파라미터:
- blog_id: 블로그 ID (필수)
- tag_id: 태그 ID (선택)
- sort: 정렬 방식 (latest/oldest)
- page: 페이지 번호
- limit: 페이지당 항목 수 (기본 10)
데이터:
- 게시글 목록
  - title: 제목
  - thumbnail_url: 썸네일 URL
  - summary: 요약
  - created_at: 작성일시
  - likes_count: 좋아요 수
  - view_count: 조회수
  - comment_count: 댓글 수
  - is_notice: 공지 여부
  - tags: 태그 목록
```

### 5. 태그 목록 (Tag List)
```
목적: 태그 정보 제공
유형:
A. 블로그 기준 태그 목록
  - blog_id: 블로그 ID
  - 태그 목록
    - tag_id: 태그 ID
    - tag_name: 태그 이름
    - post_count: 게시글 수
    - last_used: 마지막 사용일

B. 게시글 기준 태그 목록
  - post_id: 게시글 ID
  - 태그 목록
    - tag_id: 태그 ID
    - tag_name: 태그 이름
```

### 6. 댓글 목록 (Comments)
```
목적: 게시글의 댓글 표시
파라미터:
- post_id: 게시글 ID
- page: 페이지 번호
- limit: 페이지당 항목 수 (기본 50)
데이터:
- 댓글 목록
  - comment_id: 댓글 ID
  - content: 댓글 내용
  - is_secret: 비밀 댓글 여부
  - parent_id: 부모 댓글 ID
  - created_at: 작성일시
  - author:
    - user_id: 사용자 ID
    - user_name: 사용자 이름
    - user_image: 프로필 이미지
  - replies_count: 대댓글 수
```

## 성능 고려사항

### 캐싱 전략
- 블로그 정보: 5분 캐싱
- 태그 목록: 10분 캐싱
- 게시글 목록: 1분 캐싱
- 댓글: 실시간 (캐싱 없음)

### 쿼리 최적화
- N+1 문제 방지를 위한 배치 조회
- 필요한 필드만 선택적 조회
- 인덱스 활용 최대화

### 페이지네이션
- Offset 기반 페이징 (일반 목록)
- Cursor 기반 페이징 (실시간 업데이트가 필요한 경우)

## API 응답 형식
```typescript
interface SFFResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}
```