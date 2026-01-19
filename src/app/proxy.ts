/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Handles route protection with optimistic cookie-based checks.
 * Full session validation should be done in pages/routes.
 */

import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes - no auth check needed
    const publicPaths = [
        '/',
        '/login',
        '/api/auth',
        '/api/trpc',
        '/portal/login',
        '/_next',
        '/favicon.ico',
    ]

    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    )

    if (isPublicPath) {
        return NextResponse.next()
    }

    // Check for session cookie (optimistic check)
    // Must match cookiePrefix in auth.ts
    const sessionCookie = getSessionCookie(request, {
        cookiePrefix: 'trust-admin',
    })

    // Portal routes - require session
    if (pathname.startsWith('/portal')) {
        if (!sessionCookie) {
            return NextResponse.redirect(new URL('/portal/login', request.url))
        }
        return NextResponse.next()
    }

    // Admin routes - require session (role check done in pages)
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
