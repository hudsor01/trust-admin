/** tRPC tests for hemsRequest.markDistributed mutation (Wave-0 / row 23-02-02). */
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
} from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext } from '../helpers/mock-context'

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '997',
            name: 'Test Admin MarkDistributed',
            email: 'admin-markdist@test.com',
        }),
    )
}

const testData = {
    entityId: null as number | null,
    bankAccountId: null as number | null,
    beneficiaryId: null as number | null,
    pendingRequestId: null as number | null,
    deniedRequestId: null as number | null,
    cancelledRequestId: null as number | null,
    approvedRequestId: null as number | null,
    approvedRequestIdForHappyPath: null as number | null,
    distributedRequestId: null as number | null,
}

describe.skipIf(isProductionDb)('hemsRequest.markDistributed', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()
        const ts = Date.now().toString().slice(-8)

        const [e1] = await db
            .insert(entity)
            .values({
                name: `MarkDist Test Trust ${ts}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                ein: `97-${ts}`.slice(0, 10),
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId = e1.id

        const [ba1] = await db
            .insert(bankAccount)
            .values({
                entityId: testData.entityId,
                name: 'MarkDist Test Bank',
                institution: 'MarkDist Test Bank',
                accountType: 'CHECKING',
                accountNumber: `MKD${ts}`,
                currentBalance: '100000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.bankAccountId = ba1.id

        const [ben1] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId,
                firstName: 'MarkDist',
                lastName: 'TestBen',
                email: `markdist-test-${ts}@example.com`,
                relationship: 'CHILD',
                sharePercent: '100.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId = ben1.id

        const caller = adminCaller()

        // 1. PENDING request (kept pending)
        const pendingCreated = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'HEALTH',
            amountRequested: '1000.00',
            justification: 'Pending request — keep PENDING for CONFLICT test',
        })
        testData.pendingRequestId = pendingCreated.id

        // 2. DENIED request
        const deniedCreated = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'MAINTENANCE',
            amountRequested: '1500.00',
            justification: 'Will be denied',
        })
        await caller.hemsRequest.deny({
            id: deniedCreated.id,
            entityId: testData.entityId,
            reviewNotes: 'Denied for CONFLICT test fixture',
        })
        testData.deniedRequestId = deniedCreated.id

        // 3. CANCELLED request
        const cancelledCreated = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'SUPPORT',
            amountRequested: '2000.00',
            justification: 'Will be cancelled',
        })
        await caller.hemsRequest.cancel({
            id: cancelledCreated.id,
            entityId: testData.entityId,
        })
        testData.cancelledRequestId = cancelledCreated.id

        // 4. APPROVED request (kept approved for NOT_FOUND test)
        const approvedKept = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'EDUCATION',
            amountRequested: '3000.00',
            justification: 'Will be approved and kept approved',
        })
        await caller.hemsRequest.approve({
            id: approvedKept.id,
            entityId: testData.entityId,
            approvedAmount: '3000.00',
            distributionType: 'INCOME',
        })
        testData.approvedRequestId = approvedKept.id

        // 5. APPROVED request (for happy-path test — flips to DISTRIBUTED)
        const approvedHappy = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'HEALTH',
            amountRequested: '4000.00',
            justification: 'Will be approved then markDistributed',
        })
        await caller.hemsRequest.approve({
            id: approvedHappy.id,
            entityId: testData.entityId,
            approvedAmount: '4000.00',
            distributionType: 'INCOME',
        })
        testData.approvedRequestIdForHappyPath = approvedHappy.id

        // 6. Already-DISTRIBUTED request (created via approve then markDistributed)
        const distFixture = await caller.hemsRequest.create({
            entityId: testData.entityId,
            beneficiaryId: testData.beneficiaryId,
            category: 'SUPPORT',
            amountRequested: '500.00',
            justification: 'Will be approved then markDistributed first',
        })
        await caller.hemsRequest.approve({
            id: distFixture.id,
            entityId: testData.entityId,
            approvedAmount: '500.00',
            distributionType: 'INCOME',
        })
        await caller.hemsRequest.markDistributed({
            id: distFixture.id,
            entityId: testData.entityId,
        })
        testData.distributedRequestId = distFixture.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (testData.entityId) {
            // Distributions auto-created by approve must be cleaned by entity scope
            await db
                .delete(distribution)
                .where(eq(distribution.entityId, testData.entityId))
            await db
                .delete(hemsRequest)
                .where(eq(hemsRequest.entityId, testData.entityId))
        }
        if (testData.beneficiaryId) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId))
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

    test(
        'flips an APPROVED request to DISTRIBUTED and returns the updated row',
        async () => {
            const caller = adminCaller()
            const result = await caller.hemsRequest.markDistributed({
                id: testData.approvedRequestIdForHappyPath!,
                entityId: testData.entityId!,
            })
            expect(result).toBeDefined()
            expect(result.id).toBe(testData.approvedRequestIdForHappyPath!)
            expect(result.status).toBe('DISTRIBUTED')
            expect(result.updatedAt).toBeDefined()
        },
        TEST_TIMEOUT,
    )

    test(
        'throws CONFLICT when current status is PENDING',
        async () => {
            const caller = adminCaller()
            try {
                await caller.hemsRequest.markDistributed({
                    id: testData.pendingRequestId!,
                    entityId: testData.entityId!,
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('CONFLICT')
                expect((err as TRPCError).message).toMatch(/PENDING/)
            }
        },
        TEST_TIMEOUT,
    )

    test(
        'throws CONFLICT when current status is DENIED',
        async () => {
            const caller = adminCaller()
            try {
                await caller.hemsRequest.markDistributed({
                    id: testData.deniedRequestId!,
                    entityId: testData.entityId!,
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('CONFLICT')
                expect((err as TRPCError).message).toMatch(/DENIED/)
            }
        },
        TEST_TIMEOUT,
    )

    test(
        'throws CONFLICT when current status is CANCELLED',
        async () => {
            const caller = adminCaller()
            try {
                await caller.hemsRequest.markDistributed({
                    id: testData.cancelledRequestId!,
                    entityId: testData.entityId!,
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('CONFLICT')
                expect((err as TRPCError).message).toMatch(/CANCELLED/)
            }
        },
        TEST_TIMEOUT,
    )

    test(
        'throws CONFLICT when current status is already DISTRIBUTED',
        async () => {
            const caller = adminCaller()
            try {
                await caller.hemsRequest.markDistributed({
                    id: testData.distributedRequestId!,
                    entityId: testData.entityId!,
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('CONFLICT')
                expect((err as TRPCError).message).toMatch(/DISTRIBUTED/)
            }
        },
        TEST_TIMEOUT,
    )

    test(
        'throws NOT_FOUND when entityId does not match',
        async () => {
            const caller = adminCaller()
            try {
                await caller.hemsRequest.markDistributed({
                    id: testData.approvedRequestId!,
                    entityId: 999999,
                })
                expect(true).toBe(false)
            } catch (err) {
                expect(err).toBeInstanceOf(TRPCError)
                expect((err as TRPCError).code).toBe('NOT_FOUND')
                expect((err as TRPCError).message).toMatch(/not found/i)
            }
        },
        TEST_TIMEOUT,
    )
})
