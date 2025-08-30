/// <reference types="@cloudflare/workers-types" />

declare module '__STATIC_CONTENT_MANIFEST' {
    const value: string
    export default value
}

interface CloudflareEnv {
    DB: D1Database
    R2: R2Bucket
    NODE_ENV: string
    __STATIC_CONTENT: KVNamespace
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    BASE_URL: string
    PRODUCTION_DOMAIN: string
    DEFAULT_DOMAIN?: string
    CF_ACCOUNT_ID?: string
    CF_IMAGES_API_TOKEN?: string
    CF_IMAGES_ACCOUNT_HASH?: string
}
