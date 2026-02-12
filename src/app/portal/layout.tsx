import { redirect } from 'next/navigation'
import { AppErrorBoundary } from '@/components/error-boundary'
import { authServer } from '@/lib/auth'

/**
 * Portal Layout
 *
 * Server Component that protects all portal routes.
 * Redirects to login if not authenticated or if admin (admins use /dashboard).
 *
 * Uses native Neon Auth role from session.user.role.
 */
export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session: Awaited<ReturnType<typeof authServer.getSession>>['data']
    try {
        const result = await authServer.getSession()
        session = result.data
    } catch {
        redirect('/auth/sign-in')
    }

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    // Admin users should use the admin dashboard
    // Uses native Neon Auth role
    if (session.user.role === 'admin') {
        redirect('/dashboard')
    }

    return (
        <AppErrorBoundary
            title="Portal Error"
            description="An error occurred. Please try again or contact the trust administrator if the issue persists."
        >
            {children}
        </AppErrorBoundary>
    )
}
