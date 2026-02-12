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
import { ZodError, z } from 'zod'
import { authServer } from '@/lib/auth'
import { OWNER_EMAIL } from '@/lib/constants'
import { clearSentryUser, setSentryUser } from '@/lib/sentry'
import { getPublicDb, initJwtSession, setRequestAuthToken } from '../../../db'
import { userProfile } from '../../../db/schema'

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
}

/**
 * Context creation for each request
 * Uses userProfile.role as source of truth for tRPC authorization.
 *
 * IMPORTANT: This fetches a JWT from Neon Auth's /token endpoint and passes
 * it to setRequestAuthToken() + initJwtSession() so that auth.user_id()
 * returns the correct user ID in RLS policies.
 */
export async function createContext(_opts: { headers: Headers }) {
    const { data: session } = await authServer.getSession()

    // If we have a session, initialize JWT for RLS and fetch beneficiary link
    let appUser: AppUser | null = null
    if (session?.user && session?.session?.token) {
        // Fetch JWT from Neon Auth for RLS enforcement via Neon Authorize.
        // session.session.token is an opaque session token, NOT a JWT.
        // The /token endpoint returns a signed JWT with the user's sub claim.
        let jwtToken: string | null = null
        try {
            const { data: tokenData } = await authServer.token()
            jwtToken = tokenData?.token ?? null
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
            const err = new Error('JWT token was null after successful fetch')
            Sentry.captureException(err, {
                level: 'fatal',
                tags: { subsystem: 'rls', userId: session.user.id },
            })
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Authentication system error. Please try again.',
            })
        }

        if (jwtToken) {
            // Set JWT for RLS enforcement via Neon Authorize
            // This binds the JWT to the current async context so all neon() HTTP
            // queries in this request run as the `authenticated` role with
            // auth.user_id() set — making RLS policies apply.
            setRequestAuthToken(jwtToken)

            // Also initialize JWT on postgres.js client (for raw SQL/tests)
            try {
                await initJwtSession(jwtToken)
            } catch (error) {
                Sentry.captureException(error, {
                    level: 'error',
                    tags: { subsystem: 'rls', userId: session.user.id },
                    extra: { action: 'init_jwt_session' },
                })
                // neon HTTP still has authToken via setRequestAuthToken, so this is degraded but not bypassed
                // Log but don't throw — the HTTP driver path still enforces RLS
            }
        }

        // Fetch role and beneficiaryId from userProfile (app-managed)
        // Uses public DB (bypasses RLS) because this is a system-level bootstrap
        // query — we need the user's role to set up auth context BEFORE RLS can work.
        const publicDb = getPublicDb()
        const [profile] = await publicDb
            .select({
                role: userProfile.role,
                beneficiaryId: userProfile.beneficiaryId,
            })
            .from(userProfile)
            .where(eq(userProfile.userId, session.user.id))
            .limit(1)

        // Determine role from userProfile (source of truth for tRPC authorization)
        // - If userProfile exists: use profile.role ("admin" or "beneficiary")
        // - If no profile but Neon Auth role is "admin": use "admin" (backwards compat)
        // - Otherwise: "user" fallback (no beneficiary access)
        let role: 'admin' | 'beneficiary' | 'user' = 'user'
        if (profile) {
            role = profile.role
        } else if (session.user.role === 'admin') {
            role = 'admin'
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

/**
 * CRUD Router Factory
 *
 * Creates a standard CRUD router with 5 procedures:
 * - list: Get all records (optionally filtered by entityId)
 * - byId: Get a single record by ID
 * - create: Create a new record
 * - update: Update an existing record
 * - delete: Delete a record
 *
 * Type inference works by passing the crud instance - TypeScript infers all types
 * from the CRUD methods automatically.
 *
 * @param config.crud - CRUD instance with getAllArray, getById, create, update, delete
 * @param config.insertSchema - Zod schema for create input validation
 * @param config.updateSchema - Zod schema for update input validation
 * @param config.getById - Optional custom getById function (for queries with relations)
 * @param config.listFilterKey - Optional custom filter key (default: 'entityId')
 */
export function createCrudRouter<
    TModel,
    TInsert,
    TUpdate,
    TGetById = TModel | undefined,
>(config: {
    crud: {
        getAllArray: (filterId?: number) => Promise<TModel[]>
        getById: (id: number) => Promise<TModel | undefined>
        create: (data: TInsert) => Promise<TModel>
        update: (
            id: number,
            data: Partial<TInsert>,
        ) => Promise<TModel | undefined>
        delete: (id: number) => Promise<TModel | undefined>
    }
    selectSchema: z.ZodType<TModel>
    insertSchema: z.ZodType<TInsert>
    updateSchema: z.ZodType<TUpdate>
    getById?: (id: number) => Promise<TGetById>
    getByIdSchema?: z.ZodType<TGetById>
    listFilterKey?: string
}) {
    const {
        crud,
        selectSchema,
        insertSchema,
        updateSchema,
        getById,
        getByIdSchema,
        listFilterKey = 'entityId',
    } = config

    return createTRPCRouter({
        list: adminProcedure
            .input(
                z
                    .object({ [listFilterKey]: z.coerce.number().optional() })
                    .optional(),
            )
            .output(z.array(selectSchema))
            .query(async ({ input }) =>
                crud.getAllArray(
                    input?.[listFilterKey as keyof typeof input] as
                        | number
                        | undefined,
                ),
            ),

        byId: adminProcedure
            .input(z.coerce.number())
            .output(getByIdSchema ?? selectSchema.nullable())
            .query(async ({ input }) =>
                getById ? getById(input) : crud.getById(input),
            ),

        create: adminProcedure
            .input(insertSchema)
            .output(selectSchema)
            .mutation(async ({ input }) => crud.create(input as TInsert)),

        update: adminProcedure
            .input(z.object({ id: z.coerce.number(), data: updateSchema }))
            .output(selectSchema.nullable())
            .mutation(async ({ input }) =>
                crud.update(input.id, input.data as Partial<TInsert>),
            ),

        delete: adminProcedure
            .input(z.coerce.number())
            .output(selectSchema.nullable())
            .mutation(async ({ input }) => crud.delete(input)),
    })
}
