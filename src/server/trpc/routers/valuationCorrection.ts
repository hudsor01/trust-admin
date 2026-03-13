import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

export const valuationCorrectionRouter = createTRPCRouter({
    record: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                itemName: z.string(),
                category: z.string(),
                aiEstimatedValue: z.string(),
                correctedValue: z.string(),
                notes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const aiVal = parseFloat(input.aiEstimatedValue)
            const correctedVal = parseFloat(input.correctedValue)
            const ratio = aiVal > 0 ? correctedVal / aiVal : 1.0
            await db.insert(valuationCorrection).values({
                ...input,
                correctionRatio: ratio,
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
