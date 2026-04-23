/** tRPC business logic tests — liability payments, HEMS approve/deny, trust accounting conversion, distributions, pending inventory. */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import {
    bankAccount,
    beneficiary,
    distribution,
    entity,
    hemsRequest,
    liability,
    liabilityPayment,
    personalProperty,
    trustAccounting,
} from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext } from '../helpers/mock-context'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

/** Create a tRPC caller with admin context (no real auth session) */
function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '999',
            name: 'Test Admin Biz',
            email: 'admin-biz@test.com',
        }),
    )
}

const testData = {
    entityId: null as number | null,
    bankAccountId: null as number | null,
    liabilityId: null as number | null,
    nullishLiabilityId: null as number | null,
    beneficiaryId: null as number | null,
    hemsRequestIds: [] as number[],
    distributionIds: [] as number[],
    trustAccountingIds: [] as number[],
    personalPropertyIds: [] as number[],
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe.skipIf(isProductionDb)('Business Logic', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()
        const ts = Date.now().toString().slice(-8)

        const [e1] = await db
            .insert(entity)
            .values({
                name: `BizLogic Test Trust ${ts}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                ein: `99-${ts}`.slice(0, 10),
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId = e1.id

        const [ba1] = await db
            .insert(bankAccount)
            .values({
                entityId: testData.entityId,
                institution: 'BizLogic Test Bank',
                accountType: 'CHECKING',
                accountNumber: `BIZ${ts}`,
                currentBalance: '100000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.bankAccountId = ba1.id

        const [l1] = await db
            .insert(liability)
            .values({
                entityId: testData.entityId,
                liabilityType: 'LOAN',
                creditor: 'Test Creditor',
                originalAmount: '10000.00',
                currentBalance: '10000.00',
                allocationClass: 'PRINCIPAL',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.liabilityId = l1.id

        const [ben1] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId,
                firstName: 'BizLogic',
                lastName: 'TestBen',
                email: `bizlogic-test-${ts}@example.com`,
                relationship: 'CHILD',
                sharePercent: '50.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId = ben1.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Reverse FK order
        if (testData.liabilityId) {
            await db
                .delete(liabilityPayment)
                .where(eq(liabilityPayment.liabilityId, testData.liabilityId))
        }
        if (testData.nullishLiabilityId) {
            await db
                .delete(liabilityPayment)
                .where(
                    eq(
                        liabilityPayment.liabilityId,
                        testData.nullishLiabilityId,
                    ),
                )
        }

        if (testData.entityId) {
            await db
                .delete(trustAccounting)
                .where(eq(trustAccounting.entityId, testData.entityId))
        }

        for (const id of testData.hemsRequestIds) {
            await db.delete(hemsRequest).where(eq(hemsRequest.id, id))
        }

        // Delete all for entity, including auto-created distributions from HEMS approval
        if (testData.entityId) {
            await db
                .delete(distribution)
                .where(eq(distribution.entityId, testData.entityId))
        }

        for (const id of testData.personalPropertyIds) {
            await db.delete(personalProperty).where(eq(personalProperty.id, id))
        }

        if (testData.beneficiaryId) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId))
        }

        if (testData.liabilityId) {
            await db
                .delete(liability)
                .where(eq(liability.id, testData.liabilityId))
        }
        if (testData.nullishLiabilityId) {
            await db
                .delete(liability)
                .where(eq(liability.id, testData.nullishLiabilityId))
        }

        if (testData.bankAccountId) {
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.id, testData.bankAccountId))
        }

        if (testData.entityId) {
            await db.delete(entity).where(eq(entity.id, testData.entityId))
        }
    }, TEST_TIMEOUT)

    // =========================================================================
    // 1. LIABILITY PAYMENT RECORDING
    // =========================================================================

    describe('liability payment recording', () => {
        test(
            'recordPayment decreases liability balance and creates payment + accounting entry',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                const result = await caller.liability.recordPayment({
                    entityId: testData.entityId!,
                    liabilityId: testData.liabilityId!,
                    bankAccountId: testData.bankAccountId!,
                    amount: '1000.00',
                    principalPortion: '800.00',
                    interestPortion: '200.00',
                    paymentDate: today,
                    paymentMethod: 'CHECK',
                })

                expect(result).toBeDefined()
                expect(result.payment).toBeDefined()
                expect(result.payment.amount).toBe('1000.00')
                expect(result.payment.principalPortion).toBe('800.00')
                expect(result.payment.interestPortion).toBe('200.00')

                expect(result.liability).toBeDefined()
                expect(
                    parseFloat(result.liability.currentBalance),
                ).toBeLessThan(10000.0)

                expect(result.accountingEntry).toBeDefined()
                expect(result.accountingEntry).not.toBeNull()

                const accountingEntries = await caller.trustAccounting.list({
                    entityId: testData.entityId!,
                })
                const expenseEntry = accountingEntries.find(
                    (e) =>
                        e.sourceAssetType === 'LIABILITY' &&
                        e.sourceAssetId === testData.liabilityId,
                )
                expect(expenseEntry).toBeDefined()
                expect(expenseEntry!.entryType).toBe('EXPENSE')
                expect(expenseEntry!.amount).toBe('1000.00')
                expect(expenseEntry!.bankAccountId).toBe(testData.bankAccountId)
            },
            TEST_TIMEOUT,
        )

        test(
            'recordPayment with a second payment further reduces balance',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                const result = await caller.liability.recordPayment({
                    entityId: testData.entityId!,
                    liabilityId: testData.liabilityId!,
                    bankAccountId: testData.bankAccountId!,
                    amount: '500.00',
                    principalPortion: '400.00',
                    interestPortion: '100.00',
                    paymentDate: today,
                    paymentMethod: 'ACH',
                })

                expect(result.payment.amount).toBe('500.00')
                // After two payments of 1000 + 500, balance should be significantly reduced
                expect(
                    parseFloat(result.liability.currentBalance),
                ).toBeLessThan(9000.0)
            },
            TEST_TIMEOUT,
        )

        test(
            'liability balance reflects cumulative payments',
            async () => {
                const caller = adminCaller()
                const liabilityRecord = await caller.liability.list({
                    entityId: testData.entityId!,
                })
                const updatedLiability = liabilityRecord.find(
                    (l) => l.id === testData.liabilityId,
                )

                expect(updatedLiability).toBeDefined()
                // Original was 10000, two payments with principal portions of 800 and 400.
                // Only the principal portion reduces the balance: 10000 - 800 - 400 = 8800
                expect(
                    parseFloat(updatedLiability!.currentBalance!),
                ).toBeLessThanOrEqual(8800.0)
            },
            TEST_TIMEOUT,
        )

        test(
            'recordPayment with principalPortion="0.00" does NOT trigger auto-calculation',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                // Create a liability with interest rate so auto-calc would trigger if principalPortion were null
                const [liabWithRate] = await db
                    .insert(liability)
                    .values({
                        entityId: testData.entityId!,
                        liabilityType: 'MORTGAGE',
                        creditor: 'Nullish Test Lender',
                        originalAmount: '50000.00',
                        currentBalance: '50000.00',
                        interestRate: '5.00',
                        allocationClass: 'PRINCIPAL',
                        status: 'ACTIVE',
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                testData.nullishLiabilityId = liabWithRate.id

                const result = await caller.liability.recordPayment({
                    entityId: testData.entityId!,
                    liabilityId: liabWithRate.id,
                    bankAccountId: testData.bankAccountId!,
                    amount: '1000.00',
                    principalPortion: '0.00',
                    interestPortion: '1000.00',
                    paymentDate: today,
                    paymentMethod: 'ACH',
                })

                // With principalPortion="0.00", auto-calc should NOT trigger
                // so autoCalculated should be null
                expect(result.autoCalculated).toBeNull()
                // And principalPortion should be exactly "0.00"
                expect(result.payment.principalPortion).toBe('0.00')
                // Balance should not decrease (principal portion is 0)
                expect(parseFloat(result.liability.currentBalance)).toBe(
                    50000.0,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'recordPayment with principalPortion=null triggers auto-calculation when interest rate exists',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                // Use the liability with interest rate created above
                const result = await caller.liability.recordPayment({
                    entityId: testData.entityId!,
                    liabilityId: testData.nullishLiabilityId!,
                    bankAccountId: testData.bankAccountId!,
                    amount: '1000.00',
                    // principalPortion not provided (undefined) -> should auto-calculate
                    paymentDate: today,
                    paymentMethod: 'ACH',
                })

                // Auto-calc should have triggered since principalPortion is undefined
                expect(result.autoCalculated).not.toBeNull()
                expect(result.autoCalculated!.principal).toBeDefined()
                expect(result.autoCalculated!.interest).toBeDefined()
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 2. HEMS REQUEST APPROVE / DENY
    // =========================================================================

    describe('HEMS request approve/deny workflow', () => {
        test(
            'create a HEMS request in PENDING status',
            async () => {
                const caller = adminCaller()
                const created = await caller.hemsRequest.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    category: 'HEALTH',
                    amountRequested: '5000.00',
                    justification: 'Medical expenses for surgery',
                })

                expect(created).toBeDefined()
                expect(created.id).toBeDefined()
                expect(created.status).toBe('PENDING')
                expect(created.category).toBe('HEALTH')
                expect(created.amountRequested).toBe('5000.00')
                expect(created.beneficiaryId).toBe(testData.beneficiaryId)
                testData.hemsRequestIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'HEMS request appears in pending queue',
            async () => {
                const caller = adminCaller()
                const pending = await caller.hemsRequest.pending({
                    entityId: testData.entityId!,
                })

                const found = pending.find(
                    (r) => r.id === testData.hemsRequestIds[0],
                )
                expect(found).toBeDefined()
                expect(found!.status).toBe('PENDING')
            },
            TEST_TIMEOUT,
        )

        test(
            'approve sets status to APPROVED with approvedAmount and reviewNotes',
            async () => {
                const caller = adminCaller()
                const hemsId = testData.hemsRequestIds[0]!
                const approved = await caller.hemsRequest.approve({
                    id: hemsId,
                    entityId: testData.entityId!,
                    approvedAmount: '5000.00',
                    reviewNotes: 'Approved - valid medical expense',
                })

                expect(approved).toBeDefined()
                expect(approved.status).toBe('APPROVED')
                expect(approved.approvedAmount).toBe('5000.00')
                expect(approved.reviewNotes).toBe(
                    'Approved - valid medical expense',
                )
                expect(approved.reviewedAt).toBeDefined()
            },
            TEST_TIMEOUT,
        )

        test(
            'approved request no longer appears in pending queue',
            async () => {
                const caller = adminCaller()
                const pending = await caller.hemsRequest.pending({
                    entityId: testData.entityId!,
                })

                const found = pending.find(
                    (r) => r.id === testData.hemsRequestIds[0],
                )
                expect(found).toBeUndefined()
            },
            TEST_TIMEOUT,
        )

        test(
            'deny sets status to DENIED with reviewNotes',
            async () => {
                const caller = adminCaller()

                const created = await caller.hemsRequest.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    category: 'SUPPORT',
                    amountRequested: '10000.00',
                    justification: 'Vacation expenses',
                })
                testData.hemsRequestIds.push(created.id)

                const denied = await caller.hemsRequest.deny({
                    id: created.id,
                    entityId: testData.entityId!,
                    reviewNotes: 'Denied - vacation is not covered under HEMS',
                })

                expect(denied).toBeDefined()
                expect(denied.status).toBe('DENIED')
                expect(denied.reviewNotes).toBe(
                    'Denied - vacation is not covered under HEMS',
                )
                expect(denied.reviewedAt).toBeDefined()
            },
            TEST_TIMEOUT,
        )

        test(
            'approve with partial amount sets correct approvedAmount',
            async () => {
                const caller = adminCaller()

                const created = await caller.hemsRequest.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    category: 'EDUCATION',
                    amountRequested: '8000.00',
                    justification: 'Tuition payment',
                })
                testData.hemsRequestIds.push(created.id)

                const approved = await caller.hemsRequest.approve({
                    id: created.id,
                    entityId: testData.entityId!,
                    approvedAmount: '6000.00',
                    reviewNotes: 'Partial approval - approved tuition only',
                })

                expect(approved.status).toBe('APPROVED')
                expect(approved.approvedAmount).toBe('6000.00')
                expect(approved.amountRequested).toBe('8000.00')
            },
            TEST_TIMEOUT,
        )

        test(
            'approve throws NOT_FOUND for wrong entityId',
            async () => {
                const caller = adminCaller()
                const created = await caller.hemsRequest.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    category: 'MAINTENANCE',
                    amountRequested: '2000.00',
                    justification: 'Home repair',
                })
                testData.hemsRequestIds.push(created.id)

                try {
                    await caller.hemsRequest.approve({
                        id: created.id,
                        entityId: 999999, // nonexistent entity
                        approvedAmount: '2000.00',
                    })
                    expect(true).toBe(false)
                } catch (err) {
                    expect(err).toBeInstanceOf(TRPCError)
                    expect((err as TRPCError).code).toBe('NOT_FOUND')
                }
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 3. TRUST ACCOUNTING CRUD + YEAR-END CONVERSION
    // =========================================================================

    describe('trust accounting CRUD and income-to-principal conversion', () => {
        test(
            'create an INCOME entry',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString()

                const created = await caller.trustAccounting.createEntry({
                    entityId: testData.entityId!,
                    bankAccountId: testData.bankAccountId!,
                    entryType: 'INCOME',
                    amount: '1000.00',
                    description: 'Test rental income',
                    isPrincipal: false,
                    accountingDate: today,
                    fiscalYear: new Date().getFullYear(),
                })

                expect(created).toBeDefined()
                expect(created.id).toBeDefined()
                expect(created.entryType).toBe('INCOME')
                expect(created.amount).toBe('1000.00')
                expect(created.isPrincipal).toBe(false)
                expect(created.convertedToPrincipal).toBe(false)
                testData.trustAccountingIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'create an EXPENSE entry',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString()

                const created = await caller.trustAccounting.createEntry({
                    entityId: testData.entityId!,
                    bankAccountId: testData.bankAccountId!,
                    entryType: 'EXPENSE',
                    amount: '500.00',
                    description: 'Test property tax',
                    isPrincipal: false,
                    accountingDate: today,
                    fiscalYear: new Date().getFullYear(),
                })

                expect(created).toBeDefined()
                expect(created.entryType).toBe('EXPENSE')
                expect(created.amount).toBe('500.00')
                testData.trustAccountingIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'create a second INCOME entry for conversion test',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString()

                const created = await caller.trustAccounting.createEntry({
                    entityId: testData.entityId!,
                    bankAccountId: testData.bankAccountId!,
                    entryType: 'INCOME',
                    amount: '750.00',
                    description: 'Test dividend income',
                    isPrincipal: false,
                    accountingDate: today,
                    fiscalYear: new Date().getFullYear(),
                })

                expect(created).toBeDefined()
                expect(created.amount).toBe('750.00')
                testData.trustAccountingIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'unconvertedIncomeSummary shows unconverted income for current fiscal year',
            async () => {
                const caller = adminCaller()
                const summary =
                    await caller.trustAccounting.unconvertedIncomeSummary({
                        entityId: testData.entityId!,
                    })

                expect(summary).toBeDefined()
                expect(Array.isArray(summary)).toBe(true)

                const currentYear = summary.find(
                    (s) => s.fiscalYear === new Date().getFullYear(),
                )
                expect(currentYear).toBeDefined()
                expect(currentYear!.entryCount).toBeGreaterThanOrEqual(2)
                expect(
                    parseFloat(currentYear!.totalAmount),
                ).toBeGreaterThanOrEqual(1750.0)
            },
            TEST_TIMEOUT,
        )

        test(
            'convertIncomeToPrincipal with no unconverted entries returns zero',
            async () => {
                const caller = adminCaller()
                const emptyFiscalYear = 1999

                const result =
                    await caller.trustAccounting.convertIncomeToPrincipal({
                        entityId: testData.entityId!,
                        fiscalYear: emptyFiscalYear,
                        bankAccountId: testData.bankAccountId!,
                    })

                expect(result).toBeDefined()
                expect(result.success).toBe(true)
                expect(result.converted).toBe(0)
                expect(result.totalAmount).toBe('0.00')
                expect(result.entries).toBeDefined()
            },
            TEST_TIMEOUT,
        )

        test(
            'update a trust accounting entry',
            async () => {
                const caller = adminCaller()
                const entryId = testData.trustAccountingIds[0]!

                const updated = await caller.trustAccounting.update({
                    id: entryId,
                    entityId: testData.entityId!,
                    data: { description: 'Updated rental income description' },
                })

                expect(updated).toBeDefined()
                expect(updated.description).toBe(
                    'Updated rental income description',
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'delete a trust accounting entry',
            async () => {
                const caller = adminCaller()
                const created = await caller.trustAccounting.createEntry({
                    entityId: testData.entityId!,
                    bankAccountId: testData.bankAccountId!,
                    entryType: 'EXPENSE',
                    amount: '100.00',
                    description: 'Entry to be deleted',
                    isPrincipal: false,
                    accountingDate: new Date().toISOString(),
                    fiscalYear: new Date().getFullYear(),
                })

                const deleted = await caller.trustAccounting.delete({
                    id: created.id,
                    entityId: testData.entityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(created.id)

                const fetched = await caller.trustAccounting.byId({
                    id: created.id,
                    entityId: testData.entityId!,
                })
                expect(fetched).toBeUndefined()
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 4. DISTRIBUTION CREATE
    // =========================================================================

    describe('distribution create', () => {
        test(
            'create a distribution with correct fields',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                const created = await caller.distribution.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    amount: '1000.00',
                    distributionType: 'INCOME',
                    distributionDate: today,
                    paymentMethod: 'CHECK',
                })

                expect(created).toBeDefined()
                expect(created.id).toBeDefined()
                expect(created.beneficiaryId).toBe(testData.beneficiaryId)
                expect(created.amount).toBe('1000.00')
                expect(created.distributionType).toBe('INCOME')
                expect(created.paymentMethod).toBe('CHECK')
                testData.distributionIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'create a PRINCIPAL distribution',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString().split('T')[0]!

                const created = await caller.distribution.create({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                    amount: '2500.00',
                    distributionType: 'PRINCIPAL',
                    distributionDate: today,
                    paymentMethod: 'ACH',
                })

                expect(created).toBeDefined()
                expect(created.distributionType).toBe('PRINCIPAL')
                expect(created.amount).toBe('2500.00')
                expect(created.paymentMethod).toBe('ACH')
                testData.distributionIds.push(created.id)
            },
            TEST_TIMEOUT,
        )

        test(
            'distribution appears in list for the entity',
            async () => {
                const caller = adminCaller()
                const distributions = await caller.distribution.list({
                    entityId: testData.entityId!,
                })

                const found = distributions.find(
                    (d) => d.id === testData.distributionIds[0],
                )
                expect(found).toBeDefined()
                expect(found!.amount).toBe('1000.00')
            },
            TEST_TIMEOUT,
        )

        test(
            'distribution byId returns the correct record',
            async () => {
                const caller = adminCaller()
                const distId = testData.distributionIds[0]!
                const fetched = await caller.distribution.byId({
                    id: distId,
                    entityId: testData.entityId!,
                })

                expect(fetched).toBeDefined()
                expect(fetched!.id).toBe(distId)
                expect(fetched!.amount).toBe('1000.00')
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 5. (removed 2026-04-23) Pending queue workflow — direct-submission
    // now inserts into personal_property; see tests/api/submit-inventory-item.test.ts.
    // =========================================================================
})
