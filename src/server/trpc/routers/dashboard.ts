import { and, count, desc, eq, sql, sum } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    bankAccount,
    beneficiary,
    hemsRequest,
    homestead,
    investmentAccount,
    liability,
    rentalProperty,
    task,
    trustAccounting,
    vehicle,
    withdrawalRecord,
} from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

export const dashboardRouter = createTRPCRouter({
    summary: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input: { entityId } }) => {
            const [
                beneficiaries,
                withdrawalRecords,
                recentIncomeEntries,
                recentExpenseEntries,
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
                tasks,
            ] = await Promise.all([
                db
                    .select()
                    .from(beneficiary)
                    .where(eq(beneficiary.entityId, entityId)),
                db
                    .select()
                    .from(withdrawalRecord)
                    .where(eq(withdrawalRecord.entityId, entityId)),
                db
                    .select()
                    .from(trustAccounting)
                    .where(
                        and(
                            eq(trustAccounting.entityId, entityId),
                            eq(trustAccounting.entryType, 'INCOME'),
                        ),
                    )
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(10),
                db
                    .select()
                    .from(trustAccounting)
                    .where(
                        and(
                            eq(trustAccounting.entityId, entityId),
                            eq(trustAccounting.entryType, 'EXPENSE'),
                        ),
                    )
                    .orderBy(desc(trustAccounting.accountingDate))
                    .limit(10),
                db
                    .select()
                    .from(hemsRequest)
                    .where(eq(hemsRequest.entityId, entityId)),
                db
                    .select()
                    .from(bankAccount)
                    .where(eq(bankAccount.entityId, entityId)),
                db
                    .select()
                    .from(investmentAccount)
                    .where(eq(investmentAccount.entityId, entityId)),
                db
                    .select()
                    .from(homestead)
                    .where(eq(homestead.entityId, entityId)),
                db
                    .select()
                    .from(rentalProperty)
                    .where(eq(rentalProperty.entityId, entityId)),
                db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
                db
                    .select()
                    .from(liability)
                    .where(eq(liability.entityId, entityId)),
                // task table is global (no entityId column) -- intentional for single-trust app
                db.select().from(task),
            ])

            return {
                beneficiaries,
                withdrawalRecords,
                recentAccountingEntries: [
                    ...recentIncomeEntries,
                    ...recentExpenseEntries,
                ],
                hemsRequests,
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
                tasks,
            }
        }),

    summaryTotals: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input: { entityId } }) => {
            const rows = await db
                .select({
                    entryType: trustAccounting.entryType,
                    total: sql<string>`COALESCE(${sum(trustAccounting.amount)}, '0')`,
                    entryCount: count(),
                })
                .from(trustAccounting)
                .where(eq(trustAccounting.entityId, entityId))
                .groupBy(trustAccounting.entryType)

            let incomeTotal = '0'
            let expenseTotal = '0'
            let incomeCount = 0
            let expenseCount = 0

            for (const row of rows) {
                if (row.entryType === 'INCOME') {
                    incomeTotal = row.total
                    incomeCount = row.entryCount
                } else if (row.entryType === 'EXPENSE') {
                    expenseTotal = row.total
                    expenseCount = row.entryCount
                }
            }

            return { incomeTotal, expenseTotal, incomeCount, expenseCount }
        }),
})
