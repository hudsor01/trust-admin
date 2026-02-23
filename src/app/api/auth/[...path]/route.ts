/**
 * Neon Auth Route Handler
 *
 * Handles all auth requests: /api/auth/*
 * - Email/password sign-in
 * - OAuth (Google)
 * - Session management
 * - Sign out
 *
 * Proxies requests to Neon Auth service at NEON_AUTH_BASE_URL.
 *
 * @see https://neon.com/docs/auth/quick-start/nextjs
 */

// Always dynamic — never pre-rendered at build time (requires auth config at runtime)
export const dynamic = 'force-dynamic'

import { authServer } from '@/lib/auth/server'

export const { GET, POST } = authServer.handler()
