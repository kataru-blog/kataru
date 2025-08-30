# Kataru

## 기술 스택

### 프레임워크 & 런타임
- **Hono** - 경량 웹 프레임워크
- **Cloudflare Workers** - 엣지 컴퓨팅 플랫폼
- **Bun** - JavaScript 런타임 및 패키지 매니저
- **TypeScript** - 타입 안전성을 위한 언어

### 프론트엔드
- **React 19** - UI 라이브러리
- **Tailwind CSS v4** - 유틸리티 기반 CSS 프레임워크
- **@hono/react-renderer** - Hono와 React 통합
- **Island Architecture** - 부분 하이드레이션 아키텍처

### UI 컴포넌트
- **Radix UI** - 접근성 높은 헤드리스 UI 컴포넌트
  - @radix-ui/react-avatar
  - @radix-ui/react-scroll-area
  - @radix-ui/react-select
  - @radix-ui/react-separator
  - @radix-ui/react-slot
- **Lucide React** - 아이콘 라이브러리
- **Embla Carousel** - 캐러셀 컴포넌트
- **Class Variance Authority (CVA)** - 변형 관리
- **clsx & tailwind-merge** - 클래스 유틸리티

### 데이터베이스 & ORM
- **Cloudflare D1** - SQLite 기반 서버리스 데이터베이스
- **Drizzle ORM** - TypeScript ORM
- **Drizzle Kit** - 데이터베이스 마이그레이션 도구

### 스토리지
- **Cloudflare R2** - 객체 스토리지 서비스
- **Cloudflare KV** - 키-값 저장소 (정적 애셋용)

### 인증
- **Better Auth** - 인증 라이브러리

### 콘텐츠 처리
- **Unified** - 콘텐츠 프로세싱 생태계
  - **remark** - 마크다운 파싱
  - **rehype** - HTML 처리
  - **remark-gfm** - GitHub Flavored Markdown
  - **rehype-highlight** - 코드 하이라이팅
  - **rehype-slug** - 헤딩 ID 생성
  - **rehype-autolink-headings** - 헤딩 자동 링크
  - **rehype-external-links** - 외부 링크 처리
  - **rehype-sanitize** - HTML 소독

### 유틸리티
- **Zod** - 스키마 검증 라이브러리

### 개발 도구
- **Wrangler** - Cloudflare Workers 개발 도구
- **shadcn** - UI 컴포넌트 시스템
- **feconfig-bhs** - 설정 관리  