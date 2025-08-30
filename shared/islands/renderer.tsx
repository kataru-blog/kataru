import * as islands from '@/island'
import { type ComponentProps } from 'react'
import { renderToString } from 'react-dom/server'

type IslandName = keyof typeof islands

type IslandProps<T extends IslandName> = {
    name: T
    props?: ComponentProps<(typeof islands)[T]>
    priority?: 'high' | 'medium' | 'low'
    ssr?: boolean
    fallback?: React.ReactNode
    className?: string
}

const isServer = typeof window === 'undefined'

export const IslandRenderer = <T extends IslandName>({ name, props, priority = 'medium', ssr = true, fallback, className }: IslandProps<T>) => {
    const Component = islands[name] as React.ComponentType<any>
    if (!Component) {
        console.warn(`Island component "${String(name)}" not found`)
        return null
    }

    const islandId = `${String(name)}-${Math.random().toString(36).substring(2, 11)}`
    const componentProps = props || {}

    if (isServer && ssr) {
        try {
            const html = renderToString(<Component {...componentProps} />)
            return (
                <div
                    id={`island-${islandId}`}
                    data-island-id={islandId}
                    data-island-name={String(name)}
                    data-island-props={JSON.stringify(componentProps)}
                    data-island-priority={priority}
                    data-island-ssr='true'
                    className={className}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )
        } catch (error) {
            console.error(`SSR failed for island "${String(name)}":`, error)
        }
    }

    return (
        <div
            id={`island-${islandId}`}
            data-island-id={islandId}
            data-island-name={String(name)}
            data-island-props={JSON.stringify(componentProps)}
            data-island-priority={priority}
            data-island-ssr='false'
            className={className}>
            {isServer ? fallback : <Component {...componentProps} />}
        </div>
    )
}
