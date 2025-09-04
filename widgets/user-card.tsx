'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import { cn } from '@/lib/cn'
import { AtSign, CalendarDays, CheckCircle, ExternalLink, Mail, User, XCircle } from 'lucide-react'
import { FC } from 'react'

interface BlogUser {
    id: string
    name: string
    email: string
    nickname: string
    emailVerified: boolean
    image?: string | null
    customLinks?: { url: string; label: string }[] | null
    createdAt: Date
    updatedAt: Date
}

interface BlogUserCardProps {
    user: BlogUser
    blogDescription: string
    className?: string
}

interface UserCardCntentProps {
    className?: string
    user: BlogUser
}

const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const UserCardCntent: FC<UserCardCntentProps> = ({ user, className }) => {
    return (
        <div
            className={cn(
                'flex items-start sm:items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground sm:px-2 py-1 flex-col sm:flex-row border-b border-border',
                className,
            )}>
            {user.customLinks && user.customLinks.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                    {user.customLinks.map((link, index) => (
                        // <Button
                        //     key={index}
                        //     variant='ghost'
                        //     size='sm'
                        //     className='bg-transparent rounded text-xs sm:text-sm p-0! sm:px-0.5 sm:py-0 h-fit text-blue-900 dark:text-blue-300'
                        //     onClick={() => window.open(link.url, '_blank')}>
                        //     <ExternalLink className='size-3 sm:size-3.5' />
                        //     {link.label}
                        // </Button>
                        <a className='flex items-center gap-1 sm:gap-2 text-blue-900 dark:text-blue-200' href={link.url} target='_blank'>
                            <ExternalLink className='size-3 sm:size-3.5' />
                            <span>{link.label}</span>
                        </a>
                    ))}
                </div>
            )}
            <div className='flex items-center gap-1 sm:gap-2'>
                <CalendarDays className='size-3 sm:size-3.5' />
                <span className='hidden sm:inline'>가입일: </span>
                <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className='flex items-center gap-1 sm:gap-2'>
                <User className='size-3 sm:size-3.5' />
                <span className='hidden sm:inline'>업데이트: </span>
                <span>{formatDate(user.updatedAt)}</span>
            </div>
        </div>
    )
}

export const UserCard: FC<BlogUserCardProps> = ({ user, blogDescription, className }) => {
    return (
        <div className={className}>
            <div className='flex items-start sm:items-center size-full flex-col sm:flex-row border-b border-border'>
                <div className='flex items-center gap-3 flex-shrink-0 p-1.5 px-3 sm:p-3 border-b sm:border-r sm:border-b-0 border-border sm:w-auto w-full'>
                    <Avatar className='size-10 sm:size-20'>
                        <AvatarImage src={user.image || undefined} alt={user.name} />
                        <AvatarFallback className='text-md sm:text-xl font-semibold'>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-1 sm:gap-2'>
                            <h3 className='text-sm sm:text-lg font-bold text-balance'>{user.name}</h3>
                            {user.emailVerified ? (
                                <CheckCircle className='size-3 sm:size-3.5 text-green-500' />
                            ) : (
                                <XCircle className='size-3 sm:size-3.5 text-red-500' />
                            )}
                        </div>
                        <div className='flex items-center gap-1 sm:gap-2'>
                            <AtSign className='size-3 sm:size-3.5 text-muted-foreground' />
                            <span className='text-xs sm:text-sm text-muted-foreground'>{user.nickname}</span>
                        </div>
                        <div className='flex items-center gap-1 sm:gap-2'>
                            <Mail className='size-3 sm:size-3.5 text-muted-foreground' />
                            <span className='text-xs sm:text-sm text-muted-foreground'>{user.email}</span>
                        </div>
                    </div>
                    <UserCardCntent user={user} className='flex sm:hidden border-b-0' />
                </div>

                <div className='size-full p-3 py-1.5'>
                    <p className='text-xs sm:text-sm text-primary/90 text-pretty leading-tight line-clamp-1 sm:line-clamp-3'>{blogDescription}</p>
                </div>
            </div>
            <UserCardCntent user={user} className='hidden sm:flex' />
        </div>
    )
}
