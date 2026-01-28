import { sql } from 'drizzle-orm'
import {
    bigint,
    boolean,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    numeric,
    pgEnum,
    pgPolicy,
    pgTable,
    text,
    timestamp,
    unique,
    uniqueIndex,
} from 'drizzle-orm/pg-core'

export const accountingEntryType = pgEnum('AccountingEntryType', [
    'INCOME',
    'EXPENSE',
])
export const allocationClass = pgEnum('AllocationClass', [
    'PRINCIPAL',
    'INCOME',
])
export const distributionStandard = pgEnum('DistributionStandard', [
    'HEMS',
    'HEMS_PLUS_WITHDRAWAL',
    'BROADER',
    'WITHDRAWAL_ONLY',
])
export const distributionType = pgEnum('DistributionType', [
    'INCOME',
    'PRINCIPAL',
    'CAPITAL_GAIN',
    'EXPENSE_REIMBURSEMENT',
    'OTHER',
])
export const documentType = pgEnum('DocumentType', [
    'DEED',
    'TITLE',
    'STATEMENT',
    'CONTRACT',
    'LEGAL',
    'OTHER',
])
export const entityType = pgEnum('EntityType', [
    'TRUST',
    'LLC',
    'CORPORATION',
    'PARTNERSHIP',
    'INDIVIDUAL',
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
export const hemsRequestStatus = pgEnum('HemsRequestStatus', [
    'PENDING',
    'APPROVED',
    'DENIED',
    'DISTRIBUTED',
    'CANCELLED',
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
export const insurancePolicyType = pgEnum('InsurancePolicyType', [
    'LIFE',
    'PROPERTY',
    'AUTO',
    'UMBRELLA',
    'LIABILITY',
    'HEALTH',
    'OTHER',
])
export const itemCondition = pgEnum('ItemCondition', [
    'excellent',
    'good',
    'fair',
    'poor',
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
export const logAction = pgEnum('LogAction', [
    'INSERT',
    'UPDATE',
    'DELETE',
    'SIGN_IN',
    'SIGN_OUT',
    'FAILED_AUTH',
    'ACCESS_DENIED',
])
export const paymentMethod = pgEnum('PaymentMethod', [
    'CHECK',
    'ACH',
    'WIRE',
    'CASH',
    'OTHER',
])
export const personalPropertyCategory = pgEnum('PersonalPropertyCategory', [
    'JEWELRY',
    'ART',
    'COLLECTIBLES',
    'ELECTRONICS',
    'FURNITURE',
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
export const relationshipType = pgEnum('RelationshipType', [
    'CHILD',
    'STEPCHILD',
    'GRANDCHILD',
    'OTHER',
])
export const rentalStatus = pgEnum('RentalStatus', [
    'RENTED',
    'VACANT',
    'UNDER_RENOVATION',
    'LISTED',
])
export const submissionStatus = pgEnum('SubmissionStatus', [
    'PENDING',
    'APPROVED',
    'REJECTED',
])
export const titleStatus = pgEnum('TitleStatus', [
    'CLEAR',
    'LIEN',
    'PENDING_TRANSFER',
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
export const trustType = pgEnum('TrustType', ['REVOCABLE', 'IRREVOCABLE'])
export const trusteeFeeStatus = pgEnum('TrusteeFeeStatus', [
    'ACCRUED',
    'APPROVED',
    'PAID',
])
export const trusteeStatus = pgEnum('TrusteeStatus', [
    'ACTIVE',
    'SUCCESSOR',
    'ARBITER',
    'RESIGNED',
    'REMOVED',
    'DECEASED',
])
export const userRole = pgEnum('UserRole', ['admin', 'beneficiary'])
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
export const withdrawalStatus = pgEnum('WithdrawalStatus', [
    'ELIGIBLE',
    'PARTIAL',
    'COMPLETE',
    'NOT_YET_ELIGIBLE',
])

export const artwork = pgTable(
    'artwork',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'artwork_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        title: text().notNull(),
        artist: text(),
        medium: text(),
        dimensions: text(),
        acquisitionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        acquisitionCost: numeric({ precision: 12, scale: 2 }),
        location: text(),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        dodValueType: valuationType(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        status: recordStatus().default('ACTIVE').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_artwork_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_artwork_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'artwork_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
)

export const pendingInventoryItem = pgTable(
    'pending_inventory_item',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'pending_inventory_item_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        name: text().notNull(),
        category: personalPropertyCategory().notNull(),
        description: text(),
        estimatedValue: numeric({ precision: 12, scale: 2 }),
        condition: itemCondition().notNull(),
        photoPath1: text(),
        photoPath2: text(),
        photoPath3: text(),
        photoPath4: text(),
        photoPath5: text(),
        aiConfidence: text(),
        aiSuggested: boolean().default(false).notNull(),
        status: submissionStatus().default('PENDING').notNull(),
        reviewNotes: text(),
        approvedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        approvedById: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }),
        submitterName: text(),
        submitterEmail: text(),
        submitterPhone: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        valueRangeLow: numeric({ precision: 12, scale: 2 }),
        valueRangeHigh: numeric({ precision: 12, scale: 2 }),
        aiBrand: text(),
        aiModel: text(),
        aiEra: text(),
        aiMaterials: text(),
        aiValuationRationale: text(),
        aiConditionNotes: text(),
    },
    (table) => [
        index('idx_pending_inventory_item_created_at').using(
            'btree',
            table.createdAt.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_pending_inventory_item_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_pending_inventory_item_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'pending_inventory_item_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
)

export const entity = pgTable(
    'entity',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'entity_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        name: text().notNull(),
        entityType: entityType().notNull(),
        trustType: trustType(),
        grantorName: text(),
        decedent: text(),
        dod: timestamp({ precision: 3, withTimezone: true, mode: 'string' }),
        originalDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        restatedDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        governingLaw: text(),
        hasNoContestClause: boolean().default(false),
        hasSpendthriftProvision: boolean().default(false),
        ein: text(),
        formationDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        stateOfFormation: text(),
        registeredAgent: text(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        parentEntityId: bigint({ mode: 'number' }),
        status: recordStatus().default('ACTIVE').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_entity_parent_entity_id').using(
            'btree',
            table.parentEntityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_entity_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const homestead = pgTable(
    'homestead',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'homestead_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        streetAddress: text().notNull(),
        city: text().notNull(),
        state: text().notNull(),
        zip: text().notNull(),
        county: text(),
        parcelNumber: text(),
        legalDescription: text(),
        propertyType: propertyType().notNull(),
        yearBuilt: integer(),
        squareFeet: integer(),
        lotSizeAcres: numeric({ precision: 10, scale: 4 }),
        bedrooms: integer(),
        bathrooms: numeric({ precision: 3, scale: 1 }),
        acquisitionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        acquisitionCost: numeric({ precision: 12, scale: 2 }),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        dodValueType: valuationType(),
        dodAffidavitFiled: boolean().default(false),
        dodAffidavitDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        clerkFileNo: text(),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_homestead_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_homestead_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const task = pgTable(
    'task',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'task_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        title: text().notNull(),
        category: text().default('OTHER').notNull(),
        completed: boolean().default(false).notNull(),
        notes: text(),
        dueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        sortOrder: integer().default(0).notNull(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_task_category').using(
            'btree',
            table.category.asc().nullsLast().op('text_ops'),
        ),
        index('idx_task_completed').using(
            'btree',
            table.completed.asc().nullsLast().op('bool_ops'),
        ),
        index('idx_task_due_date').using(
            'btree',
            table.dueDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_task_incomplete_due').using(
            'btree',
            table.completed.asc().nullsLast().op('bool_ops'),
            table.dueDate.desc().nullsLast().op('timestamptz_ops'),
        ),
    ],
)

export const rentalProperty = pgTable(
    'rental_property',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'rental_property_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        name: text().notNull(),
        streetAddress: text().notNull(),
        city: text().notNull(),
        state: text().notNull(),
        zip: text().notNull(),
        county: text(),
        parcelNumber: text(),
        propertyType: propertyType().notNull(),
        units: integer().default(1).notNull(),
        squareFeet: integer(),
        lotSizeAcres: numeric({ precision: 10, scale: 4 }),
        yearBuilt: integer(),
        rentalStatus: rentalStatus().default('RENTED').notNull(),
        monthlyRent: numeric({ precision: 10, scale: 2 }),
        leaseStart: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        leaseEnd: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        propertyManager: text(),
        acquisitionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        acquisitionCost: numeric({ precision: 12, scale: 2 }),
        mortgageBalance: numeric({ precision: 12, scale: 2 }),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        dodValueType: valuationType(),
        dodAffidavitFiled: boolean().default(false),
        dodAffidavitDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        clerkFileNo: text(),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_rental_property_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_rental_property_status').using(
            'btree',
            table.rentalStatus.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'rental_property_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
)

export const specificBequest = pgTable(
    'specific_bequest',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'specific_bequest_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint({ mode: 'number' }),
        description: text().notNull(),
        category: text(),
        recipientName: text(),
        dateDistributed: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_specific_bequest_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_specific_bequest_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
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
    ],
)

export const account = pgTable(
    'account',
    {
        id: text().primaryKey().notNull(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: text('user_id').notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', {
            withTimezone: true,
            mode: 'string',
        }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
            withTimezone: true,
            mode: 'string',
        }),
        scope: text(),
        password: text(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
    },
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

export const insurancePolicy = pgTable(
    'insurance_policy',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'insurance_policy_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        policyType: insurancePolicyType().notNull(),
        carrier: text().notNull(),
        policyNumber: text().notNull(),
        coverageAmount: numeric({ precision: 12, scale: 2 }),
        premium: numeric({ precision: 10, scale: 2 }),
        premiumFrequency: premiumFrequency(),
        effectiveDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        expirationDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        insuredAsset: text(),
        beneficiaries: text(),
        status: recordStatus().default('ACTIVE').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_insurance_policy_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_insurance_policy_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'insurance_policy_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
)

export const trustee = pgTable(
    'trustee',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'trustee_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        contactId: bigint({ mode: 'number' }),
        name: text().notNull(),
        email: text(),
        phone: text(),
        dob: timestamp({ precision: 3, withTimezone: true, mode: 'string' }),
        status: trusteeStatus().default('ACTIVE'),
        order: integer().notNull(),
        isCo: boolean().default(false),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        coTrusteeId: bigint({ mode: 'number' }),
        startDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        endDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_trustee_co_trustee_id').using(
            'btree',
            table.coTrusteeId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trustee_contact_id').using(
            'btree',
            table.contactId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trustee_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trustee_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
    ],
)

export const contactAssociation = pgTable(
    'contact_association',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'contact_association_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        contactId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }),
        relationship: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [
        index('idx_contact_association_contact_id').using(
            'btree',
            table.contactId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_contact_association_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
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
    ],
)

export const liabilityPayment = pgTable(
    'liability_payment',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'liability_payment_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        liabilityId: bigint({ mode: 'number' }).notNull(),
        paymentDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        amount: numeric({ precision: 12, scale: 2 }).notNull(),
        principalPortion: numeric({ precision: 12, scale: 2 }),
        interestPortion: numeric({ precision: 12, scale: 2 }),
        escrowPortion: numeric({ precision: 12, scale: 2 }),
        paymentMethod: paymentMethod(),
        checkNumber: text(),
        confirmationNumber: text(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [
        index('idx_liability_payment_date').using(
            'btree',
            table.paymentDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_liability_payment_liability_date').using(
            'btree',
            table.liabilityId.asc().nullsLast().op('int8_ops'),
            table.paymentDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_liability_payment_liability_id').using(
            'btree',
            table.liabilityId.asc().nullsLast().op('int8_ops'),
        ),
        foreignKey({
            columns: [table.liabilityId],
            foreignColumns: [liability.id],
            name: 'liability_payment_liability_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
)

export const personalProperty = pgTable(
    'personal_property',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'personal_property_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        name: text().notNull(),
        description: text(),
        category: personalPropertyCategory().notNull(),
        location: text(),
        acquisitionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        acquisitionCost: numeric({ precision: 12, scale: 2 }),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        dodValueType: valuationType(),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_personal_property_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_personal_property_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'personal_property_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
    ],
)

export const trusteeFeeEntry = pgTable(
    'trustee_fee_entry',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'trustee_fee_entry_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        trusteeId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        scheduleId: bigint({ mode: 'number' }),
        periodStart: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        periodEnd: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        assetFee: numeric({ precision: 14, scale: 2 }).default('0'),
        assetBasis: numeric({ precision: 14, scale: 2 }),
        incomeFee: numeric({ precision: 14, scale: 2 }).default('0'),
        incomeBasis: numeric({ precision: 14, scale: 2 }),
        hoursWorked: numeric({ precision: 6, scale: 2 }).default('0'),
        hourlyFee: numeric({ precision: 14, scale: 2 }).default('0'),
        executorFee: numeric({ precision: 14, scale: 2 }).default('0'),
        totalFee: numeric({ precision: 14, scale: 2 }).notNull(),
        status: trusteeFeeStatus().default('ACCRUED').notNull(),
        paidDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        paymentMethod: paymentMethod(),
        checkNumber: text(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_trustee_fee_entry_entity').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trustee_fee_entry_entity_status').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_trustee_fee_entry_period').using(
            'btree',
            table.periodStart.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_trustee_fee_entry_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_trustee_fee_entry_trustee').using(
            'btree',
            table.trusteeId.asc().nullsLast().op('int8_ops'),
        ),
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
    ],
)

export const trusteeFeeSchedule = pgTable(
    'trustee_fee_schedule',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'trustee_fee_schedule_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        trusteeId: bigint({ mode: 'number' }).notNull(),
        executorFeePercent: numeric({ precision: 5, scale: 2 }).default('5.0'),
        annualAssetPercent: numeric({ precision: 5, scale: 2 }).default('1.5'),
        incomePercent: numeric({ precision: 5, scale: 2 }).default('8.0'),
        hourlyRate: numeric({ precision: 10, scale: 2 }).default('125.00'),
        effectiveDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        endDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [
        index('idx_trustee_fee_schedule_effective').using(
            'btree',
            table.effectiveDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_trustee_fee_schedule_entity').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trustee_fee_schedule_entity_trustee').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.trusteeId.asc().nullsLast().op('int8_ops'),
            table.effectiveDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_trustee_fee_schedule_trustee').using(
            'btree',
            table.trusteeId.asc().nullsLast().op('int8_ops'),
        ),
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
    ],
)

export const verification = pgTable('verification', {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expires_at', {
        withTimezone: true,
        mode: 'string',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
})

export const trustAccounting = pgTable(
    'trust_accounting',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'trust_accounting_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        accountingDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        entryType: accountingEntryType().notNull(),
        incomeType: incomeType(),
        expenseType: expenseType(),
        amount: numeric({ precision: 14, scale: 2 }).notNull(),
        description: text().notNull(),
        sourceAssetType: text(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        sourceAssetId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        bankAccountId: bigint({ mode: 'number' }).notNull(),
        isPrincipal: boolean().default(false),
        taxDeductible: boolean().default(false),
        documentPath: text(),
        vendor: text(),
        checkNumber: text(),
        reconciled: boolean().default(false),
        reconciledDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        fiscalYear: integer(),
        convertedToPrincipal: boolean().default(false),
        conversionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        conversionEntryId: bigint({ mode: 'number' }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_trust_accounting_bank_account').using(
            'btree',
            table.bankAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trust_accounting_created_at_brin').using(
            'brin',
            table.createdAt.asc().nullsLast().op('timestamptz_minmax_ops'),
        ),
        index('idx_trust_accounting_date').using(
            'btree',
            table.accountingDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_trust_accounting_entity_date').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.accountingDate.desc().nullsLast().op('int8_ops'),
        ),
        index('idx_trust_accounting_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trust_accounting_entity_type').using(
            'btree',
            table.entityId.asc().nullsLast().op('enum_ops'),
            table.entryType.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_trust_accounting_entry_type').using(
            'btree',
            table.entryType.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_trust_accounting_unconverted').using(
            'btree',
            table.entityId.asc().nullsLast().op('bool_ops'),
            table.entryType.asc().nullsLast().op('bool_ops'),
            table.isPrincipal.asc().nullsLast().op('bool_ops'),
            table.convertedToPrincipal.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.entityId],
            foreignColumns: [entity.id],
            name: 'trust_accounting_entity_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('restrict'),
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
)

export const vehicle = pgTable(
    'vehicle',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'vehicle_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        year: integer().notNull(),
        make: text().notNull(),
        model: text().notNull(),
        vin: text().notNull(),
        color: text(),
        titleStatus: titleStatus().default('CLEAR').notNull(),
        licensePlate: text(),
        mileage: integer(),
        acquisitionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        acquisitionCost: numeric({ precision: 12, scale: 2 }),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        dodValueType: valuationType(),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        uniqueIndex('Vehicle_vin_key').using(
            'btree',
            table.vin.asc().nullsLast().op('text_ops'),
        ),
        index('idx_vehicle_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_vehicle_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const withdrawalRecord = pgTable(
    'withdrawal_record',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'withdrawal_record_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        withdrawalType: text().notNull(),
        eligibleDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        eligibleAmount: numeric({ precision: 14, scale: 2 }).notNull(),
        withdrawnAmount: numeric({ precision: 14, scale: 2 }).default('0'),
        remainingAmount: numeric({ precision: 14, scale: 2 }),
        status: withdrawalStatus().default('NOT_YET_ELIGIBLE'),
        exercisedDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        distributionId: bigint({ mode: 'number' }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_withdrawal_record_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_withdrawal_record_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const activityLog = pgTable(
    'activity_log',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'activity_log_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        tableName: text().notNull(),
        recordId: text().notNull(),
        action: logAction().notNull(),
        oldValues: jsonb(),
        newValues: jsonb(),
        changedBy: text().default('system').notNull(),
        ipAddress: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [
        index('idx_activity_log_action').using(
            'btree',
            table.action.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_activity_log_created_at').using(
            'btree',
            table.createdAt.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_activity_log_created_at_brin').using(
            'brin',
            table.createdAt.asc().nullsLast().op('timestamptz_minmax_ops'),
        ),
        index('idx_activity_log_new_values_gin').using(
            'gin',
            table.newValues.asc().nullsLast().op('jsonb_ops'),
        ),
        index('idx_activity_log_old_values_gin').using(
            'gin',
            table.oldValues.asc().nullsLast().op('jsonb_ops'),
        ),
        index('idx_activity_log_record_id').using(
            'btree',
            table.recordId.asc().nullsLast().op('text_ops'),
        ),
        index('idx_activity_log_table_name').using(
            'btree',
            table.tableName.asc().nullsLast().op('text_ops'),
        ),
        index('idx_activity_log_table_record').using(
            'btree',
            table.tableName.asc().nullsLast().op('text_ops'),
            table.recordId.asc().nullsLast().op('text_ops'),
        ),
    ],
)

export const contact = pgTable(
    'contact',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'contact_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        name: text().notNull(),
        company: text(),
        role: text().notNull(),
        email: text(),
        phone: text(),
        dob: timestamp({ precision: 3, withTimezone: true, mode: 'string' }),
        streetAddress: text(),
        city: text(),
        state: text(),
        zip: text(),
        licenseNo: text(),
        barNo: text(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_contact_email').using(
            'btree',
            table.email.asc().nullsLast().op('text_ops'),
        ),
        index('idx_contact_name').using(
            'btree',
            table.name.asc().nullsLast().op('text_ops'),
        ),
        index('idx_contact_role').using(
            'btree',
            table.role.asc().nullsLast().op('text_ops'),
        ),
    ],
)

export const document = pgTable(
    'document',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'document_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        name: text().notNull(),
        documentType: documentType().notNull(),
        filePath: text().notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        vehicleId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        homesteadId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        rentalPropertyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        bankAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        investmentAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        insurancePolicyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        personalPropertyId: bigint({ mode: 'number' }),
        documentDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        expirationDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_document_bank_account_id').using(
            'btree',
            table.bankAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_homestead_id').using(
            'btree',
            table.homesteadId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_insurance_policy_id').using(
            'btree',
            table.insurancePolicyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_investment_account_id').using(
            'btree',
            table.investmentAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_personal_property_id').using(
            'btree',
            table.personalPropertyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_rental_property_id').using(
            'btree',
            table.rentalPropertyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_document_vehicle_id').using(
            'btree',
            table.vehicleId.asc().nullsLast().op('int8_ops'),
        ),
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
        check(
            'document_single_owner_check',
            sql`(((((((
CASE
    WHEN ("entityId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("insurancePolicyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("personalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1`,
        ),
    ],
)

export const userProfile = pgTable(
    'user_profile',
    {
        userId: text('user_id').primaryKey().notNull(),
        role: userRole().default('beneficiary').notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index('idx_user_profile_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_user_profile_role').using(
            'btree',
            table.role.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'user_profile_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
)

export const distribution = pgTable(
    'distribution',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'distribution_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        distributionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        amount: numeric({ precision: 12, scale: 2 }).notNull(),
        distributionType: distributionType().notNull(),
        hemsCategory: text(),
        hemsJustification: text(),
        isWithdrawal: boolean().default(false),
        withdrawalPercent: integer(),
        sourceDescription: text(),
        checkNumber: text(),
        paymentMethod: paymentMethod().notNull(),
        taxReported: boolean().default(false).notNull(),
        tax1099Issued: boolean().default(false).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        documentId: bigint({ mode: 'number' }),
        supportingDocPath: text(),
        approvedBy: text(),
        approvalDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_distribution_beneficiary_date').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
            table.distributionDate.desc().nullsLast().op('int8_ops'),
        ),
        index('idx_distribution_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_distribution_date').using(
            'btree',
            table.distributionDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_distribution_entity_date').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.distributionDate.desc().nullsLast().op('timestamptz_ops'),
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
)

export const hemsRequest = pgTable(
    'hems_request',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'hems_request_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint({ mode: 'number' }).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        category: text().notNull(),
        amountRequested: numeric({ precision: 14, scale: 2 }).notNull(),
        justification: text().notNull(),
        supportingDocPath: text(),
        status: hemsRequestStatus().default('PENDING').notNull(),
        reviewedBy: text(),
        reviewedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        reviewNotes: text(),
        approvedAmount: numeric({ precision: 14, scale: 2 }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        distributionId: bigint({ mode: 'number' }),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_hems_request_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_hems_request_beneficiary_status').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_hems_request_distribution_id').using(
            'btree',
            table.distributionId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_hems_request_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_hems_request_entity_status_created').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.status.asc().nullsLast().op('enum_ops'),
            table.createdAt.desc().nullsLast().op('enum_ops'),
        ),
        index('idx_hems_request_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
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
)

export const bankAccount = pgTable(
    'bank_account',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'bank_account_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        institution: text().notNull(),
        accountType: text().notNull(),
        accountName: text(),
        accountNumber: text().notNull(),
        routingNumber: text(),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        currentBalance: numeric({ precision: 14, scale: 2 }),
        currentBalanceDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_bank_account_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_bank_account_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const beneficiary = pgTable(
    'beneficiary',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'beneficiary_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }),
        firstName: text().notNull(),
        lastName: text().notNull(),
        relationship: text().notNull(),
        relationshipType: relationshipType(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        parentId: bigint({ mode: 'number' }),
        dob: timestamp({ precision: 3, withTimezone: true, mode: 'string' }),
        email: text(),
        phone: text(),
        streetAddress: text(),
        city: text(),
        state: text(),
        zip: text(),
        taxId: text(),
        sharePercent: numeric({ precision: 5, scale: 2 }),
        distributionStandard: distributionStandard(),
        withdrawalAge1: integer(),
        withdrawalPct1: integer(),
        withdrawalAge2: integer(),
        withdrawalPct2: integer(),
        hasSupplementalNeedsTrust: boolean().default(false),
        isPrimary: boolean().default(true),
        isContingent: boolean().default(false),
        informed: boolean().default(false),
        informedDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        releaseSigned: boolean().default(false),
        releaseDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        deceasedDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        fullName: text('full_name').generatedAlwaysAs(
            sql`(("firstName" || ' '::text) || "lastName")`,
        ),
    },
    (table) => [
        uniqueIndex('Beneficiary_taxId_key').using(
            'btree',
            table.taxId.asc().nullsLast().op('text_ops'),
        ),
        index('idx_beneficiary_entity_deceased').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.deceasedDate.asc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_beneficiary_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_beneficiary_parent_id').using(
            'btree',
            table.parentId.asc().nullsLast().op('int8_ops'),
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
)

export const investmentAccount = pgTable(
    'investment_account',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'investment_account_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        institution: text().notNull(),
        accountType: text().notNull(),
        accountName: text(),
        accountNumber: text().notNull(),
        dodValue: numeric({ precision: 14, scale: 2 }),
        dodValueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        costBasis: numeric({ precision: 14, scale: 2 }),
        currentBalance: numeric({ precision: 14, scale: 2 }),
        currentBalanceDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        status: recordStatus().default('ACTIVE').notNull(),
        transferStatus: transferStatus().default('PENDING').notNull(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_investment_account_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_investment_account_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const liability = pgTable(
    'liability',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'liability_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        entityId: bigint({ mode: 'number' }).notNull(),
        liabilityType: liabilityType().notNull(),
        creditor: text().notNull(),
        description: text(),
        originalAmount: numeric({ precision: 14, scale: 2 }).notNull(),
        currentBalance: numeric({ precision: 14, scale: 2 }).notNull(),
        currentBalanceDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        interestRate: numeric({ precision: 5, scale: 3 }),
        monthlyPayment: numeric({ precision: 12, scale: 2 }),
        dueDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        paymentDueDay: integer(),
        loanTermMonths: integer(),
        loanStartDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }),
        escrowMonthly: numeric({ precision: 12, scale: 2 }),
        isRevolvingCredit: boolean().default(false).notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        rentalPropertyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        homesteadId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        vehicleId: bigint({ mode: 'number' }),
        status: recordStatus().default('ACTIVE').notNull(),
        allocationClass: allocationClass().default('PRINCIPAL'),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        effectiveBalance: numeric('effective_balance', {
            precision: 14,
            scale: 2,
        }).generatedAlwaysAs(
            sql`("currentBalance" * ((1)::numeric + COALESCE("interestRate", (0)::numeric)))`,
        ),
    },
    (table) => [
        index('idx_liability_entity_id').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_liability_entity_status').using(
            'btree',
            table.entityId.asc().nullsLast().op('int8_ops'),
            table.status.asc().nullsLast().op('enum_ops'),
        ),
        index('idx_liability_status').using(
            'btree',
            table.status.asc().nullsLast().op('enum_ops'),
        ),
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
)

export const transaction = pgTable(
    'transaction',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'transaction_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        vehicleId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        homesteadId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        rentalPropertyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        bankAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        investmentAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        insurancePolicyId: bigint({ mode: 'number' }),
        transactionDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        transactionType: transactionType().notNull(),
        category: text().notNull(),
        amount: numeric({ precision: 12, scale: 2 }).notNull(),
        description: text(),
        vendor: text(),
        checkNumber: text(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        documentId: bigint({ mode: 'number' }),
        allocationClass: allocationClass().default('PRINCIPAL'),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
    },
    (table) => [
        index('idx_transaction_bank_account_id').using(
            'btree',
            table.bankAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_transaction_date').using(
            'btree',
            table.transactionDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_transaction_homestead_id').using(
            'btree',
            table.homesteadId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_transaction_insurance_policy_id').using(
            'btree',
            table.insurancePolicyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_transaction_investment_account_id').using(
            'btree',
            table.investmentAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_transaction_rental_property_id').using(
            'btree',
            table.rentalPropertyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_transaction_vehicle_id').using(
            'btree',
            table.vehicleId.asc().nullsLast().op('int8_ops'),
        ),
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
        check(
            'transaction_single_asset_check',
            sql`(((((
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("insurancePolicyId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1`,
        ),
    ],
)

export const user = pgTable(
    'user',
    {
        id: text().primaryKey().notNull(),
        name: text().notNull(),
        email: text().notNull(),
        emailVerified: boolean('email_verified').default(false).notNull(),
        image: text(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        role: userRole().default('beneficiary').notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
    },
    (table) => [
        index('idx_user_beneficiary_id').using(
            'btree',
            table.beneficiaryId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_user_email').using(
            'btree',
            table.email.asc().nullsLast().op('text_ops'),
        ),
        index('idx_user_role').using(
            'btree',
            table.role.asc().nullsLast().op('enum_ops'),
        ),
        foreignKey({
            columns: [table.beneficiaryId],
            foreignColumns: [beneficiary.id],
            name: 'user_beneficiary_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        unique('user_email_unique').on(table.email),
    ],
)

export const valuation = pgTable(
    'valuation',
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity({
            name: 'valuation_id_seq',
            startWith: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cache: 1,
        }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        vehicleId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        homesteadId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        rentalPropertyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        bankAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        investmentAccountId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        personalPropertyId: bigint({ mode: 'number' }),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        artworkId: bigint({ mode: 'number' }),
        valuationDate: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        value: numeric({ precision: 14, scale: 2 }).notNull(),
        valuationType: valuationType().notNull(),
        source: text(),
        notes: text(),
        createdAt: timestamp({
            precision: 3,
            withTimezone: true,
            mode: 'string',
        })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [
        index('idx_valuation_artwork_id').using(
            'btree',
            table.artworkId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_bank_account_id').using(
            'btree',
            table.bankAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_date').using(
            'btree',
            table.valuationDate.desc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_valuation_homestead_id').using(
            'btree',
            table.homesteadId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_investment_account_id').using(
            'btree',
            table.investmentAccountId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_personal_property_id').using(
            'btree',
            table.personalPropertyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_rental_property_id').using(
            'btree',
            table.rentalPropertyId.asc().nullsLast().op('int8_ops'),
        ),
        index('idx_valuation_vehicle_id').using(
            'btree',
            table.vehicleId.asc().nullsLast().op('int8_ops'),
        ),
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
        check(
            'valuation_single_asset_check',
            sql`((((((
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("personalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("artworkId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1`,
        ),
    ],
)

export const session = pgTable(
    'session',
    {
        id: text().primaryKey().notNull(),
        expiresAt: timestamp('expires_at', {
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        token: text().notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'string',
        })
            .defaultNow()
            .notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: text('user_id').notNull(),
    },
    (table) => [
        index('idx_session_expires_at').using(
            'btree',
            table.expiresAt.asc().nullsLast().op('timestamptz_ops'),
        ),
        index('idx_session_token').using(
            'btree',
            table.token.asc().nullsLast().op('text_ops'),
        ),
        index('idx_session_user_id').using(
            'btree',
            table.userId.asc().nullsLast().op('text_ops'),
        ),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [user.id],
            name: 'session_user_id_fkey',
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        unique('session_token_unique').on(table.token),
    ],
)
