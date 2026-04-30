export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppErrorBoundary } from '@/components/error-boundary'
import { getPublicDb } from '@/db'
import { userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth'
import { env } from '@/lib/env'

/**
 * Route guard: portal is for beneficiaries only.
 * Trust-administrative roles (admin, trustee, arbiter) redirect to /dashboard.
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

    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    if (session.user.email === env.ADMIN_EMAIL) {
        redirect('/dashboard')
    }

    // x-pathname (injected by proxy) prevents redirect loop on the change-password page itself
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? ''

    const publicDb = getPublicDb()
    const [profile] = await publicDb
        .select({
            role: userProfile.role,
            forcePasswordChange: userProfile.forcePasswordChange,
        })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    if (
        profile?.role === 'admin' ||
        profile?.role === 'trustee' ||
        profile?.role === 'arbiter'
    ) {
        redirect('/dashboard')
    }

    if (
        pathname !== '/portal/change-password' &&
        profile?.forcePasswordChange
    ) {
        redirect('/portal/change-password')
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
