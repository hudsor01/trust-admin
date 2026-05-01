export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getPublicDb } from '@/db'
import { userProfile } from '@/db/schema'
import { authServer, isTrustAdmin } from '@/lib/auth'
import { env } from '@/lib/env'

/**
 * Auth gateway: routes by app role.
 *   admin / trustee / arbiter → /dashboard
 *   beneficiary (or anyone else with a profile) → /portal
 *   no session → /auth/sign-in
 */
export default async function RootPage() {
    let session: Awaited<ReturnType<typeof authServer.getSession>>['data']
    try {
        const result = await authServer.getSession()
        session = result.data
    } catch {
        session = null
    }

    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    if (session.user.email === env.ADMIN_EMAIL) {
        redirect('/dashboard')
    }

    const publicDb = getPublicDb()
    const [profile] = await publicDb
        .select({ role: userProfile.role })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    if (profile && isTrustAdmin({ role: profile.role })) {
        redirect('/dashboard')
    }

    redirect('/portal')
}
