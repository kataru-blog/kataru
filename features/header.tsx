import { Image } from '@/island'
import { IslandRenderer } from '@/shared/islands/renderer'
import { blogs, user } from 'entities'
import { FC } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { BlendColor } from 'shared/icons'

interface HeaderProps {
    user?: typeof user.$inferSelect
    blog?: typeof blogs.$inferSelect
    isRoot?: boolean
}

export const Header: FC<HeaderProps> = ({ user, blog, isRoot }) => {
    return (
        <header className='sticky backdrop-blur-sm bg-background/80 top-0 z-50 flex justify-between items-center w-full h-12 border-b border-secondary px-4'>
            <div className='flex items-center gap-2'>
                <a href='/' className='dark:invert'>
                    <Image fetchPriority='high' src={'/favicon.ico'} alt='favicon' className='size-7' />
                </a>
                <a className='font-bold text-lg' href={isRoot ? '/' : `/${user?.nickname}`}>
                    {blog?.title || 'Kataru'}
                </a>
            </div>

            <div className='flex items-center gap-2 sm:gap-3'>
                {user ? (
                    <Fragment>
                        <a href='/blog' className='text-sm text-foreground/70 hover:text-foreground transition-colors'>
                            {user.name}
                        </a>
                        <IslandRenderer ssr={true} name='LogoutButton' />
                    </Fragment>
                ) : (
                    <a href='/login' className='text-sm text-foreground/70 hover:text-foreground transition-colors'>
                        로그인
                    </a>
                )}
                <BlendColor id='theme-toggle' className='size-5 fill-foreground text-foreground cursor-pointer' />
            </div>
        </header>
    )
}
