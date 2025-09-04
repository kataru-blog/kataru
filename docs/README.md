# Kataru 블로그 프로젝트 문서

## 개요
Kataru는 Cloudflare Workers와 D1 데이터베이스를 기반으로 한 고성능 블로그 플랫폼입니다.

## 기술 스택
- **런타임**: Cloudflare Workers
- **프레임워크**: Hono
- **데이터베이스**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **스타일**: Tailwind CSS
- **빌드 도구**: Bun
- **타입스크립트**: TypeScript 5.x

## 프로젝트 구조
```
kataru/
├── docs/                # 프로젝트 문서
├── entities/           # 데이터베이스 엔티티 정의
├── island/            # React Island 컴포넌트
├── middlewares/       # Hono 미들웨어
├── pages/            # 페이지 컴포넌트
├── routes/           # API 라우트
├── sff/              # Service for Frontend 레이어
├── shared/           # 공유 유틸리티
└── widgets/          # 재사용 가능한 UI 컴포넌트
```

## 주요 문서
- [SFF 패턴 가이드](./sff-pattern.md)
- [쿼리 최적화 가이드](./query-guide.md)
- [개발 가이드](./development.md)
- [테스트 가이드](./testing.md)