/**
 * tRPC Server Initialization
 *
 * Sets up tRPC with context, base procedures, and error handling.
 * Used by all routers in server/trpc/routers/
 *
 * Role source of truth: userProfile.role (app-managed)
 * - "admin" = full admin access
 * - "beneficiary" = beneficiary portal access
 * - "user" = fallback for users without a userProfile record
 *
 * Note: Neon Auth native role (session.user.role) is only used by
 * layout guards for routing. tRPC authorization uses userProfile.role.
 */
import * as Sentry from '@sentry/nextjs'
import { initTRPC, TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { getPublicDb, setRequestAuthToken } from '@/db'
import { userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth/server'
import { clearSentryUser, setSentryUser } from '@/lib/sentry'

const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? ''

/**
 * App user type - uses userProfile.role as source of truth for authorization
 */
export type AppUser = {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
    // Role from userProfile table: "admin", "beneficiary", or "user" (fallback)
    role: 'admin' | 'beneficiary' | 'user'
    // App-specific: links user to beneficiary record (from userProfile table)
    beneficiaryId: number | null
    // Flag set when admin provisions/resets password — forces change on first login
    forcePasswordChange: boolean
}

/**
 * Module-level JWT cache for Neon Authorize tokens.
 *
 * authServer.token() makes a network call to Neon Auth on every tRPC request.
 * Caching reduces calls to the Neon Auth service and makes the system more
 * resilient to transient failures (rate limits, network blips, etc.).
 *
 * Key: Better Auth session token (opaque). TTL: 4 minutes (< 5-minute session cache TTL).
 */
const jwtCache = new Map<string, { token: string; expiresAt: number }>()
const JWT_CACHE_TTL_MS = 4 * 60 * 1000 // 4 minutes

// Prune expired entries every 5 minutes to prevent memory leaks
setInterval(
    () => {
        const now = Date.now()
        for (const [key, { expiresAt }] of jwtCache.entries()) {
            if (expiresAt <= now) jwtCache.delete(key)
        }
    },
    5 * 60 * 1000,
)

/**
 * Fetch a Neon Authorize JWT for the given session token.
 * Uses a module-level cache to avoid calling authServer.token() on every request.
 * Retries once on failure to handle transient Neon Auth service issues.
 */
async function fetchJwt(sessionToken: string): Promise<string | null> {
    const now = Date.now()
    const cached = jwtCache.get(sessionToken)
    if (cached && cached.expiresAt > now) return cached.token

    let result = await authServer.token()
    let token = result.data?.token ?? null

    if (!token) {
        // Retry once after brief delay to handle transient Neon Auth issues
        await new Promise<void>((r) => setTimeout(r, 200))
        result = await authServer.token()
        token = result.data?.token ?? null
    }

    if (token) {
        jwtCache.set(sessionToken, { token, expiresAt: now + JWT_CACHE_TTL_MS })
    } else {
        Sentry.addBreadcrumb({
            category: 'auth',
            message: 'authServer.token() returned null after retry',
            data: { error: result.error },
            level: 'error',
        })
    }

    return token
}

/**
 * Context creation for each request
 * Uses userProfile.role as source of truth for tRPC authorization.
 *
 * IMPORTANT: This fetches a JWT from Neon Auth's /token endpoint and passes
 * it to setRequestAuthToken() so that auth.user_id() returns the correct
 * user ID in RLS policies.
 */
export async function createContext(_opts: { headers: Headers }) {
    const { data: session } = await authServer.getSession()

    // If we have a session, initialize JWT for RLS and fetch beneficiary link
    let appUser: AppUser | null = null
    if (session?.user && session?.session?.token) {
        // Fetch JWT and userProfile in parallel — both can start as soon as we
        // have a session. The JWT is needed for RLS (setRequestAuthToken);
        // userProfile uses getPublicDb() (BYPASSRLS) so it doesn't need the JWT.
        const publicDb = getPublicDb()
        let jwtToken: string | null
        let profileRows: {
            role: 'admin' | 'beneficiary' | 'user'
            beneficiaryId: number | null
            forcePasswordChange: boolean
        }[]
        try {
            ;[jwtToken, profileRows] = await Promise.all([
                fetchJwt(session.session.token),
                publicDb
                    .select({
                        role: userProfile.role,
                        beneficiaryId: userProfile.beneficiaryId,
                        forcePasswordChange: userProfile.forcePasswordChange,
                    })
                    .from(userProfile)
                    .where(eq(userProfile.userId, session.user.id))
                    .limit(1),
            ])
        } catch (error) {
            Sentry.captureException(error, {
                level: 'fatal',
                tags: { subsystem: 'rls', userId: session.user.id },
                extra: { action: 'jwt_fetch_for_rls' },
            })
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Authentication system error. Please try again.',
            })
        }

        if (!jwtToken) {
            const err = new Error('JWT token was null after fetch and retry')
            Sentry.captureException(err, {
                level: 'fatal',
                tags: { subsystem: 'rls', userId: session.user.id },
            })
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Authentication system error. Please try again.',
            })
        }

        // Set JWT for RLS enforcement via Neon Authorize.
        // Binds the JWT to the current async context so all neon() HTTP queries
        // in this request run as the `authenticated` role — making RLS apply.
        setRequestAuthToken(jwtToken)

        const [profile] = profileRows

        // Determine role — owner email always gets admin regardless of DB state
        let role: 'admin' | 'beneficiary' | 'user' = 'user'
        if (session.user.email === OWNER_EMAIL) {
            role = 'admin'
        } else if (profile) {
            role = profile.role
        }

        // Build app user with userProfile role
        appUser = {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
            image: session.user.image,
            createdAt: session.user.createdAt,
            updatedAt: session.user.updatedAt,
            role,
            beneficiaryId: profile?.beneficiaryId ?? null,
            forcePasswordChange: profile?.forcePasswordChange ?? false,
        }

        // Set Sentry user context for error tracking and performance monitoring
        setSentryUser({
            id: session.user.id,
            email: session.user.email,
            role,
            beneficiaryId: profile?.beneficiaryId ?? null,
        })
    } else {
        // Clear Sentry user context when no session
        clearSentryUser()
    }

    return {
        session,
        user: appUser,
    }
}

