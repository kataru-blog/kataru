import { useEffect, useState } from 'react'
import { GitHub, Google } from 'shared/icons'

export const LoginForm = () => {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const errorParam = params.get('error')
        if (errorParam) {
            setError(getErrorMessage(errorParam))
        }
    }, [])

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'invalid_credentials':
                return '이메일 또는 비밀번호가 올바르지 않습니다.'
            case 'email_not_verified':
                return '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
            case 'oauth_error':
                return 'OAuth 인증에 실패했습니다. 다시 시도해주세요.'
            case 'oauth_callback_failed':
                return 'OAuth 콜백 처리에 실패했습니다. 다시 시도해주세요.'
            case 'server_error':
                return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            default:
                return '로그인 중 오류가 발생했습니다.'
        }
    }

    const handleSocialLogin = async (provider: string) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/sign-in/social', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider,
                    callbackURL: '/',
                }),
                credentials: 'include',
            })

            if (response.ok) {
                const data = (await response.json()) as { url?: string; redirect?: string }
                if (data.url) {
                    window.location.href = data.url
                } else if (data.redirect) {
                    window.location.href = data.redirect
                } else {
                    setError('OAuth 인증에 실패했습니다.')
                }
            } else {
                console.error('OAuth error:', response.status)
                setError('OAuth 인증에 실패했습니다.')
            }
        } catch (error) {
            console.error('OAuth request failed:', error)
            setError('OAuth 인증에 실패했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section className='flex items-center justify-center min-h-screen bg-background'>
            <div className='w-full max-w-md p-8 space-y-6 bg-background border border-secondary rounded-lg'>
                <div className='text-center'>
                    <h1 className='text-3xl font-bold text-foreground'>로그인</h1>
                    <p className='mt-2 text-sm text-foreground/70'>계정에 로그인하세요</p>
                </div>

                {error && <div className='p-3 text-sm text-foreground bg-secondary/50 rounded-md'>{error}</div>}

                <div className='space-y-3'>
                    <button
                        type='button'
                        onClick={() => handleSocialLogin('github')}
                        disabled={isLoading}
                        className='flex items-center justify-center w-full px-4 py-2 text-background bg-foreground rounded-md hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground disabled:opacity-50 disabled:cursor-not-allowed'>
                        <GitHub className='w-5 h-5 mr-2' />
                        GitHub으로 계속하기
                    </button>

                    <button
                        type='button'
                        onClick={() => handleSocialLogin('google')}
                        disabled={isLoading}
                        className='flex items-center justify-center w-full px-4 py-2 text-foreground bg-background border border-secondary rounded-md hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Google className='w-5 h-5 mr-2' />
                        Google로 계속하기
                    </button>
                </div>

                <div className='text-center'>
                    <p className='text-sm text-foreground/70'>
                        계정이 없으신가요?{' '}
                        <a href='/register' className='font-medium text-primary hover:underline'>
                            회원가입
                        </a>
                    </p>
                </div>
            </div>
        </section>
    )
}
