/**
 * tRPC CRUD Operations Tests - Remaining Routers
 *
 * Tests the full create -> list -> byId -> update -> delete lifecycle for
 * 6 tRPC routers that previously had 0% test coverage:
 *
 *   1. document       (entity-scoped)
 *   2. liabilityPayment (liabilityId-scoped, not entity-scoped)
 *   3. trusteeFeeSchedule (entity-scoped)
 *   4. trusteeFeeEntry    (entity-scoped, with listWithSchedule)
 *   5. valuation          (global, with forAsset)
 *   6. withdrawalRecord   (entity-scoped, with optional beneficiaryId filter)
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import {
    beneficiary,
    document,
    entity,
    liability,
    liabilityPayment,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    valuation,
    vehicle,
    withdrawalRecord,
} from '../../db/schema'
import { createCallerFactory } from '../../src/server/trpc/index'
import { appRouter } from '../../src/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

/** Create a tRPC caller with admin context (no real auth session) */
function adminCaller() {
    return createCaller({
        session: {
            user: {
                id: '998',
                name: 'CRUD Remaining Admin',
                email: 'crud-remaining@test.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                role: 'admin',
            },
            session: { token: 'fake-token' },
            // biome-ignore lint/suspicious/noExplicitAny: mock session for tests
        } as any,
        user: {
            id: '998',
            name: 'CRUD Remaining Admin',
            email: 'crud-remaining@test.com',
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'admin',
            beneficiaryId: null,
        },
    })
}

/** Unique suffix to avoid collisions with parallel test runs */
const TS = Date.now().toString().slice(-8)

