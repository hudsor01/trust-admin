import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { firearm } from '@/db/schema'
import { insertFirearmSchema, insertFirearmSchemaBase } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

/**
 * Translate the Postgres 23505 (unique_violation) on the `firearm_serial_number_key`
 * unique index into a tRPC CONFLICT. Mirrors `isBeneficiaryLinkUniqueViolation` in
 * userManagement.ts — the canonical precedent for constraint-name-matched 23505
 * remapping in this codebase.
 */
function isFirearmSerialConflict(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505' &&
        'constraint' in err &&
        (err as { constraint?: string }).constraint ===
            'firearm_serial_number_key'
    )
}

export const firearmRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(({ input }) =>
            db
                .select()
                .from(firearm)
                .where(eq(firearm.entityId, input.entityId)),
        ),

    byId: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .query(async ({ input }) => {
            const result = await db.query.firearm.findFirst({
                where: and(
                    eq(firearm.id, input.id),
                    eq(firearm.entityId, input.entityId),
                ),
                with: { entity: true, valuations: true, documents: true },
            })
            if (!result)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Firearm not found in this entity',
                })
            return result
        }),

    create: adminProcedure
        .input(insertFirearmSchema)
        .mutation(async ({ input }) => {
            try {
                const [created] = await db
                    .insert(firearm)
                    .values({
                        ...input,
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                if (!created)
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create firearm',
                    })
                return created
            } catch (err) {
                if (isFirearmSerialConflict(err))
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message:
                            'A firearm with this serial number already exists.',
                    })
                throw err
            }
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                // D-03: nfaTransferStatus is OMITTED from the generic update path.
                // Zod v4 forbids .omit() on refined schemas, so we omit BEFORE refining,
                // then re-apply the "at least one field" refine (the NFA-conditional
                // refine is dropped on the partial path — the DB CHECK is the
                // defense-in-depth for that constraint).
                data: insertFirearmSchemaBase
                    .omit({ nfaTransferStatus: true })
                    .partial()
                    .refine(
                        (data) =>
                            Object.values(data).some((v) => v !== undefined),
                        {
                            message:
                                'Update requires at least one field to be provided',
                        },
                    ),
            }),
        )
        .mutation(async ({ input }) => {
            try {
                const [updated] = await db
                    .update(firearm)
                    .set({
                        ...input.data,
                        updatedAt: new Date().toISOString(),
                    })
                    .where(
                        and(
                            eq(firearm.id, input.id),
                            eq(firearm.entityId, input.entityId),
                        ),
                    )
                    .returning()
                if (!updated)
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Firearm not found in this entity',
                    })
                return updated
            } catch (err) {
                // Re-throw TRPCError instances FIRST so the inner NOT_FOUND is not
                // rewrapped as CONFLICT (Pitfall 2 from 29-RESEARCH.md).
                if (err instanceof TRPCError) throw err
                if (isFirearmSerialConflict(err))
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message:
                            'A firearm with this serial number already exists.',
                    })
                throw err
            }
        }),

    delete: adminProcedure
        .input(z.object({ id: z.coerce.number(), entityId: z.coerce.number() }))
        .mutation(async ({ input }) => {
            const [deleted] = await db
                .delete(firearm)
                .where(
                    and(
                        eq(firearm.id, input.id),
                        eq(firearm.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!deleted)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Firearm not found in this entity',
                })
            return deleted
        }),

    /**
     * Set the ATF Form 5 transfer status on an NFA firearm. Dedicated CQS-style
     * mutation distinct from generic `update` — D-02 — mirrors hemsRequest.approve /
     * markDistributed's preflight-then-update shape. NFA legal correctness
     * requires that this field cannot be set on a non-NFA firearm (T-29-NFA).
     */
    setNfaTransferStatus: adminProcedure
        .input(
            z.object({
                id: z.coerce.number(),
                entityId: z.coerce.number(),
                status: z.enum(['NOT_FILED', 'FILED', 'APPROVED']),
                taxStampDate: z.string().datetime().optional(),
                atfControlNumber: z.string().trim().min(1).optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const existing = await db.query.firearm.findFirst({
                where: and(
                    eq(firearm.id, input.id),
                    eq(firearm.entityId, input.entityId),
                ),
            })
            if (!existing)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Firearm not found in this entity',
                })
            if (!existing.isNfa)
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message:
                        'Cannot set NFA transfer status on a non-NFA firearm',
                })

            const updates: Record<string, unknown> = {
                nfaTransferStatus: input.status,
                updatedAt: new Date().toISOString(),
            }
            if (input.taxStampDate !== undefined)
                updates.taxStampDate = input.taxStampDate
            if (input.atfControlNumber !== undefined)
                updates.atfControlNumber = input.atfControlNumber

            const [updated] = await db
                .update(firearm)
                .set(updates)
                .where(
                    and(
                        eq(firearm.id, input.id),
                        eq(firearm.entityId, input.entityId),
                    ),
                )
                .returning()
            if (!updated)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update NFA transfer status',
                })
            return updated
        }),
})
