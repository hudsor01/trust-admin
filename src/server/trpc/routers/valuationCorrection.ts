import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { requiredCurrencyAmount } from '@/db/validation'
import { adminProcedure, createTRPCRouter } from '../init'

export const valuationCorrectionRouter = createTRPCRouter({
    record: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                itemName: z.string(),
                category: z.string(),
                // requiredCurrencyAmount enforces the same shape, 2-decimal,
                // magnitude bound used by the asset DOD-value columns.
                // Without it, parseFloat("abc") → NaN → toFixed(4) → "NaN"
                // → Postgres accepts 'NaN'::numeric and the row goes in.
                aiEstimatedValue: requiredCurrencyAmount,
                correctedValue: requiredCurrencyAmount,
                notes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const aiVal = parseFloat(input.aiEstimatedValue)
            const correctedVal = parseFloat(input.correctedValue)
            // Stored for potential future trend analysis (e.g. systematic
            // over/under-valuation). Drizzle reads numeric columns as
            // string per the codebase convention — toFixed(4) matches the
            // column's scale. Number.isFinite belt-and-suspenders so a
            // future schema relaxation can't silently put NaN in the DB.
            const ratio =
                aiVal > 0 && Number.isFinite(correctedVal)
                    ? correctedVal / aiVal
                    : 1.0
            const correctionRatio = (
                Number.isFinite(ratio) ? ratio : 1.0
            ).toFixed(4)
            await db.insert(valuationCorrection).values({
                ...input,
                correctionRatio,
            })
        }),

    recent: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                limit: z.number().default(10),
            }),
        )
        .query(async ({ input }) => {
            return db
                .select()
                .from(valuationCorrection)
                .where(eq(valuationCorrection.entityId, input.entityId))
                .orderBy(desc(valuationCorrection.createdAt))
                .limit(input.limit)
        }),
})
