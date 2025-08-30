import { Header } from 'features/header'
import type { ComponentProps, FC, PropsWithChildren } from 'react'

interface LayoutProps extends PropsWithChildren<ComponentProps<typeof Header>> {}

export const Layout: FC<LayoutProps> = ({ children, ...props }) => {
    return (
        <>
            <Header {...props} />
            {children}
        </>
    )
}
