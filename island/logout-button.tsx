export const LogoutButton = () => {
    const handleSignOut = async () => {
        const response = await fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
        })

        if (response.ok) window.location.reload()
    }
    return (
        <button onClick={handleSignOut} className='text-sm text-foreground/70 hover:text-foreground transition-colors'>
            로그아웃
        </button>
    )
}
