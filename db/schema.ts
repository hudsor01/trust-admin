import { type SQL, sql } from 'drizzle-orm'
import {
    bigint,
    check,
    foreignKey,
    index,
    pgEnum,
    pgPolicy,
    pgTable,
    uniqueIndex,
} from 'drizzle-orm/pg-core'

// ============================================
// JSONB Type Definitions
// ============================================
type ActivityLogValues = Record<string, unknown>

// ============================================
// Enums (PostgreSQL Types)
// ============================================

// Generic status for lifecycle tracking (replaces accountStatus, entityStatus, assetStatus, liabilityStatus, policyStatus)
export const recordStatus = pgEnum('RecordStatus', [
    'ACTIVE',
    'INACTIVE',
    'OPEN',
    'PENDING',
    'CLOSED',
    'FROZEN',
    'SOLD',
    'TRANSFERRED',
    'DISPOSED',
    'PAID_OFF',
    'PAST_DUE',
    'COLLECTIONS',
    'DISPUTED',
    'WRITTEN_OFF',
    'LAPSED',
    'CANCELLED',
    'CLAIMED',
    'DISSOLVED',
])

// Asset and financial enums
export const distributionType = pgEnum('DistributionType', [
    'INCOME',
    'PRINCIPAL',
    'CAPITAL_GAIN',
    'EXPENSE_REIMBURSEMENT',
    'OTHER',
])
export const insurancePolicyType = pgEnum('InsurancePolicyType', [
    'LIFE',
    'PROPERTY',
    'AUTO',
    'UMBRELLA',
    'LIABILITY',
    'HEALTH',
    'OTHER',
])
export const liabilityType = pgEnum('LiabilityType', [
    'MORTGAGE',
    'LOAN',
    'CREDIT_CARD',
    'TAX_OWED',
    'ACCOUNTS_PAYABLE',
    'LEGAL_JUDGMENT',
    'OTHER',
])
export const paymentMethod = pgEnum('PaymentMethod', [
    'CHECK',
    'ACH',
    'WIRE',
    'CASH',
    'OTHER',
])
export const premiumFrequency = pgEnum('PremiumFrequency', [
    'MONTHLY',
    'QUARTERLY',
    'SEMI_ANNUAL',
    'ANNUAL',
])
export const propertyType = pgEnum('PropertyType', [
    'SINGLE_FAMILY',
    'MULTI_FAMILY',
    'CONDO',
    'TOWNHOUSE',
    'LAND',
    'COMMERCIAL',
    'MOBILE_HOME',
])
export const rentalStatus = pgEnum('RentalStatus', [
    'RENTED',
    'VACANT',
    'UNDER_RENOVATION',
    'LISTED',
])
export const titleStatus = pgEnum('TitleStatus', [
    'CLEAR',
    'LIEN',
    'PENDING_TRANSFER',
])
export const valuationType = pgEnum('ValuationType', [
    'APPRAISAL',
    'MARKET_ESTIMATE',
    'TAX_ASSESSED',
    'STATEMENT_BALANCE',
    'PURCHASE_PRICE',
    'BOOK_VALUE',
    'SELF_ASSESSED',
    'STATEMENT',
])

// Entity and trust enums
export const entityType = pgEnum('EntityType', [
    'TRUST',
    'LLC',
    'CORPORATION',
    'PARTNERSHIP',
    'INDIVIDUAL',
])
export const trustType = pgEnum('TrustType', ['REVOCABLE', 'IRREVOCABLE'])

// Beneficiary and distribution enums
export const relationshipType = pgEnum('RelationshipType', [
    'CHILD',
    'STEPCHILD',
    'GRANDCHILD',
    'OTHER',
])
export const distributionStandard = pgEnum('DistributionStandard', [
    'HEMS',
    'HEMS_PLUS_WITHDRAWAL',
    'BROADER',
    'WITHDRAWAL_ONLY',
])
export const hemsRequestStatus = pgEnum('HemsRequestStatus', [
    'PENDING',
    'APPROVED',
    'DENIED',
    'DISTRIBUTED',
    'CANCELLED',
])
export const withdrawalStatus = pgEnum('WithdrawalStatus', [
    'ELIGIBLE',
    'PARTIAL',
    'COMPLETE',
    'NOT_YET_ELIGIBLE',
])

// Trustee enums
export const trusteeStatus = pgEnum('TrusteeStatus', [
    'ACTIVE',
    'SUCCESSOR',
    'ARBITER',
    'RESIGNED',
    'REMOVED',
    'DECEASED',
])
export const trusteeFeeStatus = pgEnum('TrusteeFeeStatus', [
    'ACCRUED',
    'APPROVED',
    'PAID',
])

// Accounting enums
export const allocationClass = pgEnum('AllocationClass', [
    'PRINCIPAL',
    'INCOME',
])
export const transactionType = pgEnum('TransactionType', [
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'CAPITAL_IMPROVEMENT',
    'DEPRECIATION',
])
export const transferStatus = pgEnum('TransferStatus', [
    'PENDING',
    'STARTED',
    'COMPLETE',
])

// Trust accounting enums
export const accountingEntryType = pgEnum('AccountingEntryType', [
    'INCOME',
    'EXPENSE',
])
export const incomeType = pgEnum('IncomeType', [
    'DIVIDEND',
    'INTEREST',
    'RENT',
    'ROYALTY',
    'CAPITAL_GAIN',
    'SALE_PROCEEDS',
    'DISTRIBUTION',
    'INCOME_TO_PRINCIPAL_CONVERSION',
    'OTHER',
])
export const expenseType = pgEnum('ExpenseType', [
    'TAX',
    'INSURANCE',
    'MAINTENANCE',
    'REPAIR',
    'PROFESSIONAL_FEE',
    'TRUSTEE_FEE',
    'FILING_FEE',
    'UTILITY',
    'LEGAL',
    'OTHER',
])

// Personal property enum
export const personalPropertyCategory = pgEnum('PersonalPropertyCategory', [
    'JEWELRY',
    'ART',
    'COLLECTIBLES',
    'ELECTRONICS',
    'FURNITURE',
    'OTHER',
])

// Document enum
export const documentType = pgEnum('DocumentType', [
    'DEED',
    'TITLE',
    'STATEMENT',
    'CONTRACT',
    'LEGAL',
    'OTHER',
])

// Inventory submission enums
export const itemCondition = pgEnum('ItemCondition', [
    'excellent',
    'good',
    'fair',
    'poor',
])
export const submissionStatus = pgEnum('SubmissionStatus', [
    'PENDING',
    'APPROVED',
    'REJECTED',
])

// Auth and logging enums
export const logAction = pgEnum('LogAction', [
    'INSERT',
    'UPDATE',
    'DELETE',
    'SIGN_IN',
    'SIGN_OUT',
    'FAILED_AUTH',
    'ACCESS_DENIED',
])
export const userRole = pgEnum('UserRole', ['admin', 'beneficiary'])

// ============================================
// Activity Log (Audit Trail)
// ============================================

export const activityLog = pgTable(
    'activity_log',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        tableName: t.text().notNull(),
        recordId: t.text().notNull(),
        action: logAction().notNull(),
        oldValues: t.jsonb().$type<ActivityLogValues>(),
        newValues: t.jsonb().$type<ActivityLogValues>(),
        changedBy: t.text().default('system').notNull(),
        ipAddress: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        index('idx_activity_log_table_name').on(table.tableName),
        index('idx_activity_log_record_id').on(table.recordId),
        index('idx_activity_log_action').on(table.action),
        index('idx_activity_log_created_at').on(table.createdAt.desc()),
        // Composite index for audit lookups by table+record
        index('idx_activity_log_table_record').on(
            table.tableName,
            table.recordId,
        ),
        // BRIN index for append-only sequential data
        index('idx_activity_log_created_at_brin').using(
            'brin',
            table.createdAt,
        ),
        // GIN indexes for JSONB columns
        index('idx_activity_log_old_values_gin').using('gin', table.oldValues),
        index('idx_activity_log_new_values_gin').using('gin', table.newValues),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('audit-insert-own-user', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
            withCheck: sql`changed_by = app.effective_user_id()`,
        }),
    ],
).enableRLS()

