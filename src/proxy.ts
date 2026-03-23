/** Next.js 16 proxy: optimistic cookie-based route protection + x-pathname header injection. */

import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    const publicPaths = [
        '/',
        '/auth',
        '/api/auth',
        '/api/trpc',
        '/api/e2e',
        '/api/inventory',
        '/forms',
        '/_next',
        '/favicon.ico',
    ]

    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    )

    // Must be on the request (not response) -- Server Components can only read request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    const nextConfig = { request: { headers: requestHeaders } }

    if (isPublicPath) {
        return NextResponse.next(nextConfig)
    }

    const sessionCookie = request.cookies.get(
        '__Secure-neon-auth.session_token',
    )

    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url))
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
