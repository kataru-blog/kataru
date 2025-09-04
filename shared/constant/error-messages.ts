export const ERROR_MESSAGES = {
    BLOG: {
        ALREADY_EXISTS: {
            status: 409,
            message: 'User already has a blog',
        },
        TITLE_EXISTS: {
            status: 409,
            message: 'Blog title already exists',
        },
        NOT_FOUND: {
            status: 404,
            message: 'Blog not found',
        },
        UNAUTHORIZED: {
            status: 403,
            message: 'Unauthorized to access this blog',
        },
    },
    DOMAIN: {
        INVALID_FORMAT: {
            status: 400,
            message: 'Invalid domain format',
        },
        ALREADY_IN_USE: {
            status: 409,
            message: 'Domain already in use',
        },
        NOT_FOUND: {
            status: 404,
            message: 'Domain not found',
        },
        UNAUTHORIZED: {
            status: 403,
            message: 'Unauthorized to manage this domain',
        },
    },
    POST: {
        NOT_FOUND: {
            status: 404,
            message: 'Post not found',
        },
        UNAUTHORIZED: {
            status: 403,
            message: 'Unauthorized to access this post',
        },
        TITLE_REQUIRED: {
            status: 400,
            message: 'Post title is required',
        },
        CONTENT_REQUIRED: {
            status: 400,
            message: 'Post content is required',
        },
        INVALID_TAG: {
            status: 400,
            message: 'Invalid tag ID provided',
        },
        INVALID_BLOG: {
            status: 400,
            message: 'Invalid blog ID provided',
        },
        INVALID_LIMIT: {
            status: 400,
            message: 'Limit must be between 1 and 100',
        },
        INVALID_OFFSET: {
            status: 400,
            message: 'Offset must be a positive number',
        },
        INVALID_ORDER_BY: {
            status: 400,
            message: 'Invalid orderBy option',
        },
    },
    TAG: {
        NOT_FOUND: {
            status: 404,
            message: 'Tag not found',
        },
        ALREADY_EXISTS: {
            status: 409,
            message: 'Tag already exists',
        },
        NAME_REQUIRED: {
            status: 400,
            message: 'Tag name is required',
        },
    },
    COMMENT: {
        NOT_FOUND: {
            status: 404,
            message: 'Comment not found',
        },
        UNAUTHORIZED: {
            status: 403,
            message: 'Unauthorized to access this comment',
        },
        POST_NOT_FOUND: {
            status: 404,
            message: 'Post not found for this comment',
        },
        CONTENT_REQUIRED: {
            status: 400,
            message: 'Comment content is required',
        },
        COMMENTS_DISABLED: {
            status: 403,
            message: 'Comments are disabled for this post',
        },
    },
    AUTH: {
        UNAUTHORIZED: {
            status: 401,
            message: 'Authentication required',
        },
        INVALID_CREDENTIALS: {
            status: 401,
            message: 'Invalid credentials',
        },
        USER_NOT_FOUND: {
            status: 404,
            message: 'User not found',
        },
        EMAIL_EXISTS: {
            status: 409,
            message: 'Email already exists',
        },
        SESSION_EXPIRED: {
            status: 401,
            message: 'Session expired',
        },
    },
    GENERAL: {
        INTERNAL_ERROR: {
            status: 500,
            message: 'Internal server error',
        },
        BAD_REQUEST: {
            status: 400,
            message: 'Bad request',
        },
        NOT_FOUND: {
            status: 404,
            message: 'Resource not found',
        },
        METHOD_NOT_ALLOWED: {
            status: 405,
            message: 'Method not allowed',
        },
    },
    USER: {
        NOT_FOUND: {
            status: 404,
            message: 'User not found',
        },
    },
    NICKNAME: {
        NOT_FOUND: {
            status: 404,
            message: 'Nickname not found',
        },
    },
    EMAIL: {
        NOT_FOUND: {
            status: 404,
            message: 'Email not found',
        },
    },
    IMAGE: {
        NOT_FOUND: {
            status: 404,
            message: 'Image not found',
        },
    },
} as const

export class AppError extends Error {
    status: number
    
    constructor(error: { status: number; message: string }) {
        super(error.message)
        this.status = error.status
        this.name = 'AppError'
    }
}