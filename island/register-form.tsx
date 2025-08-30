import React, { useState, useEffect, type ChangeEvent } from 'react'
import { GitHub, Google } from 'shared/icons'

export const RegisterForm = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [terms, setTerms] = useState(false)
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
            case 'missing_fields':
                return '모든 필드를 입력해주세요.'
            case 'password_mismatch':
                return '비밀번호가 일치하지 않습니다.'
            case 'email_exists':
                return '이미 사용 중인 이메일입니다.'
            case 'server_error':
                return '회원가입 중 오류가 발생했습니다.'
            default:
                return '회원가입 중 오류가 발생했습니다.'
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.')
            return
        }

        if (!terms) {
            setError('이용약관에 동의해주세요.')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/sign-up/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                }),
                credentials: 'include',
            })

            if (response.ok) {
                const data = (await response.json()) as { user?: unknown }
                if (data.user) {
                    window.location.href = '/'
                } else {
                    setError('회원가입 중 오류가 발생했습니다.')
                }
            } else {
                const errorData = (await response.json().catch(() => ({}))) as { code?: string }
                if (response.status === 409 || errorData.code === 'USER_ALREADY_EXISTS') {
                    setError('이미 사용 중인 이메일입니다.')
                } else if (response.status === 400) {
                    setError('모든 필드를 입력해주세요.')
                } else {
                    setError('회원가입 중 오류가 발생했습니다.')
                }
            }
        } catch (error) {
            console.error('Registration error:', error)
            setError('회원가입 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
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
                    <h1 className='text-3xl font-bold text-foreground'>회원가입</h1>
                    <p className='mt-2 text-sm text-foreground/70'>새 계정을 만들어보세요</p>
                </div>

                {error && <div className='p-3 text-sm text-foreground bg-secondary/50 rounded-md'>{error}</div>}

                <form className='space-y-4' onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor='name' className='block text-sm font-medium text-foreground'>
                            이름
                        </label>
                        <input
                            type='text'
                            id='name'
                            name='name'
                            required
                            autoComplete='name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className='w-full px-3 py-2 mt-1 border border-secondary bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                            placeholder='홍길동'
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor='email' className='block text-sm font-medium text-foreground'>
                            이메일
                        </label>
                        <input
                            type='email'
                            id='email'
                            name='email'
                            required
                            autoComplete='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className='w-full px-3 py-2 mt-1 border border-secondary bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                            placeholder='your@email.com'
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor='password' className='block text-sm font-medium text-foreground'>
                            비밀번호
                        </label>
                        <input
                            type='password'
                            id='password'
                            name='password'
                            required
                            minLength={8}
                            autoComplete='new-password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className='w-full px-3 py-2 mt-1 border border-secondary bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                            placeholder='최소 8자 이상'
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor='confirmPassword' className='block text-sm font-medium text-foreground'>
                            비밀번호 확인
                        </label>
                        <input
                            type='password'
                            id='confirmPassword'
                            name='confirmPassword'
                            required
                            minLength={8}
                            autoComplete='new-password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className='w-full px-3 py-2 mt-1 border border-secondary bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                            placeholder='비밀번호를 다시 입력하세요'
                            disabled={isLoading}
                        />
                    </div>

                    <div className='flex items-center'>
                        <input
                            id='terms'
                            name='terms'
                            type='checkbox'
                            required
                            checked={terms}
                            onChange={(e) => setTerms(e.target.checked)}
                            className='w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary'
                            disabled={isLoading}
                        />
                        <label htmlFor='terms' className='ml-2 text-sm text-foreground/70'>
                            <a href='/terms' className='text-primary hover:underline'>
                                이용약관
                            </a>{' '}
                            및
                            <a href='/privacy' className='text-primary hover:underline'>
                                {' '}
                                개인정보처리방침
                            </a>
                            에 동의합니다
                        </label>
                    </div>

                    <button
                        type='submit'
                        disabled={isLoading}
                        className='w-full px-4 py-2 text-background bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'>
                        {isLoading ? '회원가입 중...' : '회원가입'}
                    </button>
                </form>

                <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                        <div className='w-full border-t border-secondary'></div>
                    </div>
                    <div className='relative flex justify-center text-sm'>
                        <span className='px-2 bg-background text-foreground/50'>또는</span>
                    </div>
                </div>

                <div className='space-y-3'>
                    <button
                        type='button'
                        onClick={() => handleSocialLogin('github')}
                        disabled={isLoading}
                        className='flex items-center justify-center w-full px-4 py-2 text-background bg-foreground rounded-md hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground disabled:opacity-50 disabled:cursor-not-allowed'>
                        <GitHub className='w-5 h-5 mr-2' />
                        GitHub으로 가입하기
                    </button>

                    <button
                        type='button'
                        onClick={() => handleSocialLogin('google')}
                        disabled={isLoading}
                        className='flex items-center justify-center w-full px-4 py-2 text-foreground bg-background border border-secondary rounded-md hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed'>
                        <Google className='w-5 h-5 mr-2' />
                        Google로 가입하기
                    </button>
                </div>

                <div className='text-center'>
                    <p className='text-sm text-foreground/70'>
                        이미 계정이 있으신가요?{' '}
                        <a href='/login' className='font-medium text-primary hover:underline'>
                            로그인
                        </a>
                    </p>
                </div>
            </div>
        </section>
    )
}
