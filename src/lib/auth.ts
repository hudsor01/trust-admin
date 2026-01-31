/**
 * Neon Auth - Main Entry Point
 *
 * Re-exports the auth client and server from their respective modules.
 * Also provides type definitions and utility functions.
 *
 * @see https://neon.com/docs/auth/overview
 */

import { logger } from './logger'

const log = logger.auth

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Session type from Neon Auth
 */
export interface NeonAuthSession {
    id: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    userId: string
}

/**
 * User type from Neon Auth (neon_auth.user table)
 * Note: Custom fields like beneficiaryId are stored in user_profile table
 */
export interface NeonAuthUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
    role?: string | null
    banned?: boolean | null
    banReason?: string | null
    banExpires?: Date | null
}

/**
 * Extended user type with app-specific fields
 * The role and beneficiaryId come from user_profile table
 * "user" is a fallback for authenticated users without a userProfile record
 */
export type AppUser = NeonAuthUser & {
    role: 'admin' | 'beneficiary' | 'user'
    beneficiaryId?: number | null
}

/**
 * Session data returned by neonAuth()
 */
export type SessionData =
    | { session: NeonAuthSession; user: NeonAuthUser }
    | { session: null; user: null }

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isAdmin(user: AppUser | NeonAuthUser): boolean {
    return user.role === 'admin'
}

export function isBeneficiary(
    user: AppUser | NeonAuthUser,
): user is AppUser & { beneficiaryId: number } {
    return user.role === 'beneficiary' && !!(user as AppUser).beneficiaryId
}

// =============================================================================
// IP ADDRESS VALIDATION (for audit logging)
// =============================================================================

const IPV4_REGEX =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/
const IPV6_REGEX =
    /^(?:(?:[a-fA-F\d]{1,4}:){7}[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,7}:|(?:[a-fA-F\d]{1,4}:){1,6}:[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,5}(?::[a-fA-F\d]{1,4}){1,2}|(?:[a-fA-F\d]{1,4}:){1,4}(?::[a-fA-F\d]{1,4}){1,3}|(?:[a-fA-F\d]{1,4}:){1,3}(?::[a-fA-F\d]{1,4}){1,4}|(?:[a-fA-F\d]{1,4}:){1,2}(?::[a-fA-F\d]{1,4}){1,5}|[a-fA-F\d]{1,4}:(?::[a-fA-F\d]{1,4}){1,6}|:(?::[a-fA-F\d]{1,4}){1,7}|::(?:[fF]{4}:)?(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)|(?:[a-fA-F\d]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))$/

/**
 * Validates and extracts client IP address from request headers
 * Prevents log injection attacks by validating IP format
 */
export function extractClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp = req.headers.get('x-real-ip')?.trim()

    const candidate = forwarded || realIp

    if (candidate) {
        if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
            return candidate
        }
        log.warn('Invalid IP address format in headers', {
            forwarded: forwarded?.slice(0, 50),
            realIp: realIp?.slice(0, 50),
        })
    }

    return 'unknown'
}

// =============================================================================
// AUTH CLIENT/SERVER EXPORTS
// =============================================================================

// Re-export neonAuth helper from the server module (for RSC)
export { neonAuth } from '@neondatabase/auth/next/server'
// Re-export client and server - these are lazy-loaded to avoid initialization issues
// in test environments. Import directly from './auth/client' or './auth/server' if needed.
export { authClient } from './auth/client'
export { authServer } from './auth/server'

// Validate environment at module load (warning only, not blocking)
if (!process.env.NEON_AUTH_BASE_URL && process.env.NODE_ENV === 'production') {
    log.error('NEON_AUTH_BASE_URL not set - authentication will fail')
}
