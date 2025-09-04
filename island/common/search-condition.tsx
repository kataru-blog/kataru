import { FC } from 'react'
import { Badge } from '../badge'
import { ScrollArea, ScrollBar } from '../scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

interface SearchConditionProps {
    currentTag?: string
    allTags?: { id: string; name: string }[]
    sortBy?: string
}

export const SearchCondition: FC<SearchConditionProps> = ({ allTags = [], currentTag = 'All', sortBy = 'newest' }) => {
    const updateUrl = (key: string, value: string) => {
        const urlParams = new URLSearchParams(window.location.search)
        if (!value && key === 'tag') {
            urlParams.delete('tag')
        } else {
            urlParams.set(key, value)
        }
        if (value === 'newest' && key === 'sort') {
            urlParams.delete('sort')
        } else {
            urlParams.set(key, value)
        }
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`
        window.location.href = newUrl
    }

    const handleTagClick = (tag: string) => updateUrl('tag', tag)
    const handleSortChange = (sort: string) => updateUrl('sort', sort)

    return (
        <div className='flex flex-col gap-5'>
            <div className='flex items-center justify-between'>
                <h2 className='text-2xl font-bold'>{currentTag === '' ? 'Articles' : currentTag}</h2>
                <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className='rounded'>
                        <SelectValue placeholder='정렬 기준' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='newest'>Newest</SelectItem>
                        <SelectItem value='most_view'>Most View</SelectItem>
                        <SelectItem value='most_like'>Most Like</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className='w-full whitespace-nowrap'>
                <div className='flex gap-2 pb-4'>
                    {[{ id: '', name: 'All' }, ...allTags].map((tag) => (
                        <Badge
                            className='rounded'
                            key={tag.id + tag.name}
                            variant={currentTag === tag.id ? 'default' : 'secondary'}
                            onClick={() => handleTagClick(tag.id)}>
                            {tag.name}
                        </Badge>
                    ))}
                </div>
                <ScrollBar orientation='horizontal' />
            </ScrollArea>
        </div>
    )
}
