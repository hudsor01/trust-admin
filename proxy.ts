/**
 * Neon Auth Middleware
 *
 * Protects routes and redirects unauthenticated users to sign-in.
 * Also handles session refresh.
 *
 * @see https://neon.com/docs/auth/quick-start/nextjs
 */

import { neonAuthMiddleware } from '@neondatabase/auth/next/server'

export default neonAuthMiddleware({
    loginUrl: '/auth/sign-in',
})

export const config = {
    matcher: [
        // Protect account management pages
        '/account/:path*',
        // Protect admin dashboard (but not login pages)
        '/dashboard/:path*',
        // Protect beneficiary portal (but not portal login)
        '/portal/:path*',
    ],
}
