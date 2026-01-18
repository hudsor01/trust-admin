/**
 * Root tRPC Router
 *
 * Merges all resource routers into a single appRouter.
 * This is the type exported for client-side inference.
 */
import { createTRPCRouter } from './index'

// Import all resource routers
import { activityLogRouter } from './routers/activityLog'
import { artworkRouter } from './routers/artwork'
import { bankAccountRouter } from './routers/bankAccount'
import { beneficiaryRouter } from './routers/beneficiary'
import { contactRouter } from './routers/contact'
import { distributionRouter } from './routers/distribution'
import { documentRouter } from './routers/document'
import { entityRouter } from './routers/entity'
import { hemsRequestRouter } from './routers/hemsRequest'
import { homesteadRouter } from './routers/homestead'
import { investmentAccountRouter } from './routers/investmentAccount'
import { liabilityRouter } from './routers/liability'
import { liabilityPaymentRouter } from './routers/liabilityPayment'
import { personalPropertyRouter } from './routers/personalProperty'
import { rentalPropertyRouter } from './routers/rentalProperty'
import { specificBequestRouter } from './routers/specificBequest'
import { taskRouter } from './routers/task'
import { trustAccountingRouter } from './routers/trustAccounting'
import { trusteeRouter } from './routers/trustee'
import { trusteeFeeEntryRouter } from './routers/trusteeFeeEntry'
import { trusteeFeeScheduleRouter } from './routers/trusteeFeeSchedule'
import { valuationRouter } from './routers/valuation'
import { vehicleRouter } from './routers/vehicle'
import { withdrawalRecordRouter } from './routers/withdrawalRecord'

/**
 * Root router - merges all resource routers
 *
 * Usage in components:
 *   trpc.entity.list.useQuery()
 *   trpc.liability.recordPayment.useMutation()
 *   trpc.hemsRequest.approve.useMutation()
 */
export const appRouter = createTRPCRouter({
    // Core
    entity: entityRouter,
    beneficiary: beneficiaryRouter,
    contact: contactRouter,
    task: taskRouter,

    // Assets
    bankAccount: bankAccountRouter,
    investmentAccount: investmentAccountRouter,
    vehicle: vehicleRouter,
    homestead: homesteadRouter,
    rentalProperty: rentalPropertyRouter,
    artwork: artworkRouter,
    personalProperty: personalPropertyRouter,

    // Liabilities
    liability: liabilityRouter,
    liabilityPayment: liabilityPaymentRouter,

    // Accounting
    trustAccounting: trustAccountingRouter,
    valuation: valuationRouter,

    // Beneficiary & Distributions
    hemsRequest: hemsRequestRouter,
    distribution: distributionRouter,
    specificBequest: specificBequestRouter,
    withdrawalRecord: withdrawalRecordRouter,

    // Trustees & Fees
    trustee: trusteeRouter,
    trusteeFeeSchedule: trusteeFeeScheduleRouter,
    trusteeFeeEntry: trusteeFeeEntryRouter,

    // Documents & Audit
    document: documentRouter,
    activityLog: activityLogRouter,
})

// Export type for client-side inference
export type AppRouter = typeof appRouter
