import { ApiError } from './api-error'
import { type AppUser, authServer, extractClientIP } from './auth'
import { recordAuthEvent } from './auth-events'
import { logger } from './logger'

// Request-scoped session cache (garbage collected with request)
const sessionCache = new WeakMap<
    Request,
    Promise<{ user: AppUser; session: unknown } | null>
>()

/**
 * Get session with request-level caching
 * Prevents duplicate database queries within same request
 */
async function getCachedSession(req: Request) {
    // Check cache first
    if (sessionCache.has(req)) {
        return sessionCache.get(req)!
    }

    // Fetch and cache using Neon Auth
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

/**
 * Validates session and returns authenticated user
 * Enhanced with request-scoped caching, logging, and audit trail
 * @throws ApiError.unauthorized() if no valid session
 */
export async function requireAuth(
    req: Request,
    allowedRoles?: Array<'admin' | 'beneficiary'>,
): Promise<AppUser> {
    const url = new URL(req.url)
    // VULN-013 FIX: Use validated IP extraction
    const ip = extractClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    try {
        const session = await getCachedSession(req)

        if (!session) {
            // Record failed auth attempt
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

        // Role validation
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            // Record permission denied
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

        // Log successful access (debug level to avoid spam)
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

/**
 * Requires admin role
 */
export async function requireAdmin(req: Request): Promise<AppUser> {
    return requireAuth(req, ['admin'])
}

/**
 * Requires beneficiary role
 */
export async function requireBeneficiary(req: Request): Promise<AppUser> {
    return requireAuth(req, ['beneficiary'])
}

/**
 * Checks if route is public (no auth required)
 */
export function isPublicRoute(path: string): boolean {
    const publicPaths = [
        '/health',
        '/api/auth/', // Neon Auth endpoints
    ]
    return publicPaths.some((p) => path.startsWith(p))
}