// Track all created record IDs for cleanup
const testData = {
    // Prerequisites (created in beforeAll via direct db.insert)
    entityId: null as number | null,
    beneficiaryId: null as number | null,
    liabilityId: null as number | null,
    trusteeId: null as number | null,
    vehicleId: null as number | null,

    // IDs created by tests, tracked for cleanup
    documentIds: [] as number[],
    liabilityPaymentIds: [] as number[],
    trusteeFeeScheduleIds: [] as number[],
    trusteeFeeEntryIds: [] as number[],
    valuationIds: [] as number[],
    withdrawalRecordIds: [] as number[],
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe.skipIf(isProductionDb)('CRUD Operations - Remaining Routers', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        // 1. Entity
        const [e1] = await db
            .insert(entity)
            .values({
                name: `CrudRemaining Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId = e1.id

        // 2. Beneficiary (for withdrawalRecord)
        const [ben1] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId,
                firstName: 'CrudRem',
                lastName: `TestBen${TS}`,
                email: `crudrem-${TS}@example.com`,
                relationship: 'CHILD',
                sharePercent: '25.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId = ben1.id

        // 3. Liability (for liabilityPayment)
        const [l1] = await db
            .insert(liability)
            .values({
                entityId: testData.entityId,
                liabilityType: 'LOAN',
                creditor: `CrudRem Creditor ${TS}`,
                originalAmount: '50000.00',
                currentBalance: '50000.00',
                allocationClass: 'PRINCIPAL',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.liabilityId = l1.id

        // 4. Trustee (for trusteeFeeSchedule and trusteeFeeEntry)
        const [t1] = await db
            .insert(trustee)
            .values({
                entityId: testData.entityId,
                name: `CrudRem Trustee ${TS}`,
                email: `crudrem-trustee-${TS}@example.com`,
                order: 1,
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.trusteeId = t1.id

        // 5. Vehicle (for valuation link)
        const [v1] = await db
            .insert(vehicle)
            .values({
                entityId: testData.entityId,
                year: 2023,
                make: 'Ford',
                model: 'F-150',
                vin: `1FTFW1E50NF${TS.slice(0, 6)}`,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        testData.vehicleId = v1.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Clean up in reverse FK order to avoid constraint violations.

        // 1. trusteeFeeEntry (depends on trusteeFeeSchedule, trustee, entity)
        for (const id of testData.trusteeFeeEntryIds) {
            await db.delete(trusteeFeeEntry).where(eq(trusteeFeeEntry.id, id))
        }

        // 2. trusteeFeeSchedule (depends on trustee, entity)
        for (const id of testData.trusteeFeeScheduleIds) {
            await db
                .delete(trusteeFeeSchedule)
                .where(eq(trusteeFeeSchedule.id, id))
        }

        // 3. withdrawalRecord (depends on beneficiary, entity)
        for (const id of testData.withdrawalRecordIds) {
            await db.delete(withdrawalRecord).where(eq(withdrawalRecord.id, id))
        }

        // 4. liabilityPayment (depends on liability)
        for (const id of testData.liabilityPaymentIds) {
            await db.delete(liabilityPayment).where(eq(liabilityPayment.id, id))
        }

        // 5. valuation (depends on vehicle)
        for (const id of testData.valuationIds) {
            await db.delete(valuation).where(eq(valuation.id, id))
        }

        // 6. document (depends on entity)
        for (const id of testData.documentIds) {
            await db.delete(document).where(eq(document.id, id))
        }

        // 7. vehicle
        if (testData.vehicleId) {
            await db.delete(vehicle).where(eq(vehicle.id, testData.vehicleId))
        }

        // 8. trustee (depends on entity)
        if (testData.trusteeId) {
            await db.delete(trustee).where(eq(trustee.id, testData.trusteeId))
        }

        // 9. liability (depends on entity)
        if (testData.liabilityId) {
            await db
                .delete(liability)
                .where(eq(liability.id, testData.liabilityId))
        }

        // 10. beneficiary (depends on entity)
        if (testData.beneficiaryId) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId))
        }

        // 11. entity (must be last)
        if (testData.entityId) {
            await db.delete(entity).where(eq(entity.id, testData.entityId))
        }
    }, TEST_TIMEOUT)

    // =========================================================================
    // 1. DOCUMENT ROUTER (entity-scoped)
    // =========================================================================

    describe('document', () => {
        test(
            'create returns a new document with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.document.create({
                    entityId: testData.entityId!,
                    name: `Test Trust Agreement ${TS}`,
                    documentType: 'LEGAL',
                    filePath: `/documents/trust-agreement-${TS}.pdf`,
                })
                testData.documentIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.name).toBe(`Test Trust Agreement ${TS}`)
                expect(created.documentType).toBe('LEGAL')
                expect(created.filePath).toBe(
                    `/documents/trust-agreement-${TS}.pdf`,
                )
                expect(created.entityId).toBe(testData.entityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created document for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.document.list({
                    entityId: testData.entityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testData.documentIds[0]),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific document',
            async () => {
                const caller = adminCaller()
                const docId = testData.documentIds[0]!
                const result = await caller.document.byId({
                    id: docId,
                    entityId: testData.entityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(docId)
                expect(result?.name).toBe(`Test Trust Agreement ${TS}`)
                expect(result?.documentType).toBe('LEGAL')
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the document and returns updated record',
            async () => {
                const caller = adminCaller()
                const docId = testData.documentIds[0]!
                const updated = await caller.document.update({
                    id: docId,
                    entityId: testData.entityId!,
                    data: { name: `Updated Trust Agreement ${TS}` },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(docId)
                expect(updated.name).toBe(`Updated Trust Agreement ${TS}`)
                // Original fields should be preserved
                expect(updated.documentType).toBe('LEGAL')
                expect(updated.filePath).toBe(
                    `/documents/trust-agreement-${TS}.pdf`,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the document and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const docId = testData.documentIds[0]!
                const deleted = await caller.document.delete({
                    id: docId,
                    entityId: testData.entityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(docId)

                // Verify it is gone
                const result = await caller.document.byId({
                    id: docId,
                    entityId: testData.entityId!,
                })
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.documentIds = testData.documentIds.filter(
                    (id) => id !== docId,
                )
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 2. LIABILITY PAYMENT ROUTER (not entity-scoped, uses liabilityId)
    // =========================================================================

    describe('liabilityPayment', () => {
        test(
            'create returns a new liability payment with an id',
            async () => {
                const caller = adminCaller()
                const today = new Date().toISOString()

                const created = await caller.liabilityPayment.create({
                    liabilityId: testData.liabilityId!,
                    paymentDate: today,
                    amount: '1500.00',
                    principalPortion: '1200.00',
                    interestPortion: '300.00',
                    paymentMethod: 'CHECK',
                    checkNumber: `CHK-${TS}`,
                    notes: `Test payment ${TS}`,
                })
                testData.liabilityPaymentIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.liabilityId).toBe(testData.liabilityId)
                expect(created.amount).toBe('1500.00')
                expect(created.principalPortion).toBe('1200.00')
                expect(created.interestPortion).toBe('300.00')
                expect(created.paymentMethod).toBe('CHECK')
                expect(created.checkNumber).toBe(`CHK-${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns all liability payments',
            async () => {
                const caller = adminCaller()
                const results = await caller.liabilityPayment.list()

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.liabilityPaymentIds[0],
                    ),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'list with liabilityId filter returns only matching payments',
            async () => {
                const caller = adminCaller()
                const results = await caller.liabilityPayment.list({
                    liabilityId: testData.liabilityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.liabilityPaymentIds[0],
                    ),
                ).toBe(true)
                // All returned records should belong to our liability
                for (const r of results) {
                    expect(r.liabilityId).toBe(testData.liabilityId)
                }
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific liability payment',
            async () => {
                const caller = adminCaller()
                const payId = testData.liabilityPaymentIds[0]!
                const result = await caller.liabilityPayment.byId(payId)

                expect(result).toBeDefined()
                expect(result?.id).toBe(payId)
                expect(result?.amount).toBe('1500.00')
                expect(result?.liabilityId).toBe(testData.liabilityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the liability payment and returns updated record',
            async () => {
                const caller = adminCaller()
                const payId = testData.liabilityPaymentIds[0]!
                const updated = await caller.liabilityPayment.update({
                    id: payId,
                    data: { amount: '1600.00', notes: 'Updated amount' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(payId)
                expect(updated.amount).toBe('1600.00')
                expect(updated.notes).toBe('Updated amount')
                // Original fields should be preserved
                expect(updated.liabilityId).toBe(testData.liabilityId)
                expect(updated.paymentMethod).toBe('CHECK')
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the liability payment and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const payId = testData.liabilityPaymentIds[0]!
                const deleted = await caller.liabilityPayment.delete(payId)

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(payId)

                // Verify it is gone
                const result = await caller.liabilityPayment.byId(payId)
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.liabilityPaymentIds =
                    testData.liabilityPaymentIds.filter((id) => id !== payId)
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 3. TRUSTEE FEE SCHEDULE ROUTER (entity-scoped)
    // =========================================================================

    describe('trusteeFeeSchedule', () => {
        test(
            'create returns a new trustee fee schedule with an id',
            async () => {
                const caller = adminCaller()
                const effectiveDate = new Date().toISOString()

                const created = await caller.trusteeFeeSchedule.create({
                    entityId: testData.entityId!,
                    trusteeId: testData.trusteeId!,
                    effectiveDate,
                    executorFeePercent: '5.0',
                    annualAssetPercent: '1.5',
                    incomePercent: '8.0',
                    hourlyRate: '150.00',
                })
                testData.trusteeFeeScheduleIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.entityId).toBe(testData.entityId)
                expect(created.trusteeId).toBe(testData.trusteeId)
                expect(created.hourlyRate).toBe('150.00')
                expect(created.annualAssetPercent).toBe('1.50')
                expect(created.incomePercent).toBe('8.00')
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created fee schedule for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.trusteeFeeSchedule.list({
                    entityId: testData.entityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.trusteeFeeScheduleIds[0],
                    ),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific fee schedule',
            async () => {
                const caller = adminCaller()
                const schedId = testData.trusteeFeeScheduleIds[0]!
                const result = await caller.trusteeFeeSchedule.byId({
                    id: schedId,
                    entityId: testData.entityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(schedId)
                expect(result?.hourlyRate).toBe('150.00')
                expect(result?.trusteeId).toBe(testData.trusteeId)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the fee schedule and returns updated record',
            async () => {
                const caller = adminCaller()
                const schedId = testData.trusteeFeeScheduleIds[0]!
                const updated = await caller.trusteeFeeSchedule.update({
                    id: schedId,
                    entityId: testData.entityId!,
                    data: { hourlyRate: '175.00' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(schedId)
                expect(updated.hourlyRate).toBe('175.00')
                // Original fields should be preserved
                expect(updated.entityId).toBe(testData.entityId)
                expect(updated.trusteeId).toBe(testData.trusteeId)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the fee schedule and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const schedId = testData.trusteeFeeScheduleIds[0]!
                const deleted = await caller.trusteeFeeSchedule.delete({
                    id: schedId,
                    entityId: testData.entityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(schedId)

                // Verify it is gone
                const result = await caller.trusteeFeeSchedule.byId({
                    id: schedId,
                    entityId: testData.entityId!,
                })
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.trusteeFeeScheduleIds =
                    testData.trusteeFeeScheduleIds.filter(
                        (id) => id !== schedId,
                    )
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 4. TRUSTEE FEE ENTRY ROUTER (entity-scoped, with listWithSchedule)
    // =========================================================================

    describe('trusteeFeeEntry', () => {
        // We need a fee schedule for the entry's scheduleId reference.
        // Create one in the first test and track it for cleanup.
        let feeScheduleId: number | null = null

        test(
            'create returns a new trustee fee entry with an id',
            async () => {
                const caller = adminCaller()

                // First, create a fee schedule to link to
                const schedule = await caller.trusteeFeeSchedule.create({
                    entityId: testData.entityId!,
                    trusteeId: testData.trusteeId!,
                    effectiveDate: new Date().toISOString(),
                    hourlyRate: '125.00',
                })
                feeScheduleId = schedule.id
                testData.trusteeFeeScheduleIds.push(schedule.id)

                const periodStart = '2025-01-01T00:00:00.000Z'
                const periodEnd = '2025-03-31T23:59:59.999Z'

                const created = await caller.trusteeFeeEntry.create({
                    entityId: testData.entityId!,
                    trusteeId: testData.trusteeId!,
                    scheduleId: feeScheduleId,
                    periodStart,
                    periodEnd,
                    assetFee: '500.00',
                    incomeFee: '200.00',
                    totalFee: '700.00',
                    status: 'ACCRUED',
                })
                testData.trusteeFeeEntryIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.entityId).toBe(testData.entityId)
                expect(created.trusteeId).toBe(testData.trusteeId)
                expect(created.scheduleId).toBe(feeScheduleId)
                expect(created.assetFee).toBe('500.00')
                expect(created.incomeFee).toBe('200.00')
                expect(created.totalFee).toBe('700.00')
                expect(created.status).toBe('ACCRUED')
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created fee entry for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.trusteeFeeEntry.list({
                    entityId: testData.entityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.trusteeFeeEntryIds[0],
                    ),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'listWithSchedule returns entries with schedule and trustee relations',
            async () => {
                const caller = adminCaller()
                const results = await caller.trusteeFeeEntry.listWithSchedule({
                    entityId: testData.entityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                const found = results.find(
                    (r) => r.id === testData.trusteeFeeEntryIds[0],
                )
                expect(found).toBeDefined()
                // listWithSchedule includes schedule and trustee relations
                expect(found?.schedule).toBeDefined()
                expect(found?.trustee).toBeDefined()
                expect(found?.trustee?.name).toBe(`CrudRem Trustee ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific fee entry',
            async () => {
                const caller = adminCaller()
                const entryId = testData.trusteeFeeEntryIds[0]!
                const result = await caller.trusteeFeeEntry.byId({
                    id: entryId,
                    entityId: testData.entityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(entryId)
                expect(result?.assetFee).toBe('500.00')
                expect(result?.totalFee).toBe('700.00')
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the fee entry and returns updated record',
            async () => {
                const caller = adminCaller()
                const entryId = testData.trusteeFeeEntryIds[0]!
                const updated = await caller.trusteeFeeEntry.update({
                    id: entryId,
                    entityId: testData.entityId!,
                    data: { assetFee: '600.00', totalFee: '800.00' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(entryId)
                expect(updated.assetFee).toBe('600.00')
                expect(updated.totalFee).toBe('800.00')
                // Original fields should be preserved
                expect(updated.incomeFee).toBe('200.00')
                expect(updated.entityId).toBe(testData.entityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the fee entry and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const entryId = testData.trusteeFeeEntryIds[0]!
                const deleted = await caller.trusteeFeeEntry.delete({
                    id: entryId,
                    entityId: testData.entityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(entryId)

                // Verify it is gone
                const result = await caller.trusteeFeeEntry.byId({
                    id: entryId,
                    entityId: testData.entityId!,
                })
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.trusteeFeeEntryIds =
                    testData.trusteeFeeEntryIds.filter((id) => id !== entryId)
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 5. VALUATION ROUTER (global, with forAsset)
    // =========================================================================

    describe('valuation', () => {
        test(
            'create returns a new valuation linked to a vehicle',
            async () => {
                const caller = adminCaller()
                const valuationDate = new Date().toISOString()

                const created = await caller.valuation.create({
                    vehicleId: testData.vehicleId!,
                    valuationDate,
                    value: '35000.00',
                    valuationType: 'APPRAISAL',
                    source: `Test Appraiser ${TS}`,
                    notes: `Appraisal for test vehicle ${TS}`,
                })
                testData.valuationIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.vehicleId).toBe(testData.vehicleId)
                expect(created.value).toBe('35000.00')
                expect(created.valuationType).toBe('APPRAISAL')
                expect(created.source).toBe(`Test Appraiser ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created valuation',
            async () => {
                const caller = adminCaller()
                const results = await caller.valuation.list()

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testData.valuationIds[0]),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific valuation',
            async () => {
                const caller = adminCaller()
                const valId = testData.valuationIds[0]!
                const result = await caller.valuation.byId(valId)

                expect(result).toBeDefined()
                expect(result?.id).toBe(valId)
                expect(result?.value).toBe('35000.00')
                expect(result?.vehicleId).toBe(testData.vehicleId)
            },
            TEST_TIMEOUT,
        )

        test(
            'forAsset returns valuations for a specific vehicle',
            async () => {
                const caller = adminCaller()
                const results = await caller.valuation.forAsset({
                    assetType: 'vehicle',
                    assetId: testData.vehicleId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(results.length).toBeGreaterThanOrEqual(1)
                const found = results.find(
                    (r) => r.id === testData.valuationIds[0],
                )
                expect(found).toBeDefined()
                expect(found?.vehicleId).toBe(testData.vehicleId)
                expect(found?.value).toBe('35000.00')
            },
            TEST_TIMEOUT,
        )

        test(
            'forAsset returns empty array for vehicle with no valuations',
            async () => {
                const caller = adminCaller()
                const results = await caller.valuation.forAsset({
                    assetType: 'vehicle',
                    assetId: 999999,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(results.length).toBe(0)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the valuation and returns updated record',
            async () => {
                const caller = adminCaller()
                const valId = testData.valuationIds[0]!
                const updated = await caller.valuation.update({
                    id: valId,
                    data: { value: '37500.00', notes: 'Revised appraisal' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(valId)
                expect(updated.value).toBe('37500.00')
                expect(updated.notes).toBe('Revised appraisal')
                // Original fields should be preserved
                expect(updated.vehicleId).toBe(testData.vehicleId)
                expect(updated.valuationType).toBe('APPRAISAL')
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the valuation and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const valId = testData.valuationIds[0]!
                const deleted = await caller.valuation.delete(valId)

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(valId)

                // Verify it is gone
                const result = await caller.valuation.byId(valId)
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.valuationIds = testData.valuationIds.filter(
                    (id) => id !== valId,
                )
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // 6. WITHDRAWAL RECORD ROUTER (entity-scoped, optional beneficiaryId)
    // =========================================================================

    describe('withdrawalRecord', () => {
        test(
            'create returns a new withdrawal record with an id',
            async () => {
                const caller = adminCaller()
                const eligibleDate = '2030-06-15T00:00:00.000Z'

                const created = await caller.withdrawalRecord.create({
                    beneficiaryId: testData.beneficiaryId!,
                    entityId: testData.entityId!,
                    withdrawalType: 'AGE_25',
                    eligibleDate,
                    eligibleAmount: '100000.00',
                    withdrawnAmount: '0',
                    remainingAmount: '100000.00',
                    status: 'NOT_YET_ELIGIBLE',
                    notes: `Test withdrawal record ${TS}`,
                })
                testData.withdrawalRecordIds.push(created.id)

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.beneficiaryId).toBe(testData.beneficiaryId)
                expect(created.entityId).toBe(testData.entityId)
                expect(created.withdrawalType).toBe('AGE_25')
                expect(created.eligibleAmount).toBe('100000.00')
                expect(created.withdrawnAmount).toBe('0.00')
                expect(created.status).toBe('NOT_YET_ELIGIBLE')
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created withdrawal record for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.withdrawalRecord.list({
                    entityId: testData.entityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.withdrawalRecordIds[0],
                    ),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'list with beneficiaryId filter returns only matching records',
            async () => {
                const caller = adminCaller()
                const results = await caller.withdrawalRecord.list({
                    entityId: testData.entityId!,
                    beneficiaryId: testData.beneficiaryId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some(
                        (r) => r.id === testData.withdrawalRecordIds[0],
                    ),
                ).toBe(true)
                // All returned records should belong to our beneficiary
                for (const r of results) {
                    expect(r.beneficiaryId).toBe(testData.beneficiaryId)
                }
            },
            TEST_TIMEOUT,
        )

        test(
            'list with non-matching beneficiaryId returns empty or excludes our record',
            async () => {
                const caller = adminCaller()
                const results = await caller.withdrawalRecord.list({
                    entityId: testData.entityId!,
                    beneficiaryId: 999999,
                })

                expect(Array.isArray(results)).toBe(true)
                // Our withdrawal record should not be in the results
                expect(
                    results.some(
                        (r) => r.id === testData.withdrawalRecordIds[0],
                    ),
                ).toBe(false)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific withdrawal record',
            async () => {
                const caller = adminCaller()
                const wrId = testData.withdrawalRecordIds[0]!
                const result = await caller.withdrawalRecord.byId({
                    id: wrId,
                    entityId: testData.entityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(wrId)
                expect(result?.withdrawalType).toBe('AGE_25')
                expect(result?.eligibleAmount).toBe('100000.00')
                expect(result?.beneficiaryId).toBe(testData.beneficiaryId)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the withdrawal record and returns updated record',
            async () => {
                const caller = adminCaller()
                const wrId = testData.withdrawalRecordIds[0]!
                const updated = await caller.withdrawalRecord.update({
                    id: wrId,
                    entityId: testData.entityId!,
                    data: {
                        status: 'ELIGIBLE',
                        notes: 'Beneficiary has reached age 25',
                    },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(wrId)
                expect(updated.status).toBe('ELIGIBLE')
                expect(updated.notes).toBe('Beneficiary has reached age 25')
                // Original fields should be preserved
                expect(updated.withdrawalType).toBe('AGE_25')
                expect(updated.eligibleAmount).toBe('100000.00')
                expect(updated.beneficiaryId).toBe(testData.beneficiaryId)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the withdrawal record and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const wrId = testData.withdrawalRecordIds[0]!
                const deleted = await caller.withdrawalRecord.delete({
                    id: wrId,
                    entityId: testData.entityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(wrId)

                // Verify it is gone
                const result = await caller.withdrawalRecord.byId({
                    id: wrId,
                    entityId: testData.entityId!,
                })
                expect(result).toBeUndefined()

                // Remove from cleanup since already deleted
                testData.withdrawalRecordIds =
                    testData.withdrawalRecordIds.filter((id) => id !== wrId)
            },
            TEST_TIMEOUT,
        )
    })
})
