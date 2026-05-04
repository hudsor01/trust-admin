import { createTRPCRouter } from './init'

import { activityLogRouter } from './routers/activityLog'
import { assetRouter } from './routers/asset'
import { bankAccountRouter } from './routers/bankAccount'
import { beneficiaryRouter } from './routers/beneficiary'
import { contactRouter } from './routers/contact'
import { dashboardRouter } from './routers/dashboard'
import { distributionRouter } from './routers/distribution'
import { entityRouter } from './routers/entity'
import { hemsRequestRouter } from './routers/hemsRequest'
import { homesteadRouter } from './routers/homestead'
import { insurancePolicyRouter } from './routers/insurancePolicy'
import { investmentAccountRouter } from './routers/investmentAccount'
import { liabilityRouter } from './routers/liability'
import { liabilityPaymentRouter } from './routers/liabilityPayment'
import { personalPropertyRouter } from './routers/personalProperty'
import { rentalPropertyRouter } from './routers/rentalProperty'
import { specificBequestRouter } from './routers/specificBequest'
import { taskRouter } from './routers/task'
import { trustAccountingRouter } from './routers/trustAccounting'
import { trusteeRouter } from './routers/trustee'
import { userManagementRouter } from './routers/userManagement'
import { valuationRouter } from './routers/valuation'
import { valuationCorrectionRouter } from './routers/valuationCorrection'
import { vehicleRouter } from './routers/vehicle'
import { withdrawalRecordRouter } from './routers/withdrawalRecord'

export const appRouter = createTRPCRouter({
    // Core / Auth
    entity: entityRouter,
    beneficiary: beneficiaryRouter,
    contact: contactRouter,

    // Assets (pure CRUD)
    bankAccount: bankAccountRouter,
    investmentAccount: investmentAccountRouter,
    homestead: homesteadRouter,
    rentalProperty: rentalPropertyRouter,
    vehicle: vehicleRouter,
    personalProperty: personalPropertyRouter,
    insurancePolicy: insurancePolicyRouter,
    trustee: trusteeRouter,
    specificBequest: specificBequestRouter,
    task: taskRouter,

    // Liabilities (multi-table transactions)
    liability: liabilityRouter,
    liabilityPayment: liabilityPaymentRouter,

    // Accounting (complex ledger logic)
    trustAccounting: trustAccountingRouter,
    valuation: valuationRouter,
    valuationCorrection: valuationCorrectionRouter,

    // Beneficiary workflows
    hemsRequest: hemsRequestRouter,
    distribution: distributionRouter,
    withdrawalRecord: withdrawalRecordRouter,

    // Audit & inventory
    activityLog: activityLogRouter,

    // User management
    userManagement: userManagementRouter,

    // Aggregate queries
    dashboard: dashboardRouter,
    asset: assetRouter,
})

export type AppRouter = typeof appRouter
