/** Neon Auth entry point: types, guards, IP validation, and re-exports. */

import { logger } from './logger'

export {
    type AppRole,
    isAdmin,
    isBeneficiary,
    isTrustAdmin,
    TRUST_ADMIN_ROLES,
    type TrustAdminRole,
} from './auth/roles'

import type { AppRole } from './auth/roles'

const log = logger.auth

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Neon Auth session (from neon_auth.session table). */
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

/** Neon Auth user. Custom fields (beneficiaryId) live in user_profile. */
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

/** Extended with user_profile fields. */
export type AppUser = NeonAuthUser & {
    role: AppRole
    beneficiaryId?: number | null
}

/** Session data returned by neonAuth(). */
export type SessionData =
    | { session: NeonAuthSession; user: NeonAuthUser }
    | { session: null; user: null }

// =============================================================================
// IP ADDRESS VALIDATION (for audit logging)
// =============================================================================

const IPV4_REGEX =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/
const IPV6_REGEX =
    /^(?:(?:[a-fA-F\d]{1,4}:){7}[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,7}:|(?:[a-fA-F\d]{1,4}:){1,6}:[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,5}(?::[a-fA-F\d]{1,4}){1,2}|(?:[a-fA-F\d]{1,4}:){1,4}(?::[a-fA-F\d]{1,4}){1,3}|(?:[a-fA-F\d]{1,4}:){1,3}(?::[a-fA-F\d]{1,4}){1,4}|(?:[a-fA-F\d]{1,4}:){1,2}(?::[a-fA-F\d]{1,4}){1,5}|[a-fA-F\d]{1,4}:(?::[a-fA-F\d]{1,4}){1,6}|:(?::[a-fA-F\d]{1,4}){1,7}|::(?:[fF]{4}:)?(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)|(?:[a-fA-F\d]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))$/

/** Extract and validate client IP from headers to prevent log injection. */
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

export { authClient } from './auth/client'
export { authServer } from './auth/server'
