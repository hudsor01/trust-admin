import '../helpers/db-guard'
/**
 * tRPC CRUD Operations Tests - Core & Asset Routers
 *
 * Tests the full create -> list -> byId -> update -> delete lifecycle for:
 *
 * Core routers (no entityId scoping):
 *   - entity
 *   - contact
 *   - task
 *
 * Asset routers (entityId-scoped):
 *   - bankAccount
 *   - investmentAccount
 *   - homestead
 *   - rentalProperty
 *   - vehicle
 *   - personalProperty
 *   - artwork
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import {
    artwork,
    bankAccount,
    contact,
    entity,
    homestead,
    investmentAccount,
    personalProperty,
    rentalProperty,
    task,
    vehicle,
} from '../../db/schema'
import { createCallerFactory } from '../../src/server/trpc/index'
import { appRouter } from '../../src/server/trpc/router'

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
                id: 'test-crud-admin',
                name: 'CRUD Test Admin',
                email: 'crud-admin@test.com',
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
            id: 'test-crud-admin',
            name: 'CRUD Test Admin',
            email: 'crud-admin@test.com',
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
const testIds = {
    // Parent entity created in beforeAll for asset routers
    parentEntityId: null as number | null,

    // Core router records (created by tests)
    entityId: null as number | null,
    contactId: null as number | null,
    taskId: null as number | null,

    // Asset router records (created by tests)
    bankAccountId: null as number | null,
    investmentAccountId: null as number | null,
    homesteadId: null as number | null,
    rentalPropertyId: null as number | null,
    vehicleId: null as number | null,
    personalPropertyId: null as number | null,
    artworkId: null as number | null,
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe('CRUD Operations - Core & Asset Routers', () => {
    beforeAll(async () => {
        // Create a parent entity that asset routers will reference via entityId
        const [parentEntity] = await db
            .insert(entity)
            .values({
                name: `CRUD Parent Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        testIds.parentEntityId = parentEntity.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Clean up in reverse FK order to avoid constraint violations.
        // Asset records reference the parent entity, so delete them first.
        if (testIds.artworkId)
            await db.delete(artwork).where(eq(artwork.id, testIds.artworkId))
        if (testIds.personalPropertyId)
            await db
                .delete(personalProperty)
                .where(eq(personalProperty.id, testIds.personalPropertyId))
        if (testIds.vehicleId)
            await db.delete(vehicle).where(eq(vehicle.id, testIds.vehicleId))
        if (testIds.rentalPropertyId)
            await db
                .delete(rentalProperty)
                .where(eq(rentalProperty.id, testIds.rentalPropertyId))
        if (testIds.homesteadId)
            await db
                .delete(homestead)
                .where(eq(homestead.id, testIds.homesteadId))
        if (testIds.investmentAccountId)
            await db
                .delete(investmentAccount)
                .where(eq(investmentAccount.id, testIds.investmentAccountId))
        if (testIds.bankAccountId)
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.id, testIds.bankAccountId))

        // Core records (no FK dependencies on each other)
        if (testIds.taskId)
            await db.delete(task).where(eq(task.id, testIds.taskId))
        if (testIds.contactId)
            await db.delete(contact).where(eq(contact.id, testIds.contactId))
        if (testIds.entityId)
            await db.delete(entity).where(eq(entity.id, testIds.entityId))

        // Finally, the parent entity
        if (testIds.parentEntityId)
            await db.delete(entity).where(eq(entity.id, testIds.parentEntityId))
    }, TEST_TIMEOUT)

    // =========================================================================
    // ENTITY ROUTER
    // =========================================================================

    describe('entity', () => {
        test(
            'create returns a new entity with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.entity.create({
                    name: `CRUD Test Entity ${TS}`,
                    entityType: 'TRUST',
                })
                testIds.entityId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.name).toBe(`CRUD Test Entity ${TS}`)
                expect(created.entityType).toBe('TRUST')
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.entity.list()

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.entityId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific entity',
            async () => {
                const caller = adminCaller()
                const result = await caller.entity.byId(testIds.entityId!)

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.entityId)
                expect(result?.name).toBe(`CRUD Test Entity ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the entity and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.entity.update({
                    id: testIds.entityId!,
                    data: { governingLaw: 'Texas' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.entityId)
                expect(updated.governingLaw).toBe('Texas')
                // Original fields should be preserved
                expect(updated.name).toBe(`CRUD Test Entity ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the entity and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.entity.delete(testIds.entityId!)

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.entityId)

                // Verify it is gone
                const result = await caller.entity.byId(testIds.entityId!)
                expect(result).toBeUndefined()

                // Clear tracked ID so afterAll does not attempt double-delete
                testIds.entityId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // CONTACT ROUTER
    // =========================================================================

    describe('contact', () => {
        test(
            'create returns a new contact with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.contact.create({
                    name: `Test Contact ${TS}`,
                    role: 'ATTORNEY',
                })
                testIds.contactId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.name).toBe(`Test Contact ${TS}`)
                expect(created.role).toBe('ATTORNEY')
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created contact',
            async () => {
                const caller = adminCaller()
                const results = await caller.contact.list()

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.contactId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'list with optional entityId still returns contacts',
            async () => {
                const caller = adminCaller()
                const results = await caller.contact.list({
                    entityId: testIds.parentEntityId!,
                })

                // Contacts are shared across entities, so list returns all
                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.contactId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific contact',
            async () => {
                const caller = adminCaller()
                const result = await caller.contact.byId(testIds.contactId!)

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.contactId)
                expect(result?.name).toBe(`Test Contact ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the contact and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.contact.update({
                    id: testIds.contactId!,
                    data: { company: 'Test Law Firm' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.contactId)
                expect(updated.company).toBe('Test Law Firm')
                expect(updated.name).toBe(`Test Contact ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the contact and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.contact.delete(testIds.contactId!)

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.contactId)

                const result = await caller.contact.byId(testIds.contactId!)
                expect(result).toBeUndefined()

                testIds.contactId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // TASK ROUTER
    // =========================================================================

    describe('task', () => {
        test(
            'create returns a new task with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.task.create({
                    title: `CRUD Test Task ${TS}`,
                    category: 'FINANCIAL',
                })
                testIds.taskId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.title).toBe(`CRUD Test Task ${TS}`)
                expect(created.category).toBe('FINANCIAL')
                expect(created.completed).toBe(false)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created task',
            async () => {
                const caller = adminCaller()
                const results = await caller.task.list()

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.taskId)).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific task',
            async () => {
                const caller = adminCaller()
                const result = await caller.task.byId(testIds.taskId!)

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.taskId)
                expect(result?.title).toBe(`CRUD Test Task ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the task and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.task.update({
                    id: testIds.taskId!,
                    data: { completed: true, notes: 'Done in test' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.taskId)
                expect(updated.completed).toBe(true)
                expect(updated.notes).toBe('Done in test')
                expect(updated.title).toBe(`CRUD Test Task ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the task and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.task.delete(testIds.taskId!)

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.taskId)

                const result = await caller.task.byId(testIds.taskId!)
                expect(result).toBeUndefined()

                testIds.taskId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // BANK ACCOUNT ROUTER (entity-scoped)
    // =========================================================================

    describe('bankAccount', () => {
        test(
            'create returns a new bank account with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.bankAccount.create({
                    entityId: testIds.parentEntityId!,
                    institution: `Test Bank ${TS}`,
                    accountType: 'CHECKING',
                    accountNumber: `ACCT${TS}`,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.bankAccountId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.institution).toBe(`Test Bank ${TS}`)
                expect(created.accountType).toBe('CHECKING')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created bank account for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.bankAccount.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testIds.bankAccountId),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific bank account',
            async () => {
                const caller = adminCaller()
                const result = await caller.bankAccount.byId({
                    id: testIds.bankAccountId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.bankAccountId)
                expect(result?.institution).toBe(`Test Bank ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the bank account and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.bankAccount.update({
                    id: testIds.bankAccountId!,
                    entityId: testIds.parentEntityId!,
                    data: { currentBalance: '25000.00' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.bankAccountId)
                expect(updated.currentBalance).toBe('25000.00')
                expect(updated.institution).toBe(`Test Bank ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the bank account and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.bankAccount.delete({
                    id: testIds.bankAccountId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.bankAccountId)

                const result = await caller.bankAccount.byId({
                    id: testIds.bankAccountId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.bankAccountId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // INVESTMENT ACCOUNT ROUTER (entity-scoped)
    // =========================================================================

    describe('investmentAccount', () => {
        test(
            'create returns a new investment account with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.investmentAccount.create({
                    entityId: testIds.parentEntityId!,
                    institution: `Test Brokerage ${TS}`,
                    accountType: 'BROKERAGE',
                    accountNumber: `INV${TS}`,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.investmentAccountId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.institution).toBe(`Test Brokerage ${TS}`)
                expect(created.accountType).toBe('BROKERAGE')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created investment account for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.investmentAccount.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testIds.investmentAccountId),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific investment account',
            async () => {
                const caller = adminCaller()
                const result = await caller.investmentAccount.byId({
                    id: testIds.investmentAccountId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.investmentAccountId)
                expect(result?.institution).toBe(`Test Brokerage ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the investment account and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.investmentAccount.update({
                    id: testIds.investmentAccountId!,
                    entityId: testIds.parentEntityId!,
                    data: { costBasis: '50000.00' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.investmentAccountId)
                expect(updated.costBasis).toBe('50000.00')
                expect(updated.institution).toBe(`Test Brokerage ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the investment account and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.investmentAccount.delete({
                    id: testIds.investmentAccountId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.investmentAccountId)

                const result = await caller.investmentAccount.byId({
                    id: testIds.investmentAccountId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.investmentAccountId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // HOMESTEAD ROUTER (entity-scoped)
    // =========================================================================

    describe('homestead', () => {
        test(
            'create returns a new homestead with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.homestead.create({
                    entityId: testIds.parentEntityId!,
                    streetAddress: `${TS} Test Lane`,
                    city: 'Dallas',
                    state: 'TX',
                    zip: '75201',
                    propertyType: 'SINGLE_FAMILY',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.homesteadId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.streetAddress).toBe(`${TS} Test Lane`)
                expect(created.city).toBe('Dallas')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created homestead for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.homestead.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.homesteadId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific homestead',
            async () => {
                const caller = adminCaller()
                const result = await caller.homestead.byId({
                    id: testIds.homesteadId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.homesteadId)
                expect(result?.streetAddress).toBe(`${TS} Test Lane`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the homestead and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.homestead.update({
                    id: testIds.homesteadId!,
                    entityId: testIds.parentEntityId!,
                    data: { city: 'Fort Worth' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.homesteadId)
                expect(updated.city).toBe('Fort Worth')
                expect(updated.streetAddress).toBe(`${TS} Test Lane`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the homestead and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.homestead.delete({
                    id: testIds.homesteadId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.homesteadId)

                const result = await caller.homestead.byId({
                    id: testIds.homesteadId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.homesteadId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // RENTAL PROPERTY ROUTER (entity-scoped)
    // =========================================================================

    describe('rentalProperty', () => {
        test(
            'create returns a new rental property with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.rentalProperty.create({
                    entityId: testIds.parentEntityId!,
                    name: `Test Rental ${TS}`,
                    streetAddress: `${TS} Rental Ave`,
                    city: 'Houston',
                    state: 'TX',
                    zip: '77001',
                    propertyType: 'MULTI_FAMILY',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.rentalPropertyId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.name).toBe(`Test Rental ${TS}`)
                expect(created.city).toBe('Houston')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created rental property for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.rentalProperty.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testIds.rentalPropertyId),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific rental property',
            async () => {
                const caller = adminCaller()
                const result = await caller.rentalProperty.byId({
                    id: testIds.rentalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.rentalPropertyId)
                expect(result?.name).toBe(`Test Rental ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the rental property and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.rentalProperty.update({
                    id: testIds.rentalPropertyId!,
                    entityId: testIds.parentEntityId!,
                    data: { monthlyRent: '2500.00' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.rentalPropertyId)
                expect(updated.monthlyRent).toBe('2500.00')
                expect(updated.name).toBe(`Test Rental ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the rental property and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.rentalProperty.delete({
                    id: testIds.rentalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.rentalPropertyId)

                const result = await caller.rentalProperty.byId({
                    id: testIds.rentalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.rentalPropertyId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // VEHICLE ROUTER (entity-scoped)
    // =========================================================================

    describe('vehicle', () => {
        test(
            'create returns a new vehicle with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.vehicle.create({
                    entityId: testIds.parentEntityId!,
                    year: 2024,
                    make: 'Toyota',
                    model: 'Camry',
                    vin: `1HGCG5655WA0${TS.slice(0, 5)}`,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.vehicleId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.make).toBe('Toyota')
                expect(created.model).toBe('Camry')
                expect(created.year).toBe(2024)
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created vehicle for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.vehicle.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.vehicleId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific vehicle',
            async () => {
                const caller = adminCaller()
                const result = await caller.vehicle.byId({
                    id: testIds.vehicleId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.vehicleId)
                expect(result?.make).toBe('Toyota')
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the vehicle and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.vehicle.update({
                    id: testIds.vehicleId!,
                    entityId: testIds.parentEntityId!,
                    data: { mileage: 15000 },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.vehicleId)
                expect(updated.mileage).toBe(15000)
                expect(updated.make).toBe('Toyota')
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the vehicle and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.vehicle.delete({
                    id: testIds.vehicleId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.vehicleId)

                const result = await caller.vehicle.byId({
                    id: testIds.vehicleId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.vehicleId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // PERSONAL PROPERTY ROUTER (entity-scoped)
    // =========================================================================

    describe('personalProperty', () => {
        test(
            'create returns a new personal property with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.personalProperty.create({
                    entityId: testIds.parentEntityId!,
                    name: `Test Jewelry ${TS}`,
                    category: 'JEWELRY',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.personalPropertyId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.name).toBe(`Test Jewelry ${TS}`)
                expect(created.category).toBe('JEWELRY')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created personal property for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.personalProperty.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(
                    results.some((r) => r.id === testIds.personalPropertyId),
                ).toBe(true)
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific personal property',
            async () => {
                const caller = adminCaller()
                const result = await caller.personalProperty.byId({
                    id: testIds.personalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.personalPropertyId)
                expect(result?.name).toBe(`Test Jewelry ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the personal property and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.personalProperty.update({
                    id: testIds.personalPropertyId!,
                    entityId: testIds.parentEntityId!,
                    data: { location: 'Safe deposit box' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.personalPropertyId)
                expect(updated.location).toBe('Safe deposit box')
                expect(updated.name).toBe(`Test Jewelry ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the personal property and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.personalProperty.delete({
                    id: testIds.personalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.personalPropertyId)

                const result = await caller.personalProperty.byId({
                    id: testIds.personalPropertyId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.personalPropertyId = null
            },
            TEST_TIMEOUT,
        )
    })

    // =========================================================================
    // ARTWORK ROUTER (entity-scoped)
    // =========================================================================

    describe('artwork', () => {
        test(
            'create returns a new artwork with an id',
            async () => {
                const caller = adminCaller()
                const created = await caller.artwork.create({
                    entityId: testIds.parentEntityId!,
                    title: `Test Painting ${TS}`,
                    artist: 'Test Artist',
                    medium: 'Oil on canvas',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                })
                testIds.artworkId = created.id

                expect(created).toBeDefined()
                expect(created.id).toBeGreaterThan(0)
                expect(created.title).toBe(`Test Painting ${TS}`)
                expect(created.artist).toBe('Test Artist')
                expect(created.medium).toBe('Oil on canvas')
                expect(created.entityId).toBe(testIds.parentEntityId)
            },
            TEST_TIMEOUT,
        )

        test(
            'list returns the created artwork for the entity',
            async () => {
                const caller = adminCaller()
                const results = await caller.artwork.list({
                    entityId: testIds.parentEntityId!,
                })

                expect(Array.isArray(results)).toBe(true)
                expect(results.some((r) => r.id === testIds.artworkId)).toBe(
                    true,
                )
            },
            TEST_TIMEOUT,
        )

        test(
            'byId returns the specific artwork',
            async () => {
                const caller = adminCaller()
                const result = await caller.artwork.byId({
                    id: testIds.artworkId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(result).toBeDefined()
                expect(result?.id).toBe(testIds.artworkId)
                expect(result?.title).toBe(`Test Painting ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'update modifies the artwork and returns updated record',
            async () => {
                const caller = adminCaller()
                const updated = await caller.artwork.update({
                    id: testIds.artworkId!,
                    entityId: testIds.parentEntityId!,
                    data: { dimensions: '24x36 inches' },
                })

                expect(updated).toBeDefined()
                expect(updated.id).toBe(testIds.artworkId)
                expect(updated.dimensions).toBe('24x36 inches')
                expect(updated.title).toBe(`Test Painting ${TS}`)
            },
            TEST_TIMEOUT,
        )

        test(
            'delete removes the artwork and returns the deleted record',
            async () => {
                const caller = adminCaller()
                const deleted = await caller.artwork.delete({
                    id: testIds.artworkId!,
                    entityId: testIds.parentEntityId!,
                })

                expect(deleted).toBeDefined()
                expect(deleted.id).toBe(testIds.artworkId)

                const result = await caller.artwork.byId({
                    id: testIds.artworkId!,
                    entityId: testIds.parentEntityId!,
                })
                expect(result).toBeUndefined()

                testIds.artworkId = null
            },
            TEST_TIMEOUT,
        )
    })
})
