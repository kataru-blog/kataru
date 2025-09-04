export interface Blog {
    id: string
    userId: string
    title: string
    subtitle?: string
    url: string
    description?: string
    createdAt: Date
    updatedAt: Date
}

export interface Post {
    id: string
    blogId: string
    postNumber: number
    title: string
    content: string
    thumbnailUrl?: string
    summary?: string
    isNotice: boolean
    allowComment: boolean
    createdAt: Date
    updatedAt: Date
}

export interface Tag {
    id: string
    name: string
}

export interface Author {
    id: string
    name: string
    image: string
}

export interface Comment {
    id: string
    postId: string
    userId: string
    content: string
    isSecret: boolean
    parentId: string
    createdAt: Date
    updatedAt: Date
}

export interface PostWithMetadata extends Post {
    blog: Blog
    viewCount: number
    likeCount: number
    page: number
    limit: number
}

export interface PostDetail extends Post {
    blog: Blog
    viewCount: number
    likeCount: number
    tags: Tag[]
}

export interface HotPost extends Post {
    blog: Blog
    viewCount: number
    likeCount: number
}

export interface TagWithCount extends Tag {
    postCount: number
}

export interface CommentWithAuthor extends Comment {
    author: Author
}

export type GetPostsResponse = PostWithMetadata[]

export type GetPostsByBlogIdResponse = Omit<PostWithMetadata, 'blog'>[]

export type GetPostByIdResponse = PostDetail

export type GetHotArticlesResponse = HotPost[]

export type GetAllTagsResponse = Tag[]

export type GetTagsByBlogIdResponse = TagWithCount[]

export type GetCommentsByPostIdResponse = CommentWithAuthor[]