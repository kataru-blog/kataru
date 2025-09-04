# 개발 가이드

## 시작하기

### 필수 요구사항
- Bun 1.0 이상
- Node.js 18+ (선택사항)
- Cloudflare 계정

### 설치
```bash
bun install
```

### 개발 서버 실행
```bash
bun dev
```

이 명령어는 다음을 실행합니다:
- Wrangler dev server (포트 3000)
- Island 컴포넌트 빌드 (watch 모드)
- Tailwind CSS 컴파일 (watch 모드)

### 빌드
```bash
bun run build
```

## 프로젝트 구조

### Island Architecture
React 컴포넌트를 선택적으로 하이드레이션하는 Island Architecture를 사용합니다.

```typescript
// SSR Island
<IslandRenderer 
    ssr={true} 
    name="MainpageCarousel" 
    props={{ posts: hotArticles }} 
/>

```

### SFF 서비스
각 페이지는 독립적인 SFF 서비스를 가집니다:

```typescript
// sff/main.sff.ts
export const getMainPageData = async (db, params) => {
    // 병렬 데이터 페칭
    const [hotArticles, tags, posts] = await Promise.all([...])
    return { hotArticles, tags, posts }
}
```

### 라우팅
Hono 프레임워크 기반 라우팅:

```typescript
// routes/pages.route.tsx
app.get('/', async (c) => {
    const data = await getMainPageData(db, params)
    return c.render(<Home {...data} />)
})
```

## 데이터베이스

### 마이그레이션
```bash
bun run db:generate  # 마이그레이션 생성
bun run db:migrate   # 마이그레이션 실행
```

### 시드 데이터
```bash
# 테스트 데이터 생성
curl http://localhost:3000/seed/comprehensive

# 테스트 데이터 삭제
curl http://localhost:3000/seed/clean
```

## 환경 변수

`.dev.vars` 파일에 다음 환경 변수를 설정:

```env
PRODUCTION_DOMAIN=kataru.dev
BASE_URL=https://kataru.dev
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 스타일링

Tailwind CSS v4를 사용합니다:

```css
/* assets/styles-raw.css */
@import "tailwindcss";
```

빌드 시 자동으로 컴파일됩니다.

## 타입 체크

```bash
tsc --noEmit
```

## 배포

### Cloudflare Workers 배포
```bash
bun run deploy
```

### D1 데이터베이스 설정
```bash
wrangler d1 create kataru
wrangler d1 migrations apply kataru
```