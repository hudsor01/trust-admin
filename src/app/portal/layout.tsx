import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppErrorBoundary } from '@/components/error-boundary'
import { getPublicDb } from '@/db'
import { userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth'

/**
 * Portal Layout
 *
 * Server Component that protects all portal routes.
 * Redirects to login if not authenticated or if admin (admins use /dashboard).
 * Redirects to /portal/change-password if forcePasswordChange is set.
 *
 * Uses native Neon Auth role from session.user.role for admin check.
 * Uses userProfile.forcePasswordChange for forced password change gate.
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

    // Check forcePasswordChange flag — redirect to change-password page if set.
    // Read current pathname from request headers (injected by proxy) to avoid
    // redirect loop when the user is already on the change-password page.
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? ''

    if (pathname !== '/portal/change-password') {
        const publicDb = getPublicDb()
        const [profile] = await publicDb
            .select({ forcePasswordChange: userProfile.forcePasswordChange })
            .from(userProfile)
            .where(eq(userProfile.userId, session.user.id))
            .limit(1)

        if (profile?.forcePasswordChange) {
            redirect('/portal/change-password')
        }
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
