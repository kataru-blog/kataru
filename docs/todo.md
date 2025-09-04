# Kataru 블로그 서비스 구현 TODO List

0. tanstack query 세팅
  - 추후 1, 2, 3에서 나오는 클라이언트 로딩 (무한스크롤 로딩)은 tanstack query를 사용하여 로딩
  - 또한 페이지별로 캐시가 가능할듯하니 꼭 세팅해야함

1. 메인페이지
- carousel을 위한 hot article
  - 기준은 현재 날짜 기준의 week (일 ~ 토)에서 가장 view의 증가가 많은 게시글 (같을 경우 like가 많은순으로)
- tag별 + newest, most view, most like 게시글
  - 페이징 조건은 per_page 100
  - @pages/home.tsx를 보면 알 수 있듯 이미 왠만한 세팅은 거의 다 해둠 실제 parameter받아서 검색조건을 설정하고 component 에도 올바른 값을 넘길 것
  - 또한 @island/common/articles.tsx에는 현재 그냥 받아온 article만 로드하게되어있는데 100개가 넘어가는 경우 맨 아래에 intersectionObserver을 걸어서 클라이언트에서 게시글을 로딩할 것 (api가 별도로 필요할 것임)

2. blog페이지
  - 블로그 메인페이지 이며 여기선 블로그 정보, 블로그와 1:1 상대인 유저 정보 등이 필요하다
    - 더 자세한 정보들은 페이지를 면밀히 살필것
  - search condition대로 블로그 별 글을 가져올 것
  - 메인페이지와 마찬가지로 페이징은 100개, 아래에 intersectionObserver을 걸어서 클라이언트에서 게시글을 로딩할 것

3. post페이지
  - 주소에서 user별 id로 post를 가져와서 정보를 넣을것
  - 블로그 정보도 필요하니 같이 가져와서 넣을 것
  - 또한 view, like도 들어가니 잘 넣을 것
  - 코멘트는 per_page 10, 10개가 넘어가는경우 맨 아래에 intersectionObserver을 걸어서 클라이언트에서 게시글을 로딩할 것

4. layout
  - 지금은 header에 'Kataru' 와 메인페이지로 무조건 이동
  - 하지만 blog.tsx, post.tsx일때는 현재 blog의 root로이동해야함 ex) usernicname 'abc' => 헤더의 로고클릭 => /abc 로이동
  - title도 blog name이들어와야함
  - hono ctx에서 잘끌고오면 됨