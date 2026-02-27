import { createTRPCRouter } from './init'

import { activityLogRouter } from './routers/activityLog'
import { bankAccountRouter } from './routers/bankAccount'
import { beneficiaryRouter } from './routers/beneficiary'
import { contactRouter } from './routers/contact'
import { dashboardRouter } from './routers/dashboard'
import { distributionRouter } from './routers/distribution'
import { entityRouter } from './routers/entity'
import { hemsRequestRouter } from './routers/hemsRequest'
import { homesteadRouter } from './routers/homestead'
import { investmentAccountRouter } from './routers/investmentAccount'
import { liabilityRouter } from './routers/liability'
import { liabilityPaymentRouter } from './routers/liabilityPayment'
import { pendingInventoryItemRouter } from './routers/pendingInventoryItem'
import { rentalPropertyRouter } from './routers/rentalProperty'
import { taskRouter } from './routers/task'
import { trustAccountingRouter } from './routers/trustAccounting'
import { userManagementRouter } from './routers/userManagement'
import { valuationRouter } from './routers/valuation'
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
    task: taskRouter,

    // Liabilities (multi-table transactions)
    liability: liabilityRouter,
    liabilityPayment: liabilityPaymentRouter,

    // Accounting (complex ledger logic)
    trustAccounting: trustAccountingRouter,
    valuation: valuationRouter,

    // Beneficiary workflows
    hemsRequest: hemsRequestRouter,
    distribution: distributionRouter,
    withdrawalRecord: withdrawalRecordRouter,

    // Audit & inventory
    activityLog: activityLogRouter,
    pendingInventoryItem: pendingInventoryItemRouter,

    // User management
    userManagement: userManagementRouter,

    // Aggregate queries
    dashboard: dashboardRouter,
})

export type AppRouter = typeof appRouter
