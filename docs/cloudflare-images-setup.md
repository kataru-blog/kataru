# Cloudflare Images 설정 가이드

## 1. Cloudflare Images 활성화

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에 로그인
2. 좌측 메뉴에서 **Images** 선택
3. **Enable Images** 클릭 (무료 플랜: 5000개 고유 이미지, 무제한 변환)

## 2. 필요한 정보 수집

### Account ID
- Dashboard URL에서 확인: `https://dash.cloudflare.com/{ACCOUNT_ID}/...`

### Images API Token 생성
1. [API Tokens 페이지](https://dash.cloudflare.com/profile/api-tokens) 접속
2. **Create Token** 클릭
3. **Custom token** 선택
4. 권한 설정:
   - Account > Cloudflare Images > Edit
5. Token 생성 및 복사

### Account Hash
1. Images 대시보드에서 **Delivery** 탭 클릭
2. URL 예시에서 확인: `https://imagedelivery.net/{ACCOUNT_HASH}/...`

## 3. Wrangler 시크릿 설정

```bash
# Account ID 설정
wrangler secret put CF_ACCOUNT_ID
# 프롬프트에 Account ID 입력

# API Token 설정  
wrangler secret put CF_IMAGES_API_TOKEN
# 프롬프트에 API Token 입력

# wrangler.toml 수정
# CF_IMAGES_ACCOUNT_HASH = "your-account-hash" 값 변경
```

## 4. 사용 방법

### 이미지 업로드 API
```javascript
// 이미지 파일 업로드
const formData = new FormData()
formData.append('file', imageFile)
formData.append('postId', postId)

const response = await fetch('/api/cf-images/upload', {
  method: 'POST',
  body: formData
})

const result = await response.json()
// result.data.url - 최적화된 이미지 URL
// result.data.thumbnailUrl - 썸네일 URL
// result.data.variants - 다양한 크기
```

### 게시글 작성 (자동 이미지 처리)
```javascript
// 외부 이미지를 포함한 콘텐츠
const content = `
  # 제목
  ![이미지](https://example.com/image.jpg)
  본문...
`

const response = await fetch('/api/cf-posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blogId,
    title: '게시글 제목',
    content, // 외부 이미지 자동 처리
  })
})
```

## 5. Cloudflare Images 변환 옵션

자동 생성되는 변환 URL:
- `public` - 기본 공개 버전
- `thumbnail` - 썸네일 (150x150)
- 커스텀: `?w=800&h=600&fit=cover&q=85&f=webp`

### 지원 파라미터
- `w` - 너비 (픽셀)
- `h` - 높이 (픽셀)
- `fit` - scale-down, contain, cover, crop, pad
- `q` - 품질 (1-100)
- `f` - 포맷 (auto, webp, jpeg, png)

## 6. 비용

### 무료 플랜 (추천)
- 이미지 저장: 5000개
- 이미지 변환: 무제한
- 대역폭: 무제한

### 유료 플랜 ($5/월)
- 이미지 저장: 100,000개
- 추가 이미지: $1/1000개

## 7. 장점

✅ **자동 최적화**: WebP, AVIF 자동 변환
✅ **실시간 리사이징**: URL 파라미터로 즉시 변환
✅ **글로벌 CDN**: Cloudflare 네트워크 활용
✅ **Workers 통합**: 네이티브 지원
✅ **무료 5000개**: 개인 블로그에 충분

## 8. R2 vs Cloudflare Images 비교

| 항목 | R2 | Cloudflare Images |
|-----|----|--------------------|
| 이미지 최적화 | 수동 | 자동 |
| 리사이징 | 불가 | 실시간 |
| WebP 변환 | 수동 | 자동 |
| 비용 | 저장소 비용 | 이미지당 비용 |
| 무료 | 10GB | 5000개 이미지 |
| 적합한 경우 | 대용량 파일 | 이미지 중심 서비스 |