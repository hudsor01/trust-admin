/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Handles route protection with optimistic cookie-based checks.
 * Full session validation should be done in pages/routes.
 *
 * Also injects x-pathname header on every pass-through response so
 * Server Components (e.g. portal layout) can read the current route
 * without needing to parse the request URL directly (which is unavailable
 * in Server Component headers in some Next.js versions).
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
        '/api/inventory',
        '/portal/login',
        '/forms',
        '/_next',
        '/favicon.ico',
    ]

    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    )

    // Inject x-pathname into the REQUEST headers so Server Components
    // can read it via headers(). Response headers are NOT visible to
    // Server Components — only request headers are.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    const nextConfig = { request: { headers: requestHeaders } }

    if (isPublicPath) {
        return NextResponse.next(nextConfig)
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
        return NextResponse.next(nextConfig)
    }

    // Admin routes - require session (role check done in pages)
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next(nextConfig)
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
