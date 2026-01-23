import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { authServer } from '@/lib/auth'
import { db, userProfile } from '../../../db'

/**
 * Portal Layout
 *
 * Server Component that protects all portal routes.
 * Redirects to login if not authenticated or if admin (admins use /dashboard).
 */
export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session } = await authServer.getSession()

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    // Fetch user profile to get role
    const [profile] = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    // Admin users should use the admin dashboard
    if (profile?.role === 'admin') {
        redirect('/dashboard')
    }

    // Beneficiaries without a profile need to be set up by admin
    if (!profile?.beneficiaryId) {
        // Allow access but the page will show "no profile" message
    }

    return <>{children}</>
}
