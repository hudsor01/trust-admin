import { ApiError } from './api-error'
import {
    type AppRole,
    type AppUser,
    authServer,
    extractClientIP,
    TRUST_ADMIN_ROLES,
} from './auth'
import { logger } from './logger'

// WeakMap ensures cache is GC'd with the request object
const sessionCache = new WeakMap<
    Request,
    Promise<{ user: AppUser; session: unknown } | null>
>()

/** Get session with request-level caching to prevent duplicate DB queries. */
async function getCachedSession(req: Request) {
    if (sessionCache.has(req)) {
        return sessionCache.get(req)!
    }

    const sessionPromise = authServer.getSession().then(({ data }) =>
        data
            ? {
                  user: data.user as AppUser,
                  session: data.session,
              }
            : null,
    )

    sessionCache.set(req, sessionPromise)
    return sessionPromise
}

/** Validate session and return authenticated user. Throws ApiError.unauthorized() on failure. */
async function requireAuth(
    req: Request,
    allowedRoles?: Array<AppRole>,
): Promise<AppUser> {
    const url = new URL(req.url)
    // VULN-013 FIX: Use validated IP extraction
    const ip = extractClientIP(req)

    try {
        const session = await getCachedSession(req)

        if (!session) {
            logger.auth.warn('Unauthenticated access attempt', {
                path: url.pathname,
                method: req.method,
                ip,
            })
            throw ApiError.unauthorized('Authentication required')
        }

        const { user } = session

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            logger.auth.warn('Insufficient permissions', {
                userId: user.id,
                userRole: user.role,
                requiredRoles: allowedRoles,
                path: url.pathname,
                ip,
            })
            throw ApiError.forbidden(
                `Access denied. Required role: ${allowedRoles.join(' or ')}`,
            )
        }

        logger.auth.debug('Authenticated access', {
            userId: user.id,
            role: user.role,
            path: url.pathname,
        })

        return user
    } catch (error) {
        if (error instanceof ApiError) throw error

        logger.auth.error('Auth middleware error', {
            error,
            path: url.pathname,
        })
        throw ApiError.unauthorized('Authentication failed')
    }
}

/** Requires any trust-administrative role (admin, trustee, arbiter). Use for trust-administration endpoints. */
export async function requireTrustAdmin(req: Request): Promise<AppUser> {
    return requireAuth(req, [...TRUST_ADMIN_ROLES])
}
