export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { authServer } from '@/lib/auth'

/** Auth gateway: routes by Neon Auth role to /dashboard, /portal, or /auth/sign-in. */
export default async function RootPage() {
    let session: Awaited<ReturnType<typeof authServer.getSession>>['data']
    try {
        const result = await authServer.getSession()
        session = result.data
    } catch {
        session = null
    }

    if (session?.user) {
        if (session.user.role === 'admin') {
            redirect('/dashboard')
        }
        redirect('/portal')
    }

    redirect('/auth/sign-in')
}
