import { eq } from 'drizzle-orm'
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
                accountingEntries,
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
                    .where(eq(trustAccounting.entityId, entityId)),
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
                db.select().from(task),
            ])

            return {
                beneficiaries,
                withdrawalRecords,
                accountingEntries,
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
})
