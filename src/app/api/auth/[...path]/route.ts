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

import { authApiHandler } from '@neondatabase/auth/next/server'

export const { GET, POST, PUT, DELETE, PATCH } = authApiHandler()
