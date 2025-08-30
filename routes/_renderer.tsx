import { reactRenderer } from '@hono/react-renderer'

export default reactRenderer(({ children, c }) => {
    return (
        <html lang='ko'>
            <head>
                <meta charSet='UTF-8' />
                <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                <title>{c.env.title || 'Kataru'}</title>
                <link rel='stylesheet' href='/styles.css' />
                <link rel='icon' href='/favicon.ico' />
                <link rel='icon' type='image/x-icon' href='/favicon.ico' />
                <script src='/theme.js' defer></script>
                <script src='/island/client.js' defer></script>
            </head>
            <body className='antialiased bg-background text-foreground relative'>{children}</body>
        </html>
    )
})
