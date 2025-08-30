import { StrictMode, Suspense, createElement } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import * as islands from './index'

const islandComponents = islands as Record<string, React.ComponentType<any>>

const hydrateIsland = (element: Element) => {
    const id = element.getAttribute('data-island-id')
    const componentName = element.getAttribute('data-island-name')
    const propsStr = element.getAttribute('data-island-props')
    const isSSR = element.getAttribute('data-island-ssr') === 'true'

    if (!componentName || !id) {
        console.warn('Island missing required attributes:', { id, componentName })
        return
    }

    const Component = islandComponents[componentName]
    if (!Component) {
        console.warn(`Island component "${componentName}" not found`)
        return
    }

    const props = propsStr ? JSON.parse(propsStr) : {}

    if (isSSR && element.innerHTML) {
        hydrateRoot(element, <StrictMode>{createElement(Component, props)}</StrictMode>, {
            onRecoverableError: (error, errorInfo) => {
                console.warn('Hydration recoverable error:', error, errorInfo)
            },
        })
    } else {
        const root = createRoot(element)
        root.render(
            <StrictMode>
                <Suspense fallback={<div>Loading...</div>}>{createElement(Component, props)}</Suspense>
            </StrictMode>,
        )
    }
}

const initializeIslands = () => {
    const highPriorityIslands = document.querySelectorAll('[data-island-priority="high"]')
    highPriorityIslands.forEach(hydrateIsland)

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const element = entry.target
                    const priority = element.getAttribute('data-island-priority')

                    if (priority === 'low') {
                        if ('requestIdleCallback' in window) {
                            requestIdleCallback(() => hydrateIsland(element))
                        } else {
                            setTimeout(() => hydrateIsland(element), 0)
                        }
                    } else {
                        hydrateIsland(element)
                    }

                    observer.unobserve(element)
                }
            })
        },
        { rootMargin: '50px' },
    )

    const otherIslands = document.querySelectorAll('[data-island-id]:not([data-island-priority="high"])')
    otherIslands.forEach((element) => observer.observe(element))
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIslands)
} else {
    initializeIslands()
}