export type ActivityLog = typeof activityLog.$inferSelect
export type InsertActivityLog = typeof activityLog.$inferInsert

// ============================================
// Entity (Trust/LLC/etc)
// ============================================

export const entity = pgTable(
    'entity',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        name: t.text().notNull(),
        entityType: entityType().notNull(),
        trustType: trustType(),
        grantorName: t.text(),
        decedent: t.text(),
        dod: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        originalDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        restatedDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        governingLaw: t.text(),
        hasNoContestClause: t.boolean().default(false),
        hasSpendthriftProvision: t.boolean().default(false),
        ein: t.text(),
        formationDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        stateOfFormation: t.text(),
        registeredAgent: t.text(),
        parentEntityId: bigint({ mode: 'number' }),
        ownershipPercent: t.numeric({ precision: 5, scale: 2 }), // Ownership stake (100.00 = 100%)
        dodValue: t.numeric({ precision: 14, scale: 2 }), // Value of entity/ownership at date of death
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        status: recordStatus().default('ACTIVE').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_entity_parent_entity_id').on(table.parentEntityId),
        index('idx_entity_status').on(table.status),
        foreignKey({
            columns: [table.parentEntityId],
            foreignColumns: [table.id],
            name: 'entity_parent_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Entity = typeof entity.$inferSelect
export type InsertEntity = typeof entity.$inferInsert

// ============================================
// Assets - Vehicles
// ============================================

export const vehicle = pgTable(
    'vehicle',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        year: t.integer().notNull(),
        make: t.text().notNull(),
        model: t.text().notNull(),
        vin: t.text().notNull(),
        color: t.text(),
        titleStatus: titleStatus().default('CLEAR').notNull(),
        licensePlate: t.text(),
        mileage: t.integer(),
        acquisitionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        dodValueType: valuationType(), // Consolidated - was dodValueType
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        uniqueIndex('Vehicle_vin_key').using(
            'btree',
            table.vin.asc().nullsLast().op('text_ops'),
        ),
        index('idx_vehicle_entity_id').on(table.entityId),
        index('idx_vehicle_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'vehicle_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Vehicle = typeof vehicle.$inferSelect
export type InsertVehicle = typeof vehicle.$inferInsert

// ============================================
// Assets - Homestead
// ============================================

export const homestead = pgTable(
    'homestead',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        streetAddress: t.text().notNull(),
        city: t.text().notNull(),
        state: t.text().notNull(),
        zip: t.text().notNull(),
        county: t.text(),
        parcelNumber: t.text(),
        legalDescription: t.text(),
        propertyType: propertyType().notNull(),
        yearBuilt: t.integer(),
        squareFeet: t.integer(),
        lotSizeAcres: t.numeric({ precision: 10, scale: 4 }),
        bedrooms: t.integer(),
        bathrooms: t.numeric({ precision: 3, scale: 1 }),
        acquisitionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        dodValueType: valuationType(), // Consolidated
        dodAffidavitFiled: t.boolean().default(false),
        dodAffidavitDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        clerkFileNo: t.text(),
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_homestead_entity_id').on(table.entityId),
        index('idx_homestead_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'homestead_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Homestead = typeof homestead.$inferSelect
export type InsertHomestead = typeof homestead.$inferInsert

// ============================================
// Assets - Rental Property
// ============================================

export const rentalProperty = pgTable(
    'rental_property',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        name: t.text().notNull(),
        streetAddress: t.text().notNull(),
        city: t.text().notNull(),
        state: t.text().notNull(),
        zip: t.text().notNull(),
        county: t.text(),
        parcelNumber: t.text(),
        propertyType: propertyType().notNull(),
        units: t.integer().default(1).notNull(),
        squareFeet: t.integer(),
        lotSizeAcres: t.numeric({ precision: 10, scale: 4 }),
        yearBuilt: t.integer(),
        rentalStatus: rentalStatus().default('RENTED').notNull(),
        monthlyRent: t.numeric({ precision: 10, scale: 2 }),
        leaseStart: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        leaseEnd: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        propertyManager: t.text(),
        acquisitionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        mortgageBalance: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        dodValueType: valuationType(), // Consolidated
        dodAffidavitFiled: t.boolean().default(false),
        dodAffidavitDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        clerkFileNo: t.text(),
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_rental_property_entity_id').on(table.entityId),
        index('idx_rental_property_status').on(table.rentalStatus),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'rental_property_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type RentalProperty = typeof rentalProperty.$inferSelect
export type InsertRentalProperty = typeof rentalProperty.$inferInsert

// ============================================
// Assets - Bank Accounts
// ============================================

export const bankAccount = pgTable(
    'bank_account',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        institution: t.text().notNull(),
        accountType: t.text().notNull(), // Converted from enum - 'CHECKING', 'SAVINGS', 'CD', 'MONEY_MARKET', etc.
        accountName: t.text(),
        accountNumber: t.text().notNull(),
        routingNumber: t.text(),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        currentBalance: t.numeric({ precision: 14, scale: 2 }), // Texas 113.152(4) - cash balance
        currentBalanceDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // When balance was last verified
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_bank_account_entity_id').on(table.entityId),
        index('idx_bank_account_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'bank_account_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type BankAccount = typeof bankAccount.$inferSelect
export type InsertBankAccount = typeof bankAccount.$inferInsert

// ============================================
// Assets - Investment Accounts
// ============================================

export const investmentAccount = pgTable(
    'investment_account',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        institution: t.text().notNull(),
        accountType: t.text().notNull(), // Converted from enum - 'BROKERAGE', 'IRA_TRADITIONAL', 'IRA_ROTH', etc.
        accountName: t.text(),
        accountNumber: t.text().notNull(),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        costBasis: t.numeric({ precision: 14, scale: 2 }),
        currentBalance: t.numeric({ precision: 14, scale: 2 }), // Texas 113.152(4) - current value
        currentBalanceDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // When balance was last verified
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_investment_account_entity_id').on(table.entityId),
        index('idx_investment_account_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'investment_account_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type InvestmentAccount = typeof investmentAccount.$inferSelect
export type InsertInvestmentAccount = typeof investmentAccount.$inferInsert

// ============================================
// Assets - Insurance Policies
// ============================================

export const insurancePolicy = pgTable(
    'insurance_policy',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        policyType: insurancePolicyType().notNull(),
        carrier: t.text().notNull(),
        policyNumber: t.text().notNull(),
        coverageAmount: t.numeric({ precision: 12, scale: 2 }),
        premium: t.numeric({ precision: 10, scale: 2 }),
        premiumFrequency: premiumFrequency(),
        effectiveDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        expirationDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        insuredAsset: t.text(),
        beneficiaries: t.text(),
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_insurance_policy_entity_id').on(table.entityId),
        index('idx_insurance_policy_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'insurance_policy_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type InsurancePolicy = typeof insurancePolicy.$inferSelect
export type InsertInsurancePolicy = typeof insurancePolicy.$inferInsert

// ============================================
// Beneficiaries
// ============================================

export const beneficiary = pgTable(
    'beneficiary',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }),
        firstName: t.text().notNull(),
        lastName: t.text().notNull(),
        relationship: t.text().notNull(),
        relationshipType: relationshipType(),
        parentId: bigint({ mode: 'number' }),
        dob: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        email: t.text(),
        phone: t.text(),
        streetAddress: t.text(),
        city: t.text(),
        state: t.text(),
        zip: t.text(),
        taxId: t.text(),
        sharePercent: t.numeric({ precision: 5, scale: 2 }),
        distributionStandard: distributionStandard(),
        withdrawalAge1: t.integer(),
        withdrawalPct1: t.integer(),
        withdrawalAge2: t.integer(),
        withdrawalPct2: t.integer(),
        hasSupplementalNeedsTrust: t.boolean().default(false),
        isPrimary: t.boolean().default(true),
        isContingent: t.boolean().default(false),
        informed: t.boolean().default(false),
        informedDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        releaseSigned: t.boolean().default(false),
        releaseDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        deceasedDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        // PostgreSQL 17 generated column - full name for display and search
        fullName: t
            .text('full_name')
            .generatedAlwaysAs(
                (): SQL =>
                    sql`${beneficiary.firstName} || ' ' || ${beneficiary.lastName}`,
            ),
    }),
    (table) => [
        index('idx_beneficiary_entity_id').on(table.entityId),
        index('idx_beneficiary_parent_id').on(table.parentId),
        uniqueIndex('Beneficiary_taxId_key').using(
            'btree',
            table.taxId.asc().nullsLast().op('text_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'beneficiary_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: 'beneficiary_parent_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT (app.is_admin() OR (beneficiary.id = app.get_user_beneficiary_id())))`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Beneficiary = typeof beneficiary.$inferSelect
export type InsertBeneficiary = typeof beneficiary.$inferInsert

// ============================================
// Distributions
// ============================================

export const distribution = pgTable(
    'distribution',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }),
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        distributionDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        amount: t.numeric({ precision: 12, scale: 2 }).notNull(),
        distributionType: distributionType().notNull(),
        hemsCategory: t.text(), // Converted from enum - 'HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT', etc.
        hemsJustification: t.text(),
        isWithdrawal: t.boolean().default(false),
        withdrawalPercent: t.integer(),
        sourceDescription: t.text(),
        checkNumber: t.text(),
        paymentMethod: paymentMethod().notNull(),
        taxReported: t.boolean().default(false).notNull(),
        tax1099Issued: t.boolean().default(false).notNull(),
        documentId: bigint({ mode: 'number' }),
        supportingDocPath: t.text(),
        approvedBy: t.text(),
        approvalDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_distribution_beneficiary_id').on(table.beneficiaryId),
        index('idx_distribution_date').on(table.distributionDate.desc()),
        index('idx_distribution_beneficiary_date').on(
            table.beneficiaryId,
            table.distributionDate.desc(),
        ),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'distribution_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'distribution_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT (app.is_admin() OR (distribution."beneficiaryId" = app.get_user_beneficiary_id())))`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Distribution = typeof distribution.$inferSelect
export type InsertDistribution = typeof distribution.$inferInsert

// ============================================
// Valuations
// ============================================

export const valuation = pgTable(
    'valuation',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        vehicleId: bigint({ mode: 'number' }),
        homesteadId: bigint({ mode: 'number' }),
        rentalPropertyId: bigint({ mode: 'number' }),
        bankAccountId: bigint({ mode: 'number' }),
        investmentAccountId: bigint({ mode: 'number' }),
        personalPropertyId: bigint({ mode: 'number' }),
        artworkId: bigint({ mode: 'number' }),
        valuationDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        value: t.numeric({ precision: 14, scale: 2 }).notNull(),
        valuationType: valuationType().notNull(),
        source: t.text(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        index('idx_valuation_vehicle_id').on(table.vehicleId),
        index('idx_valuation_homestead_id').on(table.homesteadId),
        index('idx_valuation_rental_property_id').on(table.rentalPropertyId),
        index('idx_valuation_bank_account_id').on(table.bankAccountId),
        index('idx_valuation_investment_account_id').on(
            table.investmentAccountId,
        ),
        index('idx_valuation_personal_property_id').on(
            table.personalPropertyId,
        ),
        index('idx_valuation_artwork_id').on(table.artworkId),
        index('idx_valuation_date').on(table.valuationDate.desc()),
        foreignKey({
            columns: [table.vehicleId],
            foreignColumns: [vehicle.id],
            name: 'valuation_vehicle_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.homesteadId],
            foreignColumns: [homestead.id],
            name: 'valuation_homestead_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.rentalPropertyId],
            foreignColumns: [rentalProperty.id],
            name: 'valuation_rental_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.bankAccountId],
            foreignColumns: [bankAccount.id],
            name: 'valuation_bank_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.investmentAccountId],
            foreignColumns: [investmentAccount.id],
            name: 'valuation_investment_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.personalPropertyId],
            foreignColumns: [personalProperty.id],
            name: 'valuation_personal_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.artworkId],
            foreignColumns: [artwork.id],
            name: 'valuation_artwork_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        // Polymorphic constraint: exactly one FK must be set
        check(
            'valuation_single_asset_check',
            sql`(
                (CASE WHEN ${table.vehicleId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.homesteadId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.rentalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.bankAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.investmentAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.personalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.artworkId} IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            )`,
        ),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Valuation = typeof valuation.$inferSelect
export type InsertValuation = typeof valuation.$inferInsert

// ============================================
// Valuation Corrections (AI Feedback Loop)
// ============================================

export const valuationCorrection = pgTable(
    'valuation_correction',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        itemName: t.text().notNull(),
        category: t.text().notNull(),
        aiEstimatedValue: t.text().notNull(),
        correctedValue: t.text().notNull(),
        correctionRatio: t.real().notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        index('idx_valuation_correction_entity_id').on(table.entityId),
        index('idx_valuation_correction_category').on(table.category),
        index('idx_valuation_correction_created_at').on(table.createdAt.desc()),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'valuation_correction_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
).enableRLS()

export type ValuationCorrection = typeof valuationCorrection.$inferSelect
export type InsertValuationCorrection = typeof valuationCorrection.$inferInsert

// ============================================
// Assets - Personal Property
// ============================================

export const personalProperty = pgTable(
    'personal_property',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        name: t.text().notNull(),
        description: t.text(),
        category: personalPropertyCategory().notNull(),
        location: t.text(),
        acquisitionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        dodValueType: valuationType(), // Consolidated
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_personal_property_entity_id').on(table.entityId),
        index('idx_personal_property_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'personal_property_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type PersonalProperty = typeof personalProperty.$inferSelect
export type InsertPersonalProperty = typeof personalProperty.$inferInsert

// ============================================
// Pending Inventory Items (Public Submission Queue)
// ============================================

export const pendingInventoryItem = pgTable(
    'pending_inventory_item',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        // Submission data
        name: t.text().notNull(),
        category: personalPropertyCategory().notNull(),
        description: t.text(),
        estimatedValue: t.numeric({ precision: 12, scale: 2 }),
        valueRangeLow: t.numeric({ precision: 12, scale: 2 }),
        valueRangeHigh: t.numeric({ precision: 12, scale: 2 }),
        condition: itemCondition().notNull(),
        // Photo references (local paths)
        photoPath1: t.text(),
        photoPath2: t.text(),
        photoPath3: t.text(),
        photoPath4: t.text(),
        photoPath5: t.text(),
        // AI analysis metadata. aiConfidence was repurposed 2026-04-21 to hold
        // the action-oriented reviewStatus values Opus 4.7 returns
        // ('inventory_ready' | 'needs_admin_review' |
        // 'needs_professional_appraisal'). The column name is kept as-is to
        // avoid migrating historical rows ('high' | 'medium' | 'low'); the
        // admin UI accepts both shapes. AI's reviewNotes are shown to the
        // submitter at analyze time but not persisted — aiValuationRationale
        // already carries the full evidence trail.
        aiConfidence: t.text(),
        aiSuggested: t.boolean().default(false).notNull(),
        aiBrand: t.text(),
        aiModel: t.text(),
        aiEra: t.text(),
        aiMaterials: t.text(),
        aiValuationRationale: t.text(),
        aiConditionNotes: t.text(),
        // Review workflow
        status: submissionStatus().default('PENDING').notNull(),
        reviewNotes: t.text(),
        approvedAt: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        approvedById: bigint({ mode: 'number' }),
        // Target entity (set by admin on approval)
        entityId: bigint({ mode: 'number' }),
        // Submitter contact info
        submitterName: t.text(),
        submitterEmail: t.text(),
        submitterPhone: t.text(),
        // Tracking
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_pending_inventory_item_status').on(table.status),
        index('idx_pending_inventory_item_entity_id').on(table.entityId),
        index('idx_pending_inventory_item_created_at').on(
            table.createdAt.desc(),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'pending_inventory_item_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type PendingInventoryItem = typeof pendingInventoryItem.$inferSelect
export type InsertPendingInventoryItem =
    typeof pendingInventoryItem.$inferInsert

// ============================================
// Documents
// ============================================

export const document = pgTable(
    'document',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        name: t.text().notNull(),
        documentType: documentType().notNull(),
        filePath: t.text().notNull(),
        entityId: bigint({ mode: 'number' }),
        vehicleId: bigint({ mode: 'number' }),
        homesteadId: bigint({ mode: 'number' }),
        rentalPropertyId: bigint({ mode: 'number' }),
        bankAccountId: bigint({ mode: 'number' }),
        investmentAccountId: bigint({ mode: 'number' }),
        insurancePolicyId: bigint({ mode: 'number' }),
        personalPropertyId: bigint({ mode: 'number' }),
        documentDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        expirationDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_document_entity_id').on(table.entityId),
        index('idx_document_vehicle_id').on(table.vehicleId),
        index('idx_document_homestead_id').on(table.homesteadId),
        index('idx_document_rental_property_id').on(table.rentalPropertyId),
        index('idx_document_bank_account_id').on(table.bankAccountId),
        index('idx_document_investment_account_id').on(
            table.investmentAccountId,
        ),
        index('idx_document_insurance_policy_id').on(table.insurancePolicyId),
        index('idx_document_personal_property_id').on(table.personalPropertyId),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'document_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.vehicleId],
            foreignColumns: [vehicle.id],
            name: 'document_vehicle_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.homesteadId],
            foreignColumns: [homestead.id],
            name: 'document_homestead_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.rentalPropertyId],
            foreignColumns: [rentalProperty.id],
            name: 'document_rental_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.bankAccountId],
            foreignColumns: [bankAccount.id],
            name: 'document_bank_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.investmentAccountId],
            foreignColumns: [investmentAccount.id],
            name: 'document_investment_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.insurancePolicyId],
            foreignColumns: [insurancePolicy.id],
            name: 'document_insurance_policy_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.personalPropertyId],
            foreignColumns: [personalProperty.id],
            name: 'document_personal_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        // Polymorphic constraint: exactly one owner FK must be set
        check(
            'document_single_owner_check',
            sql`(
                (CASE WHEN ${table.entityId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.vehicleId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.homesteadId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.rentalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.bankAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.investmentAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.insurancePolicyId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.personalPropertyId} IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            )`,
        ),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Document = typeof document.$inferSelect
export type InsertDocument = typeof document.$inferInsert

// ============================================
// Transactions
// ============================================

export const transaction = pgTable(
    'transaction',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        vehicleId: bigint({ mode: 'number' }),
        homesteadId: bigint({ mode: 'number' }),
        rentalPropertyId: bigint({ mode: 'number' }),
        bankAccountId: bigint({ mode: 'number' }),
        investmentAccountId: bigint({ mode: 'number' }),
        insurancePolicyId: bigint({ mode: 'number' }),
        transactionDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        transactionType: transactionType().notNull(),
        category: t.text().notNull(),
        amount: t.numeric({ precision: 12, scale: 2 }).notNull(),
        description: t.text(),
        vendor: t.text(),
        checkNumber: t.text(),
        documentId: bigint({ mode: 'number' }),
        allocationClass: allocationClass().default('PRINCIPAL'), // Texas 116.152 - Principal vs Income
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_transaction_vehicle_id').on(table.vehicleId),
        index('idx_transaction_homestead_id').on(table.homesteadId),
        index('idx_transaction_rental_property_id').on(table.rentalPropertyId),
        index('idx_transaction_bank_account_id').on(table.bankAccountId),
        index('idx_transaction_investment_account_id').on(
            table.investmentAccountId,
        ),
        index('idx_transaction_insurance_policy_id').on(
            table.insurancePolicyId,
        ),
        index('idx_transaction_date').on(table.transactionDate.desc()),
        foreignKey({
            columns: [table.vehicleId],
            foreignColumns: [vehicle.id],
            name: 'transaction_vehicle_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.homesteadId],
            foreignColumns: [homestead.id],
            name: 'transaction_homestead_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.rentalPropertyId],
            foreignColumns: [rentalProperty.id],
            name: 'transaction_rental_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.bankAccountId],
            foreignColumns: [bankAccount.id],
            name: 'transaction_bank_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.investmentAccountId],
            foreignColumns: [investmentAccount.id],
            name: 'transaction_investment_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.insurancePolicyId],
            foreignColumns: [insurancePolicy.id],
            name: 'transaction_insurance_policy_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        // Polymorphic constraint: exactly one asset FK must be set
        check(
            'transaction_single_asset_check',
            sql`(
                (CASE WHEN ${table.vehicleId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.homesteadId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.rentalPropertyId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.bankAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.investmentAccountId} IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN ${table.insurancePolicyId} IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            )`,
        ),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Transaction = typeof transaction.$inferSelect
export type InsertTransaction = typeof transaction.$inferInsert

// ============================================
// Contacts
// ============================================

export const contact = pgTable(
    'contact',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        name: t.text().notNull(),
        company: t.text(),
        role: t.text().notNull(), // Converted from enum - 'ATTORNEY', 'ACCOUNTANT', 'FINANCIAL_ADVISOR', etc.
        email: t.text(),
        phone: t.text(),
        dob: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        streetAddress: t.text(),
        city: t.text(),
        state: t.text(),
        zip: t.text(),
        licenseNo: t.text(),
        barNo: t.text(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    () => [
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Contact = typeof contact.$inferSelect
export type InsertContact = typeof contact.$inferInsert

export const contactAssociation = pgTable(
    'contact_association',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        contactId: bigint({ mode: 'number' }).notNull(),
        entityId: bigint({ mode: 'number' }),
        relationship: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        index('idx_contact_association_contact_id').on(table.contactId),
        index('idx_contact_association_entity_id').on(table.entityId),
        foreignKey({
            columns: [table.contactId],
            foreignColumns: [contact.id],
            name: 'contact_association_contact_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'contact_association_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type ContactAssociation = typeof contactAssociation.$inferSelect
export type InsertContactAssociation = typeof contactAssociation.$inferInsert

// ============================================
// Tasks
// ============================================

export const task = pgTable(
    'task',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        title: t.text().notNull(),
        category: t.text().default('OTHER').notNull(), // Converted from enum - 'INVENTORY', 'FINANCIAL', 'BENEFICIARY', etc.
        completed: t.boolean().default(false).notNull(),
        notes: t.text(),
        dueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        sortOrder: t.integer().default(0).notNull(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_task_completed').on(table.completed),
        index('idx_task_due_date').on(table.dueDate.desc()),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Task = typeof task.$inferSelect
export type InsertTask = typeof task.$inferInsert

// ============================================
// Assets - Artwork
// ============================================

export const artwork = pgTable(
    'artwork',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        title: t.text().notNull(),
        artist: t.text(),
        medium: t.text(),
        dimensions: t.text(),
        acquisitionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        acquisitionCost: t.numeric({ precision: 12, scale: 2 }),
        location: t.text(),
        dodValue: t.numeric({ precision: 14, scale: 2 }),
        dodValueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        dodValueType: valuationType(), // Consolidated
        transferStatus: transferStatus().default('PENDING').notNull(),
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_artwork_entity_id').on(table.entityId),
        index('idx_artwork_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'artwork_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Artwork = typeof artwork.$inferSelect
export type InsertArtwork = typeof artwork.$inferInsert

// ============================================
// Trustees
// ============================================

export const trustee = pgTable(
    'trustee',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        contactId: bigint({ mode: 'number' }),
        name: t.text().notNull(),
        email: t.text(),
        phone: t.text(),
        dob: t.timestamp({ precision: 3, mode: 'string', withTimezone: true }),
        status: trusteeStatus().default('ACTIVE'),
        order: t.integer().notNull(),
        isCo: t.boolean().default(false),
        coTrusteeId: bigint({ mode: 'number' }),
        startDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        endDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_trustee_entity_id').on(table.entityId),
        index('idx_trustee_contact_id').on(table.contactId),
        index('idx_trustee_co_trustee_id').on(table.coTrusteeId),
        index('idx_trustee_status').on(table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'trustee_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.contactId],
            foreignColumns: [contact.id],
            name: 'trustee_contact_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.coTrusteeId],
            foreignColumns: [table.id],
            name: 'trustee_co_trustee_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Trustee = typeof trustee.$inferSelect
export type InsertTrustee = typeof trustee.$inferInsert

// ============================================
// Specific Bequests
// ============================================

export const specificBequest = pgTable(
    'specific_bequest',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        beneficiaryId: bigint({ mode: 'number' }),
        description: t.text().notNull(),
        category: t.text(),
        recipientName: t.text(),
        dateDistributed: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_specific_bequest_entity_id').on(table.entityId),
        index('idx_specific_bequest_beneficiary_id').on(table.beneficiaryId),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'specific_bequest_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'specific_bequest_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT (app.is_admin() OR (specific_bequest."beneficiaryId" = app.get_user_beneficiary_id())))`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type SpecificBequest = typeof specificBequest.$inferSelect
export type InsertSpecificBequest = typeof specificBequest.$inferInsert

// ============================================
// Trust Accounting
// ============================================

export const trustAccounting = pgTable(
    'trust_accounting',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        accountingDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        entryType: accountingEntryType().notNull(),
        incomeType: incomeType(),
        expenseType: expenseType(),
        amount: t.numeric({ precision: 14, scale: 2 }).notNull(),
        description: t.text().notNull(),
        sourceAssetType: t.text(), // 'vehicle', 'rentalProperty', 'bankAccount', etc.
        sourceAssetId: bigint({ mode: 'number' }),
        bankAccountId: bigint({ mode: 'number' }).notNull(), // Every accounting entry must trace to a bank account
        isPrincipal: t.boolean().default(false), // Principal vs Income distinction
        taxDeductible: t.boolean().default(false),
        documentPath: t.text(),
        vendor: t.text(),
        checkNumber: t.text(),
        reconciled: t.boolean().default(false),
        reconciledDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        fiscalYear: t.integer(),
        // Income-to-Principal Conversion - Trust Section 7.10(c)
        // "All income not distributed shall be added to principal at least annually"
        convertedToPrincipal: t.boolean().default(false), // Has this income entry been converted to principal
        conversionDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // When conversion occurred
        conversionEntryId: bigint({ mode: 'number' }), // Links to the principal entry created during conversion
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_trust_accounting_entity_id').on(table.entityId),
        index('idx_trust_accounting_date').on(table.accountingDate.desc()),
        index('idx_trust_accounting_entity_date').on(
            table.entityId,
            table.accountingDate.desc(),
        ),
        // BRIN index for append-only sequential data
        index('idx_trust_accounting_created_at_brin').using(
            'brin',
            table.createdAt,
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'trust_accounting_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        index('idx_trust_accounting_bank_account').on(table.bankAccountId),
        foreignKey({
            columns: [table.bankAccountId],
            foreignColumns: [bankAccount.id],
            name: 'trust_accounting_bank_account_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type TrustAccounting = typeof trustAccounting.$inferSelect
export type InsertTrustAccounting = typeof trustAccounting.$inferInsert

// ============================================
// Withdrawal Records
// ============================================

export const withdrawalRecord = pgTable(
    'withdrawal_record',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        entityId: bigint({ mode: 'number' }).notNull(),
        withdrawalType: t.text().notNull(), // 'AGE_25', 'AGE_30', 'FULL'
        eligibleDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        eligibleAmount: t.numeric({ precision: 14, scale: 2 }).notNull(),
        withdrawnAmount: t.numeric({ precision: 14, scale: 2 }).default('0'),
        remainingAmount: t.numeric({ precision: 14, scale: 2 }),
        status: withdrawalStatus().default('NOT_YET_ELIGIBLE'),
        exercisedDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        distributionId: bigint({ mode: 'number' }), // Link to actual distribution if exercised
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_withdrawal_record_beneficiary_id').on(table.beneficiaryId),
        index('idx_withdrawal_record_status').on(table.status),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'withdrawal_record_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'withdrawal_record_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.distributionId],
            foreignColumns: [distribution.id],
            name: 'withdrawal_record_distribution_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT (app.is_admin() OR (withdrawal_record."beneficiaryId" = app.get_user_beneficiary_id())))`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type WithdrawalRecord = typeof withdrawalRecord.$inferSelect
export type InsertWithdrawalRecord = typeof withdrawalRecord.$inferInsert

// ============================================
// Liabilities
// ============================================

export const liability = pgTable(
    'liability',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        liabilityType: liabilityType().notNull(),
        creditor: t.text().notNull(), // Who is owed
        description: t.text(),
        originalAmount: t.numeric({ precision: 14, scale: 2 }).notNull(), // Original debt amount
        currentBalance: t.numeric({ precision: 14, scale: 2 }).notNull(), // Current outstanding balance
        currentBalanceDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // When balance was last verified
        interestRate: t.numeric({ precision: 5, scale: 3 }), // Annual interest rate
        monthlyPayment: t.numeric({ precision: 12, scale: 2 }),
        dueDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // Final due date or maturity
        paymentDueDay: t.integer(), // Day of month payment is due
        // Loan term fields for amortization calculations
        loanTermMonths: t.integer(), // Loan duration (e.g., 360 for 30yr, 60 for 5yr)
        loanStartDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }), // When loan originated
        escrowMonthly: t.numeric({ precision: 12, scale: 2 }), // Monthly escrow for taxes/insurance
        isRevolvingCredit: t.boolean().default(false).notNull(), // True for credit cards (no fixed term)
        // For mortgages - link to property
        rentalPropertyId: bigint({ mode: 'number' }),
        homesteadId: bigint({ mode: 'number' }),
        // For vehicle loans
        vehicleId: bigint({ mode: 'number' }),
        status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
        allocationClass: allocationClass().default('PRINCIPAL'), // Texas 116.152 - Principal vs Income
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        // PostgreSQL 17 generated column - balance with accrued interest
        effectiveBalance: t
            .numeric('effective_balance', { precision: 14, scale: 2 })
            .generatedAlwaysAs(
                (): SQL =>
                    sql`${liability.currentBalance} * (1 + COALESCE(${liability.interestRate}, 0))`,
            ),
    }),
    (table) => [
        index('idx_liability_entity_id').on(table.entityId),
        index('idx_liability_status').on(table.status),
        index('idx_liability_entity_status').on(table.entityId, table.status),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'liability_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.rentalPropertyId],
            foreignColumns: [rentalProperty.id],
            name: 'liability_rental_property_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.homesteadId],
            foreignColumns: [homestead.id],
            name: 'liability_homestead_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.vehicleId],
            foreignColumns: [vehicle.id],
            name: 'liability_vehicle_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type Liability = typeof liability.$inferSelect
export type InsertLiability = typeof liability.$inferInsert

// ============================================
// Liability Payments
// ============================================

export const liabilityPayment = pgTable(
    'liability_payment',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        liabilityId: bigint({ mode: 'number' }).notNull(),
        paymentDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        amount: t.numeric({ precision: 12, scale: 2 }).notNull(),
        principalPortion: t.numeric({ precision: 12, scale: 2 }), // Principal portion of payment
        interestPortion: t.numeric({ precision: 12, scale: 2 }), // Interest portion of payment
        escrowPortion: t.numeric({ precision: 12, scale: 2 }), // Escrow portion (taxes, insurance)
        paymentMethod: paymentMethod(),
        checkNumber: t.text(),
        confirmationNumber: t.text(),
        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        index('idx_liability_payment_liability_id').on(table.liabilityId),
        index('idx_liability_payment_date').on(table.paymentDate.desc()),
        // Composite index for payment history by liability
        index('idx_liability_payment_liability_date').on(
            table.liabilityId,
            table.paymentDate.desc(),
        ),
        foreignKey({
            columns: [table.liabilityId],
            foreignColumns: [liability.id],
            name: 'liability_payment_liability_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type LiabilityPayment = typeof liabilityPayment.$inferSelect
export type InsertLiabilityPayment = typeof liabilityPayment.$inferInsert

// ============================================
// HEMS Requests
// ============================================

export const hemsRequest = pgTable(
    'hems_request',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        entityId: bigint({ mode: 'number' }).notNull(),

        // Request details
        category: t.text().notNull(), // Converted from enum - 'HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT', etc.
        amountRequested: t.numeric({ precision: 14, scale: 2 }).notNull(),
        justification: t.text().notNull(),
        supportingDocPath: t.text(),

        // Workflow status
        status: hemsRequestStatus().default('PENDING').notNull(),

        // Review details
        reviewedBy: t.text(),
        reviewedAt: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        reviewNotes: t.text(),
        approvedAmount: t.numeric({ precision: 14, scale: 2 }),

        // Link to distribution when fulfilled
        distributionId: bigint({ mode: 'number' }),

        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        index('idx_hems_request_beneficiary_id').on(table.beneficiaryId),
        index('idx_hems_request_entity_id').on(table.entityId),
        index('idx_hems_request_status').on(table.status),
        index('idx_hems_request_distribution_id').on(table.distributionId),
        // Composite index for requests by beneficiary and status
        index('idx_hems_request_beneficiary_status').on(
            table.beneficiaryId,
            table.status,
        ),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'hems_request_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'hems_request_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.distributionId],
            foreignColumns: [distribution.id],
            name: 'hems_request_distribution_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT (app.is_admin() OR (hems_request."beneficiaryId" = app.get_user_beneficiary_id())))`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type HemsRequest = typeof hemsRequest.$inferSelect
export type InsertHemsRequest = typeof hemsRequest.$inferInsert

// ============================================
// Trustee Fee Schedule
// ============================================

export const trusteeFeeSchedule = pgTable(
    'trustee_fee_schedule',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        trusteeId: bigint({ mode: 'number' }).notNull(),

        // Fee rates
        executorFeePercent: t
            .numeric({ precision: 5, scale: 2 })
            .default('5.0'),
        annualAssetPercent: t
            .numeric({ precision: 5, scale: 2 })
            .default('1.5'),
        incomePercent: t.numeric({ precision: 5, scale: 2 }).default('8.0'),
        hourlyRate: t.numeric({ precision: 10, scale: 2 }).default('125.00'),

        effectiveDate: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        endDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        notes: t.text(),

        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    }),
    (table) => [
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'trustee_fee_schedule_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.trusteeId],
            foreignColumns: [trustee.id],
            name: 'trustee_fee_schedule_trustee_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type TrusteeFeeSchedule = typeof trusteeFeeSchedule.$inferSelect
export type InsertTrusteeFeeSchedule = typeof trusteeFeeSchedule.$inferInsert

// ============================================
// Trustee Fee Entries
// ============================================

export const trusteeFeeEntry = pgTable(
    'trustee_fee_entry',
    (t) => ({
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        entityId: bigint({ mode: 'number' }).notNull(),
        trusteeId: bigint({ mode: 'number' }).notNull(),
        scheduleId: bigint({ mode: 'number' }),

        // Period
        periodStart: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
        periodEnd: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),

        // Calculated fees
        assetFee: t.numeric({ precision: 14, scale: 2 }).default('0'),
        assetBasis: t.numeric({ precision: 14, scale: 2 }), // Trust value used for calc

        incomeFee: t.numeric({ precision: 14, scale: 2 }).default('0'),
        incomeBasis: t.numeric({ precision: 14, scale: 2 }), // Gross income for period

        hoursWorked: t.numeric({ precision: 6, scale: 2 }).default('0'),
        hourlyFee: t.numeric({ precision: 14, scale: 2 }).default('0'),

        executorFee: t.numeric({ precision: 14, scale: 2 }).default('0'), // One-time probate

        totalFee: t.numeric({ precision: 14, scale: 2 }).notNull(),

        // Payment tracking
        status: trusteeFeeStatus().default('ACCRUED').notNull(),
        paidDate: t.timestamp({
            precision: 3,
            mode: 'string',
            withTimezone: true,
        }),
        paymentMethod: paymentMethod(),
        checkNumber: t.text(),

        notes: t.text(),
        createdAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: t
            .timestamp({ precision: 3, mode: 'string', withTimezone: true })
            .notNull(),
    }),
    (table) => [
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'trustee_fee_entry_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.trusteeId],
            foreignColumns: [trustee.id],
            name: 'trustee_fee_entry_trustee_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
        foreignKey({
            columns: [table.scheduleId],
            foreignColumns: [trusteeFeeSchedule.id],
            name: 'trustee_fee_entry_schedule_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        pgPolicy('crud-authenticated-policy-select', {
            as: 'permissive',
            for: 'select',
            to: ['authenticated'],
            using: sql`( SELECT app.is_admin() AS is_admin)`,
        }),
        pgPolicy('crud-authenticated-policy-insert', {
            as: 'permissive',
            for: 'insert',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-update', {
            as: 'permissive',
            for: 'update',
            to: ['authenticated'],
        }),
        pgPolicy('crud-authenticated-policy-delete', {
            as: 'permissive',
            for: 'delete',
            to: ['authenticated'],
        }),
    ],
).enableRLS()

export type TrusteeFeeEntry = typeof trusteeFeeEntry.$inferSelect
export type InsertTrusteeFeeEntry = typeof trusteeFeeEntry.$inferInsert

// ============================================
// Better Auth Tables
// ============================================

export const user = pgTable(
    'user',
    (t) => ({
        id: t.text().primaryKey().notNull(),
        name: t.text().notNull(),
        email: t.text().notNull().unique(),
        emailVerified: t.boolean('email_verified').notNull().default(false),
        image: t.text(),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: t
            .timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        // Custom fields
        role: userRole().notNull().default('beneficiary'),
        beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
    }),
    (table) => [
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'user_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
)

export type User = typeof user.$inferSelect
export type InsertUser = typeof user.$inferInsert

// User profile for Neon Auth - links Neon users to app roles and beneficiaries
export const userProfile = pgTable(
    'user_profile',
    (t) => ({
        userId: t.text('user_id').primaryKey().notNull(),
        role: userRole().notNull().default('beneficiary'),
        beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
        forcePasswordChange: t
            .boolean('force_password_change')
            .notNull()
            .default(false),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: t
            .timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    }),
    (table) => [
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'user_profile_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
)

export type UserProfile = typeof userProfile.$inferSelect
export type InsertUserProfile = typeof userProfile.$inferInsert

// Password reset tokens for custom forgot-password flow (bypasses Neon Auth email)
export const passwordResetToken = pgTable(
    'password_reset_token',
    (t) => ({
        id: t.bigserial({ mode: 'number' }).primaryKey(),
        token: t.text().notNull().unique(),
        email: t.text().notNull(),
        expiresAt: t.timestamp('expires_at', { withTimezone: true }).notNull(),
        usedAt: t.timestamp('used_at', { withTimezone: true }),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    }),
    (table) => [index('idx_password_reset_token_email').on(table.email)],
)

export type PasswordResetToken = typeof passwordResetToken.$inferSelect

export const session = pgTable(
    'session',
    (t) => ({
        id: t.text().primaryKey().notNull(),
        expiresAt: t.timestamp('expires_at', { withTimezone: true }).notNull(),
        token: t.text().notNull().unique(),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: t
            .timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        ipAddress: t.text('ip_address'),
        userAgent: t.text('user_agent'),
        userId: t.text('user_id').notNull(),
    }),
    (table) => [
        index('idx_session_user_id').on(table.userId),
        index('idx_session_token').on(table.token),
        index('idx_session_expires_at').on(table.expiresAt),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [user.id],
            name: 'session_user_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
)

export type Session = typeof session.$inferSelect
export type InsertSession = typeof session.$inferInsert

export const account = pgTable(
    'account',
    (t) => ({
        id: t.text().primaryKey().notNull(),
        accountId: t.text('account_id').notNull(),
        providerId: t.text('provider_id').notNull(),
        userId: t.text('user_id').notNull(),
        accessToken: t.text('access_token'),
        refreshToken: t.text('refresh_token'),
        idToken: t.text('id_token'),
        accessTokenExpiresAt: t.timestamp('access_token_expires_at', {
            withTimezone: true,
        }),
        refreshTokenExpiresAt: t.timestamp('refresh_token_expires_at', {
            withTimezone: true,
        }),
        scope: t.text(),
        password: t.text(),
        createdAt: t
            .timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: t
            .timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    }),
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [user.id],
            name: 'account_user_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
)

export type Account = typeof account.$inferSelect
export type InsertAccount = typeof account.$inferInsert

export const verification = pgTable('verification', (t) => ({
    id: t.text().primaryKey().notNull(),
    identifier: t.text().notNull(),
    value: t.text().notNull(),
    expiresAt: t.timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: t
        .timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: t
        .timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}))

export type Verification = typeof verification.$inferSelect
export type InsertVerification = typeof verification.$inferInsert

// ============================================
// Enum Type Aliases (for convenience)
// ============================================
export type PaymentMethodType = 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'OTHER'
export type LiabilityTypeEnum =
    | 'MORTGAGE'
    | 'LOAN'
    | 'CREDIT_CARD'
    | 'TAX_OWED'
    | 'ACCOUNTS_PAYABLE'
    | 'LEGAL_JUDGMENT'
    | 'OTHER'
export type RecordStatusEnum =
    | 'ACTIVE'
    | 'INACTIVE'
    | 'OPEN'
    | 'PENDING'
    | 'CLOSED'
    | 'FROZEN'
    | 'SOLD'
    | 'TRANSFERRED'
    | 'DISPOSED'
    | 'PAID_OFF'
    | 'PAST_DUE'
    | 'COLLECTIONS'
    | 'DISPUTED'
    | 'WRITTEN_OFF'
    | 'LAPSED'
    | 'CANCELLED'
    | 'CLAIMED'
    | 'DISSOLVED'
export type TitleStatusEnum = 'CLEAR' | 'LIEN' | 'PENDING_TRANSFER'
export type TransferStatusEnum = 'PENDING' | 'STARTED' | 'COMPLETE'
export type EntityTypeEnum =
    | 'TRUST'
    | 'LLC'
    | 'CORPORATION'
    | 'PARTNERSHIP'
    | 'INDIVIDUAL'
export type TrustTypeEnum = 'REVOCABLE' | 'IRREVOCABLE'
export type RelationshipTypeEnum =
    | 'CHILD'
    | 'STEPCHILD'
    | 'GRANDCHILD'
    | 'OTHER'
export type DistributionStandardEnum =
    | 'HEMS'
    | 'HEMS_PLUS_WITHDRAWAL'
    | 'BROADER'
    | 'WITHDRAWAL_ONLY'
export type TrusteeStatusEnum =
    | 'ACTIVE'
    | 'SUCCESSOR'
    | 'ARBITER'
    | 'RESIGNED'
    | 'REMOVED'
    | 'DECEASED'
export type TrusteeFeeStatusEnum = 'ACCRUED' | 'APPROVED' | 'PAID'
export type WithdrawalStatusEnum =
    | 'ELIGIBLE'
    | 'PARTIAL'
    | 'COMPLETE'
    | 'NOT_YET_ELIGIBLE'
export type AllocationClassEnum = 'PRINCIPAL' | 'INCOME'
export type TransactionTypeEnum =
    | 'INCOME'
    | 'EXPENSE'
    | 'TRANSFER'
    | 'CAPITAL_IMPROVEMENT'
    | 'DEPRECIATION'
export type DistributionTypeEnum =
    | 'INCOME'
    | 'PRINCIPAL'
    | 'CAPITAL_GAIN'
    | 'EXPENSE_REIMBURSEMENT'
    | 'OTHER'
export type InsurancePolicyTypeEnum =
    | 'LIFE'
    | 'PROPERTY'
    | 'AUTO'
    | 'UMBRELLA'
    | 'LIABILITY'
    | 'HEALTH'
    | 'OTHER'
export type PremiumFrequencyEnum =
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'SEMI_ANNUAL'
    | 'ANNUAL'
export type PropertyTypeEnum =
    | 'SINGLE_FAMILY'
    | 'MULTI_FAMILY'
    | 'CONDO'
    | 'TOWNHOUSE'
    | 'LAND'
    | 'COMMERCIAL'
    | 'MOBILE_HOME'
export type RentalStatusEnum =
    | 'RENTED'
    | 'VACANT'
    | 'UNDER_RENOVATION'
    | 'LISTED'
export type ValuationTypeEnum =
    | 'APPRAISAL'
    | 'MARKET_ESTIMATE'
    | 'TAX_ASSESSED'
    | 'STATEMENT_BALANCE'
    | 'PURCHASE_PRICE'
    | 'BOOK_VALUE'
    | 'SELF_ASSESSED'
    | 'STATEMENT'
export type LogActionEnum =
    | 'INSERT'
    | 'UPDATE'
    | 'DELETE'
    | 'SIGN_IN'
    | 'SIGN_OUT'
    | 'FAILED_AUTH'
    | 'ACCESS_DENIED'
export type UserRoleEnum = 'admin' | 'beneficiary'
export type HemsRequestStatusEnum =
    | 'PENDING'
    | 'APPROVED'
    | 'DENIED'
    | 'DISTRIBUTED'
    | 'CANCELLED'
export type AccountingEntryTypeEnum = 'INCOME' | 'EXPENSE'
export type IncomeTypeEnum =
    | 'DIVIDEND'
    | 'INTEREST'
    | 'RENT'
    | 'ROYALTY'
    | 'CAPITAL_GAIN'
    | 'SALE_PROCEEDS'
    | 'DISTRIBUTION'
    | 'INCOME_TO_PRINCIPAL_CONVERSION'
    | 'OTHER'
export type ExpenseTypeEnum =
    | 'TAX'
    | 'INSURANCE'
    | 'MAINTENANCE'
    | 'REPAIR'
    | 'PROFESSIONAL_FEE'
    | 'TRUSTEE_FEE'
    | 'FILING_FEE'
    | 'UTILITY'
    | 'LEGAL'
    | 'OTHER'
export type PersonalPropertyCategoryEnum =
    | 'JEWELRY'
    | 'ART'
    | 'COLLECTIBLES'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'OTHER'
export type DocumentTypeEnum =
    | 'DEED'
    | 'TITLE'
    | 'STATEMENT'
    | 'CONTRACT'
    | 'LEGAL'
    | 'OTHER'
export type ItemConditionEnum = 'excellent' | 'good' | 'fair' | 'poor'
export type SubmissionStatusEnum = 'PENDING' | 'APPROVED' | 'REJECTED'

// Commonly used combined types
export type TrustAccountingEntryType = 'INCOME' | 'EXPENSE'

// =============================================================================
// ENUM TYPE GUARDS
// Runtime validation for enum values from user input
// =============================================================================

/**
 * Type guard for PaymentMethod enum
 * @example isPaymentMethod(formData.paymentMethod) ? formData.paymentMethod : null
 */
export function isPaymentMethod(value: unknown): value is PaymentMethodType {
    const valid: PaymentMethodType[] = ['CHECK', 'ACH', 'WIRE', 'CASH', 'OTHER']
    return (
        typeof value === 'string' && valid.includes(value as PaymentMethodType)
    )
}

/**
 * Type guard for LiabilityType enum
 */
export function isLiabilityType(value: unknown): value is LiabilityTypeEnum {
    const valid: LiabilityTypeEnum[] = [
        'MORTGAGE',
        'LOAN',
        'CREDIT_CARD',
        'TAX_OWED',
        'ACCOUNTS_PAYABLE',
        'LEGAL_JUDGMENT',
        'OTHER',
    ]
    return (
        typeof value === 'string' && valid.includes(value as LiabilityTypeEnum)
    )
}

/**
 * Type guard for RecordStatus enum
 */
export function isRecordStatus(value: unknown): value is RecordStatusEnum {
    const valid: RecordStatusEnum[] = [
        'ACTIVE',
        'INACTIVE',
        'OPEN',
        'PENDING',
        'CLOSED',
        'FROZEN',
        'SOLD',
        'TRANSFERRED',
        'DISPOSED',
        'PAID_OFF',
        'PAST_DUE',
        'COLLECTIONS',
        'DISPUTED',
        'WRITTEN_OFF',
        'LAPSED',
        'CANCELLED',
        'CLAIMED',
        'DISSOLVED',
    ]
    return (
        typeof value === 'string' && valid.includes(value as RecordStatusEnum)
    )
}

/**
 * Type guard for DistributionType enum
 */
export function isDistributionType(
    value: unknown,
): value is DistributionTypeEnum {
    const valid: DistributionTypeEnum[] = [
        'INCOME',
        'PRINCIPAL',
        'CAPITAL_GAIN',
        'EXPENSE_REIMBURSEMENT',
        'OTHER',
    ]
    return (
        typeof value === 'string' &&
        valid.includes(value as DistributionTypeEnum)
    )
}

/**
 * Type guard for AllocationClass enum (Principal vs Income)
 */
export function isAllocationClass(
    value: unknown,
): value is AllocationClassEnum {
    const valid: AllocationClassEnum[] = ['PRINCIPAL', 'INCOME']
    return (
        typeof value === 'string' &&
        valid.includes(value as AllocationClassEnum)
    )
}

/**
 * Type guard for UserRole enum
 */
export function isUserRole(value: unknown): value is UserRoleEnum {
    const valid: UserRoleEnum[] = ['admin', 'beneficiary']
    return typeof value === 'string' && valid.includes(value as UserRoleEnum)
}

/**
 * Type guard for HemsRequestStatus enum
 */
export function isHemsRequestStatus(
    value: unknown,
): value is HemsRequestStatusEnum {
    const valid: HemsRequestStatusEnum[] = [
        'PENDING',
        'APPROVED',
        'DENIED',
        'DISTRIBUTED',
        'CANCELLED',
    ]
    return (
        typeof value === 'string' &&
        valid.includes(value as HemsRequestStatusEnum)
    )
}

/**
 * Type guard for AccountingEntryType enum
 */
export function isAccountingEntryType(
    value: unknown,
): value is AccountingEntryTypeEnum {
    const valid: AccountingEntryTypeEnum[] = ['INCOME', 'EXPENSE']
    return (
        typeof value === 'string' &&
        valid.includes(value as AccountingEntryTypeEnum)
    )
}

/**
 * Type guard for IncomeType enum
 */
export function isIncomeType(value: unknown): value is IncomeTypeEnum {
    const valid: IncomeTypeEnum[] = [
        'DIVIDEND',
        'INTEREST',
        'RENT',
        'ROYALTY',
        'CAPITAL_GAIN',
        'SALE_PROCEEDS',
        'DISTRIBUTION',
        'INCOME_TO_PRINCIPAL_CONVERSION',
        'OTHER',
    ]
    return typeof value === 'string' && valid.includes(value as IncomeTypeEnum)
}

/**
 * Type guard for ExpenseType enum
 */
export function isExpenseType(value: unknown): value is ExpenseTypeEnum {
    const valid: ExpenseTypeEnum[] = [
        'TAX',
        'INSURANCE',
        'MAINTENANCE',
        'REPAIR',
        'PROFESSIONAL_FEE',
        'TRUSTEE_FEE',
        'FILING_FEE',
        'UTILITY',
        'LEGAL',
        'OTHER',
    ]
    return typeof value === 'string' && valid.includes(value as ExpenseTypeEnum)
}

/**
 * Type guard for PersonalPropertyCategory enum
 */
export function isPersonalPropertyCategory(
    value: unknown,
): value is PersonalPropertyCategoryEnum {
    const valid: PersonalPropertyCategoryEnum[] = [
        'JEWELRY',
        'ART',
        'COLLECTIBLES',
        'ELECTRONICS',
        'FURNITURE',
        'OTHER',
    ]
    return (
        typeof value === 'string' &&
        valid.includes(value as PersonalPropertyCategoryEnum)
    )
}

/**
 * Type guard for DocumentType enum
 */
export function isDocumentType(value: unknown): value is DocumentTypeEnum {
    const valid: DocumentTypeEnum[] = [
        'DEED',
        'TITLE',
        'STATEMENT',
        'CONTRACT',
        'LEGAL',
        'OTHER',
    ]
    return (
        typeof value === 'string' && valid.includes(value as DocumentTypeEnum)
    )
}

/**
 * Type guard for ItemCondition enum
 */
export function isItemCondition(value: unknown): value is ItemConditionEnum {
    const valid: ItemConditionEnum[] = ['excellent', 'good', 'fair', 'poor']
    return (
        typeof value === 'string' && valid.includes(value as ItemConditionEnum)
    )
}

/**
 * Type guard for SubmissionStatus enum
 */
export function isSubmissionStatus(
    value: unknown,
): value is SubmissionStatusEnum {
    const valid: SubmissionStatusEnum[] = ['PENDING', 'APPROVED', 'REJECTED']
    return (
        typeof value === 'string' &&
        valid.includes(value as SubmissionStatusEnum)
    )
}
