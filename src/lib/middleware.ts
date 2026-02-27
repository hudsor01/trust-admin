import { ApiError } from './api-error'
import { type AppUser, authServer, extractClientIP } from './auth'
import { recordAuthEvent } from './auth-events'
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
export async function requireAuth(
    req: Request,
    allowedRoles?: Array<'admin' | 'beneficiary' | 'user'>,
): Promise<AppUser> {
    const url = new URL(req.url)
    // VULN-013 FIX: Use validated IP extraction
    const ip = extractClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    try {
        const session = await getCachedSession(req)

        if (!session) {
            recordAuthEvent('FAILED_AUTH', null, {
                path: url.pathname,
                ip,
                userAgent,
                reason: 'No session cookie',
            })

            logger.auth.warn('Unauthenticated access attempt', {
                path: url.pathname,
                method: req.method,
                ip,
            })
            throw ApiError.unauthorized('Authentication required')
        }

        const { user } = session

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            recordAuthEvent('ACCESS_DENIED', user.id, {
                path: url.pathname,
                ip,
                userAgent,
                reason: `Role ${user.role} not in [${allowedRoles.join(', ')}]`,
            })

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

/** Requires admin role. */
export async function requireAdmin(req: Request): Promise<AppUser> {
    return requireAuth(req, ['admin'])
}

/** Requires beneficiary role. */
export async function requireBeneficiary(req: Request): Promise<AppUser> {
    return requireAuth(req, ['beneficiary'])
}

/** Checks if route is public (no auth required). */
export function isPublicRoute(path: string): boolean {
    const publicPaths = ['/health', '/api/auth/']
    return publicPaths.some((p) => path.startsWith(p))
}
