/**
 * tRPC Server Initialization
 *
 * Sets up tRPC with context, base procedures, and error handling.
 * Used by all routers in server/trpc/routers/
 */
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError, z } from 'zod'
import { auth } from '@/lib/auth'

/**
 * Context creation for each request
 * Includes session info from Better Auth
 */
export async function createContext(opts: { headers: Headers }) {
    const session = await auth.api.getSession({
        headers: opts.headers,
    })

    return {
        session,
        user: session?.user ?? null,
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
 * @param config.crud - CRUD instance with getAllArray, getById, create, update, delete
 * @param config.insertSchema - Zod schema for create input validation
 * @param config.updateSchema - Zod schema for update input validation
 * @param config.getById - Optional custom getById function (for queries with relations)
 * @param config.listFilterKey - Optional custom filter key (default: 'entityId')
 */
interface CrudRouterConfig<TInsert, TUpdate> {
    crud: {
        getAllArray: (filterId?: number) => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        create: (data: TInsert) => Promise<unknown>
        update: (id: number, data: TUpdate) => Promise<unknown>
        delete: (id: number) => Promise<unknown>
    }
    insertSchema: z.ZodType<TInsert>
    updateSchema: z.ZodType<TUpdate>
    getById?: (id: number) => Promise<unknown>
    listFilterKey?: string
}

export function createCrudRouter<TInsert, TUpdate>(
    config: CrudRouterConfig<TInsert, TUpdate>,
) {
    const {
        crud,
        insertSchema,
        updateSchema,
        getById,
        listFilterKey = 'entityId',
    } = config

    return createTRPCRouter({
        list: adminProcedure
            .input(
                z
                    .object({ [listFilterKey]: z.coerce.number().optional() })
                    .optional(),
            )
            .query(async ({ input }) =>
                crud.getAllArray(
                    input?.[listFilterKey as keyof typeof input] as
                        | number
                        | undefined,
                ),
            ),

        byId: adminProcedure
            .input(z.coerce.number())
            .query(async ({ input }) => (getById ?? crud.getById)(input)),

        create: adminProcedure
            .input(insertSchema)
            .mutation(async ({ input }) => crud.create(input as TInsert)),

        update: adminProcedure
            .input(z.object({ id: z.coerce.number(), data: updateSchema }))
            .mutation(async ({ input }) => crud.update(input.id, input.data)),

        delete: adminProcedure
            .input(z.coerce.number())
            .mutation(async ({ input }) => crud.delete(input)),
    })
}
