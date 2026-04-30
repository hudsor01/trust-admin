/**
 * tRPC initialization, context, and base procedures.
 *
 * Role source of truth: userProfile.role (not Neon Auth session.user.role, which
 * is only used by layout guards for routing).
 */
import * as Sentry from '@sentry/nextjs'
import { initTRPC, TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { getPublicDb, setRequestAuthToken } from '@/db'
import { userProfile } from '@/db/schema'
import { type AppRole, TRUST_ADMIN_ROLES } from '@/lib/auth'
import { authServer } from '@/lib/auth/server'
import { env } from '@/lib/env'
import { clearSentryUser, setSentryUser } from '@/lib/sentry'

const OWNER_EMAIL = env.ADMIN_EMAIL

export type AppUser = {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
    role: AppRole
    beneficiaryId: number | null
    forcePasswordChange: boolean
}

/**
 * JWT cache — avoids calling authServer.token() (network hop to Neon Auth) per request.
 * TTL 4 min (under Neon's 5 min session cache). .unref() on the pruning interval prevents
 * the timer from keeping serverless functions alive.
 */
const jwtCache = new Map<string, { token: string; expiresAt: number }>()
const JWT_CACHE_TTL_MS = 4 * 60 * 1000

setInterval(
    () => {
        const now = Date.now()
        for (const [key, { expiresAt }] of jwtCache.entries()) {
            if (expiresAt <= now) jwtCache.delete(key)
        }
    },
    5 * 60 * 1000,
).unref()

/** Cached JWT fetch with single retry for transient Neon Auth failures. */
async function fetchJwt(sessionToken: string): Promise<string | null> {
    const now = Date.now()
    const cached = jwtCache.get(sessionToken)
    if (cached && cached.expiresAt > now) return cached.token

    let result = await authServer.token()
    let token = result.data?.token ?? null

    if (!token) {
        // Single retry for rate limits / transient network errors
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

/** Per-request context: fetches JWT for RLS + resolves userProfile role. */
export async function createContext(_opts: { headers: Headers }) {
    const { data: session } = await authServer.getSession()

    let appUser: AppUser | null = null
    if (session?.user && session?.session?.token) {
        // Parallel: JWT (for RLS) + userProfile (via BYPASSRLS, no JWT needed)
        const publicDb = getPublicDb()
        let jwtToken: string | null
        let profileRows: {
            role: AppRole
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

        setRequestAuthToken(jwtToken)

        const [profile] = profileRows

        // ADMIN_EMAIL override: owner is always admin regardless of DB state
        let role: AppRole = 'user'
        if (session.user.email === OWNER_EMAIL) {
            role = 'admin'
        } else if (profile) {
            role = profile.role
        }

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

        setSentryUser({
            id: session.user.id,
            email: session.user.email,
            role,
            beneficiaryId: profile?.beneficiaryId ?? null,
        })
    } else {
        clearSentryUser()
    }

    return {
        session,
        user: appUser,
    }
}

export type Context = Awaited<ReturnType<typeof createContext>>

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

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/** No auth required. */
export const publicProcedure = t.procedure

/** Requires authenticated session. */
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
 * Requires a trust-administrative role: admin, trustee, or arbiter.
 *
 * Most domain routers (assets, liabilities, accounting, distributions, …)
 * use this — trust administration is the shared scope across these roles.
 * For operations that should be admin-only (user management), use
 * {@link strictAdminProcedure} or {@link ownerProcedure}.
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (!(TRUST_ADMIN_ROLES as readonly string[]).includes(ctx.user.role)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You must be a trust administrator to perform this action',
        })
    }

    return next({ ctx })
})

/** Requires the literal 'admin' role — excludes trustee and arbiter. */
export const strictAdminProcedure = protectedProcedure.use(
    async ({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You must be an admin to perform this action',
            })
        }

        return next({ ctx })
    },
)

/** Requires ADMIN_EMAIL — for sensitive ops like user management. */
export const ownerProcedure = strictAdminProcedure.use(
    async ({ ctx, next }) => {
        if (ctx.user.email !== OWNER_EMAIL) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Only the trust owner can perform this action',
            })
        }

        return next({ ctx })
    },
)

/** Requires beneficiary role. */
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
