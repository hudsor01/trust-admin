/**
 * Better Auth Route Handler
 *
 * Handles all auth requests: /api/auth/*
 * - Magic link sign-in
 * - Session management
 * - Sign out
 */

import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth)
