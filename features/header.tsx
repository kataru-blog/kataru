import { IslandRenderer } from '@/shared/islands/renderer'
import { User } from 'better-auth/*'
import { blogs } from 'entities'
import { FC } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { BlendColor } from 'shared/icons'

interface HeaderProps {
    user?: User
    blog?: typeof blogs.$inferSelect
}

export const Header: FC<HeaderProps> = ({ user, blog }) => {
    return (
        <header className='sticky backdrop-blur-lg bg-background/80 top-0 z-50 flex justify-between items-center w-full h-12 border-b border-secondary px-4'>
            <a className='font-bold text-lg' href='/'>
                {blog?.title || 'Kataru'}
            </a>

            <div className='flex items-center gap-4'>
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
