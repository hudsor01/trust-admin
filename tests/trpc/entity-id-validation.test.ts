/** tRPC entityId validation tests — verifies entity-scoped list/byId/update/delete/recordPayment enforce cross-entity isolation. */
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
    return createCaller(createAdminContext())
}

const testData = {
    entityId1: null as number | null,
    entityId2: null as number | null,
    bankAccountId1: null as number | null,
    bankAccountId2: null as number | null,
    liabilityId1: null as number | null,
    liabilityId2: null as number | null,
    beneficiaryId1: null as number | null,
    distributionId1: null as number | null,
    trustAccountingId1: null as number | null,
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe.skipIf(isProductionDb)('EntityId Validation', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()
        const ts = Date.now().toString().slice(-8)

        const [e1] = await db
            .insert(entity)
            .values({
                name: 'EntityId Test Trust 1',
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                ein: `88-${ts}`.slice(0, 10),
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId1 = e1.id

        const [e2] = await db
            .insert(entity)
            .values({
                name: 'EntityId Test Trust 2',
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                ein: `77-${ts}`.slice(0, 10),
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId2 = e2.id

        const [ba1] = await db
            .insert(bankAccount)
            .values({
                entityId: testData.entityId1,
                name: 'Bank of Entity1',
                institution: 'Bank of Entity1',
                accountType: 'CHECKING',
                accountNumber: `1111${ts}`,
                currentBalance: '50000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.bankAccountId1 = ba1.id

        const [ba2] = await db
            .insert(bankAccount)
            .values({
                entityId: testData.entityId2,
                name: 'Bank of Entity2',
                institution: 'Bank of Entity2',
                accountType: 'CHECKING',
                accountNumber: `2222${ts}`,
                currentBalance: '25000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.bankAccountId2 = ba2.id

        const [l1] = await db
            .insert(liability)
            .values({
                entityId: testData.entityId1,
                liabilityType: 'MORTGAGE',
                creditor: 'Entity1 Bank',
                originalAmount: '100000.00',
                currentBalance: '95000.00',
                interestRate: '4.5',
                monthlyPayment: '1500.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.liabilityId1 = l1.id

        const [l2] = await db
            .insert(liability)
            .values({
                entityId: testData.entityId2,
                liabilityType: 'LOAN',
                creditor: 'Entity2 Lender',
                originalAmount: '50000.00',
                currentBalance: '45000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.liabilityId2 = l2.id

        const [ben1] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId1,
                firstName: 'EntityId',
                lastName: 'TestBen',
                email: `entityid-test-${ts}@example.com`,
                relationship: 'CHILD',
                sharePercent: '100.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId1 = ben1.id

        const [dist1] = await db
            .insert(distribution)
            .values({
                entityId: testData.entityId1,
                beneficiaryId: testData.beneficiaryId1,
                distributionType: 'INCOME',
                amount: '1000.00',
                distributionDate: now.split('T')[0],
                paymentMethod: 'CHECK',
                updatedAt: now,
            })
            .returning()
        testData.distributionId1 = dist1.id

        const [ta1] = await db
            .insert(trustAccounting)
            .values({
                entityId: testData.entityId1,
                bankAccountId: testData.bankAccountId1!,
                accountingDate: now.split('T')[0],
                entryType: 'INCOME',
                amount: '500.00',
                description: 'EntityId test income',
                isPrincipal: false,
                fiscalYear: new Date().getFullYear(),
                updatedAt: now,
            })
            .returning()
        testData.trustAccountingId1 = ta1.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Reverse FK order; liability payments first (created by recordPayment test)
        if (testData.liabilityId1) {
            await db
                .delete(liabilityPayment)
                .where(eq(liabilityPayment.liabilityId, testData.liabilityId1))
        }
        if (testData.entityId1) {
            await db
                .delete(trustAccounting)
                .where(eq(trustAccounting.entityId, testData.entityId1))
        }
        if (testData.distributionId1)
            await db
                .delete(distribution)
                .where(eq(distribution.id, testData.distributionId1))
        if (testData.beneficiaryId1)
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId1))
        if (testData.liabilityId1)
            await db
                .delete(liability)
                .where(eq(liability.id, testData.liabilityId1))
        if (testData.liabilityId2)
            await db
                .delete(liability)
                .where(eq(liability.id, testData.liabilityId2))
        if (testData.bankAccountId1)
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.id, testData.bankAccountId1))
        if (testData.bankAccountId2)
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.id, testData.bankAccountId2))
        if (testData.entityId1)
            await db.delete(entity).where(eq(entity.id, testData.entityId1))
        if (testData.entityId2)
            await db.delete(entity).where(eq(entity.id, testData.entityId2))
    }, TEST_TIMEOUT)

    // =========================================================================
    // LIST PROCEDURE TESTS - entityId is required
    // =========================================================================

    describe('list procedures require entityId and filter correctly', () => {
        test('liability.list returns only records for the given entity', async () => {
            const caller = adminCaller()
            const results = await caller.liability.list({
                entityId: testData.entityId1!,
            })

            expect(results.some((r) => r.id === testData.liabilityId1)).toBe(
                true,
            )
            expect(results.some((r) => r.id === testData.liabilityId2)).toBe(
                false,
            )
        })

        test('beneficiary.list returns only records for the given entity', async () => {
            const caller = adminCaller()
            const results = await caller.beneficiary.list({
                entityId: testData.entityId1!,
            })

            expect(results.some((r) => r.id === testData.beneficiaryId1)).toBe(
                true,
            )
        })

        test('distribution.list returns only records for the given entity', async () => {
            const caller = adminCaller()
            const results = await caller.distribution.list({
                entityId: testData.entityId1!,
            })

            expect(results.some((r) => r.id === testData.distributionId1)).toBe(
                true,
            )
        })

        test('trustAccounting.list returns only records for the given entity', async () => {
            const caller = adminCaller()
            const results = await caller.trustAccounting.list({
                entityId: testData.entityId1!,
            })

            expect(
                results.some((r) => r.id === testData.trustAccountingId1),
            ).toBe(true)
        })
    })

    // =========================================================================
    // BYID PROCEDURE TESTS - entityId scoping
    // =========================================================================

    // Note: byId tests for asset routers (homestead, bankAccount, etc.) were removed
    // because those routers are now served via Neon Data API (PostgREST).

    // =========================================================================
    // UPDATE PROCEDURE TESTS - entityId in WHERE clause
    // =========================================================================

    describe('update procedures enforce entity scoping', () => {
        test('liability.update throws NOT_FOUND for wrong entityId', async () => {
            const caller = adminCaller()
            try {
                await caller.liability.update({
                    id: testData.liabilityId1!,
                    entityId: testData.entityId2!, // wrong entity
                    data: { creditor: 'Should Not Work' },
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
            }
        })
    })

    // =========================================================================
    // DELETE PROCEDURE TESTS - entityId in WHERE clause
    // =========================================================================

    describe('delete procedures enforce entity scoping', () => {
        test('liability.delete throws NOT_FOUND for wrong entityId', async () => {
            const caller = adminCaller()
            try {
                await caller.liability.delete({
                    id: testData.liabilityId1!,
                    entityId: testData.entityId2!, // wrong entity
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
            }
        })
    })

    // =========================================================================
    // RECORD PAYMENT CROSS-ENTITY VALIDATION
    // =========================================================================

    describe('recordPayment cross-entity validation', () => {
        test('recordPayment rejects liability from wrong entity', async () => {
            const caller = adminCaller()
            try {
                await caller.liability.recordPayment({
                    entityId: testData.entityId2!, // entity 2
                    liabilityId: testData.liabilityId1!, // liability belongs to entity 1
                    bankAccountId: testData.bankAccountId2!, // bank in entity 2
                    paymentDate: new Date().toISOString().split('T')[0]!,
                    amount: '1000.00',
                    paymentMethod: 'CHECK',
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
                expect((err as TRPCError).message).toContain(
                    'Liability not found',
                )
            }
        })

        test('recordPayment rejects bank account from wrong entity', async () => {
            const caller = adminCaller()
            try {
                await caller.liability.recordPayment({
                    entityId: testData.entityId1!, // entity 1
                    liabilityId: testData.liabilityId1!, // liability in entity 1 (correct)
                    bankAccountId: testData.bankAccountId2!, // bank in entity 2 (wrong!)
                    paymentDate: new Date().toISOString().split('T')[0]!,
                    amount: '1000.00',
                    paymentMethod: 'CHECK',
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('BAD_REQUEST')
                expect((err as TRPCError).message).toContain('Bank account')
            }
        })

        test('recordPayment succeeds with matching entity', async () => {
            const caller = adminCaller()
            const result = await caller.liability.recordPayment({
                entityId: testData.entityId1!,
                liabilityId: testData.liabilityId1!,
                bankAccountId: testData.bankAccountId1!, // same entity
                paymentDate: new Date().toISOString().split('T')[0]!,
                amount: '100.00',
                paymentMethod: 'CHECK',
            })

            expect(result).toBeDefined()
            expect(result.payment).toBeDefined()
            expect(result.payment.amount).toBe('100.00')
        })
    })

    // =========================================================================
    // HEMS REQUEST ENTITY SCOPING
    // =========================================================================

    describe('hemsRequest entity scoping', () => {
        let hemsId: number | null = null

        test('hemsRequest.pending requires entityId', async () => {
            const caller = adminCaller()
            const created = await caller.hemsRequest.create({
                entityId: testData.entityId1!,
                beneficiaryId: testData.beneficiaryId1!,
                category: 'HEALTH',
                amountRequested: '500.00',
                justification: 'EntityId test HEMS',
            })
            hemsId = created.id

            const pending1 = await caller.hemsRequest.pending({
                entityId: testData.entityId1!,
            })
            expect(pending1.some((r) => r.id === hemsId)).toBe(true)

            const pending2 = await caller.hemsRequest.pending({
                entityId: testData.entityId2!,
            })
            expect(pending2.some((r) => r.id === hemsId)).toBe(false)
        })

        test('hemsRequest.approve throws NOT_FOUND for wrong entity', async () => {
            if (!hemsId) return
            const caller = adminCaller()
            try {
                await caller.hemsRequest.approve({
                    id: hemsId,
                    entityId: testData.entityId2!, // wrong entity
                    approvedAmount: '500.00',
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
            }
        })

        test('hemsRequest.deny throws NOT_FOUND for wrong entity', async () => {
            if (!hemsId) return
            const caller = adminCaller()
            try {
                await caller.hemsRequest.deny({
                    id: hemsId,
                    entityId: testData.entityId2!, // wrong entity
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
            }

            await db.delete(hemsRequest).where(eq(hemsRequest.id, hemsId!))
        })
    })
})
