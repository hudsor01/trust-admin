import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

// Decimal money literal: optional sign, digits, optional decimal portion.
// Rejects "abc", "", "1e9", "NaN" — all of which parseFloat would coerce
// into NaN or a value that toFixed(4) stringifies as "NaN", which
// Postgres accepts as a valid 'NaN'::numeric. We never want that row.
const MONEY_REGEX = /^-?\d+(\.\d+)?$/

export const valuationCorrectionRouter = createTRPCRouter({
    record: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                itemName: z.string(),
                category: z.string(),
                aiEstimatedValue: z.string().regex(MONEY_REGEX),
                correctedValue: z.string().regex(MONEY_REGEX),
                notes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const aiVal = parseFloat(input.aiEstimatedValue)
            const correctedVal = parseFloat(input.correctedValue)
            // Stored for potential future trend analysis (e.g. systematic
            // over/under-valuation). Drizzle reads numeric columns as
            // string per the codebase convention — toFixed(4) matches
            // the column's scale.
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
