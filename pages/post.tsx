import { PostHeader } from '@/island'
import { toHTMLWithTOC } from '@/lib/unified'
import { IslandRenderer } from '@/shared/islands/renderer'
import { UserCard } from '@/widgets'
import { Context } from 'hono'

const MOCK_MD = `
## Heading 2

### Table of Contents Test
---

## GFM Examples

- [x] Completed Task
- [ ] Pending Task
- [ ] In Progress Task
- [x] Reviewed Task
- [ ] Needs Approval
- [x] Archived Task

| Name     | Age | City      | Occupation       | Hobbies             |
|----------|-----|-----------|------------------|----------------------|
| Alice    | 25  | New York  | Developer        | Hiking, Painting    |
| Bob      | 31  | Seoul     | Designer         | Gaming, Traveling   |
| Charlie  | 29  | Tokyo     | Data Scientist   | Reading, Cycling    |
| Diana    | 27  | Berlin    | Product Manager  | Cooking, Yoga       |
| Ethan    | 34  | Sydney    | QA Engineer      | Photography, Surfing|

---

## Extended Lists Test

### Unordered List
- Fruits
  - Apple
    - Red Apple
    - Green Apple
  - Banana
  - Mango
- Vegetables
  - Carrot
  - Broccoli
  - Spinach

### Ordered List
1. Setup environment
2. Install dependencies
3. Run tests
    1. Unit tests
    2. Integration tests
4. Deploy to production

---

## Code Highlight Test

### JavaScript Example


---

## External Links Test

- [OpenAI](https://openai.com)
- [Google](https://google.com)
- [GitHub](https://github.com)
- [MDN Web Docs](https://developer.mozilla.org)
- [Python Docs](https://docs.python.org/3/)

---

## Blockquote & Nested Blockquote Test

> This is a blockquote.
> 
> > This is a nested blockquote.
> >
> > - It can also contain lists
> > - And even **Markdown formatting**
>
> Back to the outer blockquote.

---

## Images Test

### Local Image Example
![Sample Image](https://picsum.photos/200/100?random=1)

### External Image Example
![Sample Image](https://picsum.photos/200/100?random=2)

---

## Autolink Heading Check

### This heading should have an anchor

#### And this one too

##### And even smaller headings

---

## Horizontal Rule Test

---

Above the line  
---  
Below the line

---

## Task Roadmap Example

- [x] Project Planning
- [x] Requirement Gathering
- [ ] Development Phase
- [ ] Code Review
- [ ] Testing & QA
- [ ] Deployment
- [ ] Post-Deployment Monitoring

---

## Complex Table Example

| ID | Product Name | Category   | Price | Stock | Status     |
|----|-------------|------------|-------|-------|------------|
| 1  | Laptop      | Electronics| $999  | 120   | In Stock   |
| 2  | iPhone      | Mobile     | $799  | 45    | Low Stock  |
| 3  | Keyboard    | Accessories| $49   | 300   | In Stock   |
| 4  | Monitor     | Electronics| $199  | 0     | Out of Stock |
| 5  | Chair       | Furniture  | $150  | 15    | In Stock   |



END


`

export const Post = async (c: Context) => {
    const { html, toc } = await toHTMLWithTOC(MOCK_MD)
    const postInfo = {
        title: '테스트 게시글',
        tag: '테스트 태그',
        createdAt: new Date(),
        viewCount: 100,
        likeCount: 10,
    }
    return (
        <main className='flex w-full gap-2'>
            <section className='w-full border-r border-border relative'>
                <IslandRenderer className='sticky top-12 z-10' ssr={true} priority='high' name='PostHeader' props={{ ...postInfo }} />
                <article className='relative flex gap-2 justify-center mx-auto p-7'>
                    <div className='prose size-full' dangerouslySetInnerHTML={{ __html: html }} />
                </article>
                <UserCard
                    className='border-t border-border my-5'
                    blogDescription='블로그 설명'
                    user={{
                        id: '1',
                        name: '블로그 주인',
                        nickname: 'blog_owner',
                        email: 'blog_owner@example.com',
                        emailVerified: true,
                        image: 'https://picsum.photos/100/100?random=10',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        customLinks: [{ url: 'https://example.com', label: '예시 링크' }],
                    }}
                />
                <IslandRenderer ssr={false} priority='low' className='p-7' name='Comments' props={{ postId: '1' }} />
            </section>
            <IslandRenderer
                className='w-64 md:block hidden'
                ssr={false}
                priority='low'
                name='TOC'
                props={{ toc }}
                fallback={<div className='w-64 h-full animate-pulse' />}
            />
        </main>
    )
}
