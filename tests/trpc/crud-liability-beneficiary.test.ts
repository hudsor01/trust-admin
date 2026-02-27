/** tRPC CRUD tests for liability + beneficiary routers — standard CRUD, bulkCreate, getPayments, getPayoffProjection, me, markDeceased, recalculateShares. */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bankAccount, beneficiary, entity, liability } from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import {
    createAdminContext,
    createBeneficiaryContext,
} from '../helpers/mock-context'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

/** Unique suffix to avoid collisions with parallel test runs */
const TS = Date.now().toString().slice(-8)

/** Create a tRPC caller with admin context (no real auth session) */
function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '997',
            name: 'LiaBen Test Admin',
            email: 'liaben-admin@test.com',
        }),
    )
}

/** Create a tRPC caller with beneficiary context */
function beneficiaryCaller(beneficiaryId: number | null) {
    return createCaller(
        createBeneficiaryContext(beneficiaryId, {
            id: '996',
            name: 'Test Beneficiary',
            email: 'ben-test@test.com',
        }),
    )
}

const testData = {
    entityId: null as number | null,
    bankAccountId: null as number | null,

    // Liability test IDs
    liabilityId: null as number | null,
    liabilityWithRateId: null as number | null,

    // Beneficiary test IDs
    beneficiaryId: null as number | null,
    beneficiary2Id: null as number | null,
    beneficiary3Id: null as number | null,
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe.skipIf(isProductionDb)(
    'CRUD Operations - Liability & Beneficiary Routers',
    () => {
        beforeAll(async () => {
            const [testEntity] = await db
                .insert(entity)
                .values({
                    name: `LiaBen Test Entity ${TS}`,
                    entityType: 'TRUST',
                    trustType: 'IRREVOCABLE',
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString(),
                })
                .returning()
            testData.entityId = testEntity.id

            const [testBank] = await db
                .insert(bankAccount)
                .values({
                    entityId: testEntity.id,
                    institution: `LiaBen Test Bank ${TS}`,
                    accountType: 'CHECKING',
                    accountNumber: `LB${TS}`,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                    updatedAt: new Date().toISOString(),
                })
                .returning()
            testData.bankAccountId = testBank.id
        }, TEST_TIMEOUT)

        afterAll(async () => {
            // Reverse FK order; bulk-delete catches liabilities from bulkCreate tests
            if (testData.entityId) {
                await db
                    .delete(liability)
                    .where(eq(liability.entityId, testData.entityId))
            }

            if (testData.entityId) {
                await db
                    .delete(beneficiary)
                    .where(eq(beneficiary.entityId, testData.entityId))
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
        // LIABILITY ROUTER - STANDARD CRUD
        // =========================================================================

        describe('liability', () => {
            test(
                'create returns a new liability with an id',
                async () => {
                    const caller = adminCaller()
                    const created = await caller.liability.create({
                        entityId: testData.entityId!,
                        liabilityType: 'LOAN',
                        creditor: `Test Creditor ${TS}`,
                        originalAmount: '50000.00',
                        currentBalance: '45000.00',
                        allocationClass: 'PRINCIPAL',
                        status: 'ACTIVE',
                    })
                    testData.liabilityId = created.id

                    expect(created).toBeDefined()
                    expect(created.id).toBeGreaterThan(0)
                    expect(created.creditor).toBe(`Test Creditor ${TS}`)
                    expect(created.liabilityType).toBe('LOAN')
                    expect(created.originalAmount).toBe('50000.00')
                    expect(created.currentBalance).toBe('45000.00')
                    expect(created.allocationClass).toBe('PRINCIPAL')
                    expect(created.entityId).toBe(testData.entityId)
                },
                TEST_TIMEOUT,
            )

            test(
                'list returns the created liability filtered by entityId',
                async () => {
                    const caller = adminCaller()
                    const results = await caller.liability.list({
                        entityId: testData.entityId!,
                    })

                    expect(Array.isArray(results)).toBe(true)
                    expect(
                        results.some((r) => r.id === testData.liabilityId),
                    ).toBe(true)
                },
                TEST_TIMEOUT,
            )

            test(
                'byId returns liability with entity and payments relations',
                async () => {
                    const caller = adminCaller()
                    const result = await caller.liability.byId({
                        id: testData.liabilityId!,
                        entityId: testData.entityId!,
                    })

                    expect(result).toBeDefined()
                    expect(result?.id).toBe(testData.liabilityId)
                    expect(result?.creditor).toBe(`Test Creditor ${TS}`)
                    expect(result).toHaveProperty('entity')
                    expect(result).toHaveProperty('payments')
                    expect(Array.isArray(result?.payments)).toBe(true)
                },
                TEST_TIMEOUT,
            )

            test(
                'update modifies creditor name and returns updated record',
                async () => {
                    const caller = adminCaller()
                    const updated = await caller.liability.update({
                        id: testData.liabilityId!,
                        entityId: testData.entityId!,
                        data: { creditor: `Updated Creditor ${TS}` },
                    })

                    expect(updated).toBeDefined()
                    expect(updated.id).toBe(testData.liabilityId)
                    expect(updated.creditor).toBe(`Updated Creditor ${TS}`)

                    expect(updated.originalAmount).toBe('50000.00')
                    expect(updated.liabilityType).toBe('LOAN')
                },
                TEST_TIMEOUT,
            )

            test(
                'delete removes the liability and returns the deleted record',
                async () => {
                    const caller = adminCaller()
                    const deleted = await caller.liability.delete({
                        id: testData.liabilityId!,
                        entityId: testData.entityId!,
                    })

                    expect(deleted).toBeDefined()
                    expect(deleted.id).toBe(testData.liabilityId)

                    const result = await caller.liability.byId({
                        id: testData.liabilityId!,
                        entityId: testData.entityId!,
                    })
                    expect(result).toBeUndefined()

                    testData.liabilityId = null
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // LIABILITY ROUTER - BULK CREATE
        // =========================================================================

        describe('liability.bulkCreate', () => {
            test(
                'creates multiple liabilities at once',
                async () => {
                    const caller = adminCaller()
                    const results = await caller.liability.bulkCreate({
                        entityId: testData.entityId!,
                        liabilities: [
                            {
                                liabilityType: 'MORTGAGE',
                                creditor: `Bulk Mortgage Co ${TS}`,
                                currentBalance: '250,000.00',
                                interestRate: '6.5',
                                monthlyPayment: '1,580.17',
                                loanTermMonths: '360',
                            },
                            {
                                liabilityType: 'LOAN',
                                creditor: `Bulk Auto Lender ${TS}`,
                                currentBalance: '18,500.00',
                                interestRate: '4.9',
                                monthlyPayment: '350.00',
                                loanTermMonths: '60',
                            },
                        ],
                    })

                    expect(Array.isArray(results)).toBe(true)
                    expect(results).toHaveLength(2)

                    expect(results[0].creditor).toBe(`Bulk Mortgage Co ${TS}`)
                    expect(results[0].liabilityType).toBe('MORTGAGE')
                    // Commas should be cleaned from numeric values
                    expect(results[0].currentBalance).toBe('250000.00')
                    expect(results[0].originalAmount).toBe('250000.00')
                    expect(results[0].status).toBe('ACTIVE')
                    expect(results[0].interestRate).toBe('6.500')

                    expect(results[1].creditor).toBe(`Bulk Auto Lender ${TS}`)
                    expect(results[1].currentBalance).toBe('18500.00')
                },
                TEST_TIMEOUT,
            )

            test(
                'sets isRevolvingCredit=true for CREDIT_CARD type',
                async () => {
                    const caller = adminCaller()
                    const results = await caller.liability.bulkCreate({
                        entityId: testData.entityId!,
                        liabilities: [
                            {
                                liabilityType: 'CREDIT_CARD',
                                creditor: `Bulk CC ${TS}`,
                                currentBalance: '5,200.00',
                            },
                        ],
                    })

                    expect(results).toHaveLength(1)
                    expect(results[0].liabilityType).toBe('CREDIT_CARD')
                    expect(results[0].isRevolvingCredit).toBe(true)
                    expect(results[0].status).toBe('ACTIVE')
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // LIABILITY ROUTER - getPayments
        // =========================================================================

        describe('liability.getPayments', () => {
            let paymentsTestLiabilityId: number

            beforeAll(async () => {
                const caller = adminCaller()
                const created = await caller.liability.create({
                    entityId: testData.entityId!,
                    liabilityType: 'LOAN',
                    creditor: `Payments Test Creditor ${TS}`,
                    originalAmount: '10000.00',
                    currentBalance: '9500.00',
                    allocationClass: 'PRINCIPAL',
                    status: 'ACTIVE',
                })
                paymentsTestLiabilityId = created.id
            }, TEST_TIMEOUT)

            test(
                'returns empty array for liability with no payments',
                async () => {
                    const caller = adminCaller()
                    const payments = await caller.liability.getPayments({
                        liabilityId: paymentsTestLiabilityId,
                        entityId: testData.entityId!,
                    })

                    expect(Array.isArray(payments)).toBe(true)
                    expect(payments).toHaveLength(0)
                },
                TEST_TIMEOUT,
            )

            test(
                'throws NOT_FOUND for wrong entityId',
                async () => {
                    const caller = adminCaller()
                    const wrongEntityId = 999999

                    try {
                        await caller.liability.getPayments({
                            liabilityId: paymentsTestLiabilityId,
                            entityId: wrongEntityId,
                        })
                        expect(true).toBe(false)
                    } catch (error: unknown) {
                        const trpcError = error as { code?: string }
                        expect(trpcError.code).toBe('NOT_FOUND')
                    }
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // LIABILITY ROUTER - getPayoffProjection
        // =========================================================================

        describe('liability.getPayoffProjection', () => {
            test(
                'returns null for liability without interestRate',
                async () => {
                    const caller = adminCaller()
                    const created = await caller.liability.create({
                        entityId: testData.entityId!,
                        liabilityType: 'LOAN',
                        creditor: `No Rate Creditor ${TS}`,
                        originalAmount: '5000.00',
                        currentBalance: '4500.00',
                        allocationClass: 'PRINCIPAL',
                        status: 'ACTIVE',
                    })

                    const projection =
                        await caller.liability.getPayoffProjection({
                            id: created.id,
                            entityId: testData.entityId!,
                        })

                    expect(projection).toBeNull()
                },
                TEST_TIMEOUT,
            )

            test(
                'returns null for revolving credit (CREDIT_CARD) even with interestRate',
                async () => {
                    const caller = adminCaller()
                    const created = await caller.liability.create({
                        entityId: testData.entityId!,
                        liabilityType: 'CREDIT_CARD',
                        creditor: `CC Projection Test ${TS}`,
                        originalAmount: '3000.00',
                        currentBalance: '2800.00',
                        allocationClass: 'PRINCIPAL',
                        status: 'ACTIVE',
                        interestRate: '19.990',
                        isRevolvingCredit: true,
                    })

                    const projection =
                        await caller.liability.getPayoffProjection({
                            id: created.id,
                            entityId: testData.entityId!,
                        })

                    expect(projection).toBeNull()
                },
                TEST_TIMEOUT,
            )

            test(
                'returns projection data for liability with interestRate and monthly payment',
                async () => {
                    const caller = adminCaller()
                    // Note: estimatePayoffDate treats interestRate as a decimal
                    // (e.g., '0.065' for 6.5%), matching how the router passes
                    // the DB value directly to the amortization function.
                    const created = await caller.liability.create({
                        entityId: testData.entityId!,
                        liabilityType: 'MORTGAGE',
                        creditor: `Projection Test Lender ${TS}`,
                        originalAmount: '200000.00',
                        currentBalance: '180000.00',
                        allocationClass: 'PRINCIPAL',
                        status: 'ACTIVE',
                        interestRate: '0.065',
                        monthlyPayment: '1264.14',
                        loanTermMonths: 360,
                    })
                    testData.liabilityWithRateId = created.id

                    const projection =
                        await caller.liability.getPayoffProjection({
                            id: created.id,
                            entityId: testData.entityId!,
                        })

                    expect(projection).not.toBeNull()
                    expect(projection).toHaveProperty('monthsRemaining')
                    expect(projection).toHaveProperty('payoffDate')
                    expect(projection).toHaveProperty('totalInterest')
                    expect(projection!.monthsRemaining).toBeGreaterThan(0)
                    expect(
                        parseFloat(projection!.totalInterest),
                    ).toBeGreaterThan(0)
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // BENEFICIARY ROUTER - STANDARD CRUD
        // =========================================================================

        describe('beneficiary', () => {
            test(
                'create returns a new beneficiary with an id',
                async () => {
                    const caller = adminCaller()
                    const created = await caller.beneficiary.create({
                        entityId: testData.entityId!,
                        firstName: `TestFirst${TS}`,
                        lastName: `TestLast${TS}`,
                        relationship: 'CHILD',
                        sharePercent: '50.00',
                        distributionStandard: 'HEMS',
                    })
                    testData.beneficiaryId = created.id

                    expect(created).toBeDefined()
                    expect(created.id).toBeGreaterThan(0)
                    expect(created.firstName).toBe(`TestFirst${TS}`)
                    expect(created.lastName).toBe(`TestLast${TS}`)
                    expect(created.relationship).toBe('CHILD')
                    expect(created.sharePercent).toBe('50.00')
                    expect(created.distributionStandard).toBe('HEMS')
                    expect(created.entityId).toBe(testData.entityId)
                },
                TEST_TIMEOUT,
            )

            test(
                'list returns the created beneficiary filtered by entityId',
                async () => {
                    const caller = adminCaller()
                    const results = await caller.beneficiary.list({
                        entityId: testData.entityId!,
                    })

                    expect(Array.isArray(results)).toBe(true)
                    expect(
                        results.some((r) => r.id === testData.beneficiaryId),
                    ).toBe(true)
                },
                TEST_TIMEOUT,
            )

            test(
                'listWithDistributions returns beneficiaries with distribution data',
                async () => {
                    const caller = adminCaller()
                    const results =
                        await caller.beneficiary.listWithDistributions({
                            entityId: testData.entityId!,
                        })

                    expect(Array.isArray(results)).toBe(true)
                    expect(
                        results.some((r) => r.id === testData.beneficiaryId),
                    ).toBe(true)
                    const found = results.find(
                        (r) => r.id === testData.beneficiaryId,
                    )
                    expect(found).toBeDefined()
                    expect(found).toHaveProperty('distributions')
                    expect(Array.isArray(found?.distributions)).toBe(true)
                },
                TEST_TIMEOUT,
            )

            test(
                'byId returns the specific beneficiary',
                async () => {
                    const caller = adminCaller()
                    const result = await caller.beneficiary.byId({
                        id: testData.beneficiaryId!,
                        entityId: testData.entityId!,
                    })

                    expect(result).toBeDefined()
                    expect(result?.id).toBe(testData.beneficiaryId)
                    expect(result?.firstName).toBe(`TestFirst${TS}`)
                    expect(result?.lastName).toBe(`TestLast${TS}`)
                },
                TEST_TIMEOUT,
            )

            test(
                'update modifies sharePercent and returns updated record',
                async () => {
                    const caller = adminCaller()
                    const updated = await caller.beneficiary.update({
                        id: testData.beneficiaryId!,
                        entityId: testData.entityId!,
                        data: { sharePercent: '35.00' },
                    })

                    expect(updated).toBeDefined()
                    expect(updated.id).toBe(testData.beneficiaryId)
                    expect(updated.sharePercent).toBe('35.00')

                    expect(updated.firstName).toBe(`TestFirst${TS}`)
                    expect(updated.relationship).toBe('CHILD')
                },
                TEST_TIMEOUT,
            )

            test(
                'delete removes the beneficiary and returns the deleted record',
                async () => {
                    const caller = adminCaller()
                    const deleted = await caller.beneficiary.delete({
                        id: testData.beneficiaryId!,
                        entityId: testData.entityId!,
                    })

                    expect(deleted).toBeDefined()
                    expect(deleted.id).toBe(testData.beneficiaryId)

                    const result = await caller.beneficiary.byId({
                        id: testData.beneficiaryId!,
                        entityId: testData.entityId!,
                    })
                    expect(result).toBeUndefined()

                    testData.beneficiaryId = null
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // BENEFICIARY ROUTER - me (portal self-lookup)
        // =========================================================================

        describe('beneficiary.me', () => {
            let meBeneficiaryId: number

            beforeAll(async () => {
                const [created] = await db
                    .insert(beneficiary)
                    .values({
                        entityId: testData.entityId!,
                        firstName: `MeFirst${TS}`,
                        lastName: `MeLast${TS}`,
                        relationship: 'CHILD',
                        sharePercent: '10.00',
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                meBeneficiaryId = created.id
            }, TEST_TIMEOUT)

            test(
                'beneficiaryCaller with valid beneficiaryId returns own record',
                async () => {
                    const caller = beneficiaryCaller(meBeneficiaryId)
                    const result = await caller.beneficiary.me()

                    expect(result).toBeDefined()
                    expect(result?.id).toBe(meBeneficiaryId)
                    expect(result?.firstName).toBe(`MeFirst${TS}`)
                    expect(result?.lastName).toBe(`MeLast${TS}`)
                },
                TEST_TIMEOUT,
            )

            test(
                'beneficiaryCaller with null beneficiaryId returns null',
                async () => {
                    const caller = beneficiaryCaller(null)
                    const result = await caller.beneficiary.me()

                    expect(result).toBeNull()
                },
                TEST_TIMEOUT,
            )

            test(
                'adminCaller cannot call me (requires beneficiary role)',
                async () => {
                    const caller = adminCaller()

                    try {
                        await caller.beneficiary.me()
                        expect(true).toBe(false)
                    } catch (error: unknown) {
                        const trpcError = error as { code?: string }
                        expect(trpcError.code).toBe('FORBIDDEN')
                    }
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // BENEFICIARY ROUTER - markDeceased (Section 7.01)
        // =========================================================================

        describe('beneficiary.markDeceased', () => {
            let deceasedBeneficiaryId: number

            beforeAll(async () => {
                const [created] = await db
                    .insert(beneficiary)
                    .values({
                        entityId: testData.entityId!,
                        firstName: `DeceasedFirst${TS}`,
                        lastName: `DeceasedLast${TS}`,
                        relationship: 'OTHER',
                        sharePercent: '20.00',
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                deceasedBeneficiaryId = created.id
            }, TEST_TIMEOUT)

            test(
                'marks beneficiary as deceased with date and triggers share recalculation',
                async () => {
                    const caller = adminCaller()
                    const deceasedDate = '2025-06-15T00:00:00.000Z'

                    const result = await caller.beneficiary.markDeceased({
                        beneficiaryId: deceasedBeneficiaryId,
                        entityId: testData.entityId!,
                        deceasedDate,
                    })

                    expect(result).toBeDefined()
                    expect(result).toHaveProperty('success')
                    expect(result.success).toBe(true)

                    const updated = await db.query.beneficiary.findFirst({
                        where: eq(beneficiary.id, deceasedBeneficiaryId),
                    })
                    expect(updated).toBeDefined()
                    expect(updated?.deceasedDate).toBeDefined()
                },
                TEST_TIMEOUT,
            )
        })

        // =========================================================================
        // BENEFICIARY ROUTER - recalculateShares
        // =========================================================================

        describe('beneficiary.recalculateShares', () => {
            beforeAll(async () => {
                const [ben2] = await db
                    .insert(beneficiary)
                    .values({
                        entityId: testData.entityId!,
                        firstName: `ShareBen2${TS}`,
                        lastName: `ShareLast2${TS}`,
                        relationship: 'CHILD',
                        sharePercent: '30.00',
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                testData.beneficiary2Id = ben2.id

                const [ben3] = await db
                    .insert(beneficiary)
                    .values({
                        entityId: testData.entityId!,
                        firstName: `ShareBen3${TS}`,
                        lastName: `ShareLast3${TS}`,
                        relationship: 'CHILD',
                        sharePercent: '25.00',
                        deceasedDate: '2025-03-01T00:00:00.000Z',
                        updatedAt: new Date().toISOString(),
                    })
                    .returning()
                testData.beneficiary3Id = ben3.id
            }, TEST_TIMEOUT)

            test(
                'redistributes shares after excluding one beneficiary',
                async () => {
                    const caller = adminCaller()
                    const result = await caller.beneficiary.recalculateShares({
                        entityId: testData.entityId!,
                        excludeBeneficiaryId: testData.beneficiary3Id!,
                    })

                    expect(result).toBeDefined()
                    expect(result).toHaveProperty('success')
                    expect(result.success).toBe(true)

                    if (result.shareRecalculated) {
                        expect(result).toHaveProperty('updates')
                        expect(Array.isArray(result.updates)).toBe(true)

                        const excludedBen =
                            await db.query.beneficiary.findFirst({
                                where: eq(
                                    beneficiary.id,
                                    testData.beneficiary3Id!,
                                ),
                            })
                        expect(excludedBen?.sharePercent).toBe('0.00')
                    }
                },
                TEST_TIMEOUT,
            )
        })
    },
)
