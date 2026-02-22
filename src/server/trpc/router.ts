/**
 * Root tRPC Router
 *
 * Contains only routers with real business logic or cross-cutting concerns.
 * Pure CRUD tables are served directly via Neon Data API (PostgREST).
 */
import { createTRPCRouter } from './init'

import { activityLogRouter } from './routers/activityLog'
import { beneficiaryRouter } from './routers/beneficiary'
import { contactRouter } from './routers/contact'
import { distributionRouter } from './routers/distribution'
import { entityRouter } from './routers/entity'
import { hemsRequestRouter } from './routers/hemsRequest'
import { liabilityRouter } from './routers/liability'
import { liabilityPaymentRouter } from './routers/liabilityPayment'
import { pendingInventoryItemRouter } from './routers/pendingInventoryItem'
import { trustAccountingRouter } from './routers/trustAccounting'
import { userManagementRouter } from './routers/userManagement'
import { valuationRouter } from './routers/valuation'
import { withdrawalRecordRouter } from './routers/withdrawalRecord'

/**
 * Root router — business logic only.
 *
 * Pure-CRUD tables (vehicle, homestead, bankAccount, etc.) were removed and
 * are now accessed via Neon Data API + TanStack Query in the frontend.
 */
export const appRouter = createTRPCRouter({
    // Core / Auth
    entity: entityRouter,
    beneficiary: beneficiaryRouter,
    contact: contactRouter,

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
})

export type AppRouter = typeof appRouter