export type Context = Awaited<ReturnType<typeof createContext>>

/**
 * Initialize tRPC with context and error formatting
 */
const t = initTRPC.context<Context>().create({
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.cause instanceof ZodError
                        ? error.cause.flatten()
                        : null,
            },
        }
    },
})

/**
 * Router and procedure exports
 */
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/**
 * Public procedure - no auth required
 * Use for health checks, public data
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authenticated user
 * Use for most operations (admin or beneficiary)
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to perform this action',
        })
    }

    return next({
        ctx: {
            session: ctx.session,
            user: ctx.user,
        },
    })
})

/**
 * Admin procedure - requires admin role
 * Use for administrative operations
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.user.role !== 'admin') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You must be an admin to perform this action',
        })
    }

    return next({ ctx })
})

/**
 * Owner procedure - requires the trust owner (rhudsontspr@gmail.com)
 * Use for sensitive operations like user management CRUD
 */
export const ownerProcedure = adminProcedure.use(async ({ ctx, next }) => {
    if (ctx.user.email !== OWNER_EMAIL) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the trust owner can perform this action',
        })
    }

    return next({ ctx })
})

/**
 * Beneficiary procedure - requires beneficiary role
 * Use for beneficiary portal operations
 */
export const beneficiaryProcedure = protectedProcedure.use(
    async ({ ctx, next }) => {
        if (ctx.user.role !== 'beneficiary') {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'This action is only available to beneficiaries',
            })
        }

        return next({ ctx })
    },
)
