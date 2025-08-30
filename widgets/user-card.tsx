'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/island/avatar'
import { Button } from '@/island/button'
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

export const UserCard: FC<BlogUserCardProps> = ({ user, blogDescription, className }) => {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}.${month}.${day}`
    }

    return (
        <div className={className}>
            <div className='flex items-start sm:items-center size-full flex-col sm:flex-row border-b border-border'>
                <div className='flex items-center gap-5 flex-shrink-0 p-3 sm:p-5 border-b sm:border-r sm:border-b-0 border-border sm:w-auto w-full'>
                    <Avatar className='size-20'>
                        <AvatarImage src={user.image || undefined} alt={user.name} />
                        <AvatarFallback className='text-xl font-semibold'>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-2'>
                            <h3 className='text-xl font-bold text-balance'>{user.name}</h3>
                            {user.emailVerified ? <CheckCircle className='size-3.5 text-green-500' /> : <XCircle className='size-3.5 text-red-500' />}
                        </div>
                        <div className='flex items-center gap-2'>
                            <AtSign className='size-3.5 text-muted-foreground' />
                            <span className='text-sm text-muted-foreground'>{user.nickname}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Mail className='size-3.5 text-muted-foreground' />
                            <span className='text-sm text-muted-foreground'>{user.email}</span>
                        </div>
                    </div>
                </div>

                <div className='size-full p-3 sm:p-5'>
                    <p className='text-sm text-muted-foreground text-pretty leading-relaxed line-clamp-3'>{blogDescription}</p>
                </div>
            </div>

            <div className='flex items-start sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground px-2 sm:px-3.5 py-1 flex-col sm:flex-row border-b border-border'>
                {user.customLinks && user.customLinks.length > 0 && (
                    <div className='flex flex-wrap gap-2 '>
                        {user.customLinks.map((link, index) => (
                            <Button
                                key={index}
                                variant='ghost'
                                size='sm'
                                className='bg-transparent rounded '
                                onClick={() => window.open(link.url, '_blank')}>
                                <ExternalLink className='size-3.5' />
                                {link.label}
                            </Button>
                        ))}
                    </div>
                )}
                <div className='flex items-center gap-2 px-2.25 sm:p-0'>
                    <CalendarDays className='size-3.5' />
                    <span>가입일: {formatDate(user.createdAt)}</span>
                </div>
                <div className='flex items-center gap-2 px-2.25 sm:p-0'>
                    <User className='size-3.5' />
                    <span>업데이트: {formatDate(user.updatedAt)}</span>
                </div>
            </div>
        </div>
    )
}
