export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { authServer } from '@/lib/auth'

/**
 * Root page - auth gateway
 *
 * Server Component that checks authentication and redirects appropriately:
 * - Admin users → /dashboard (admin dashboard)
 * - Other users → /portal (beneficiary portal)
 * - Unauthenticated → shows login options
 *
 * Uses native Neon Auth role from session.user.role.
 * Default role for new users is "user". Use authClient.admin.setRole()
 * to promote users to "admin" role.
 */
export default async function RootPage() {
    let session: Awaited<ReturnType<typeof authServer.getSession>>['data']
    try {
        const result = await authServer.getSession()
        session = result.data
    } catch {
        // If auth service is unreachable, show login page
        session = null
    }

    // Redirect authenticated users to their appropriate dashboard
    if (session?.user) {
        // Check native Neon Auth role
        if (session.user.role === 'admin') {
            redirect('/dashboard')
        }
        redirect('/portal')
    }

    redirect('/auth/sign-in')
}
