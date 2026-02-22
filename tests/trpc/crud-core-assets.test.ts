/**
 * tRPC CRUD Operations Tests - Core Routers
 *
 * Tests the full create -> list -> byId -> update -> delete lifecycle for:
 *
 * Core routers (no entityId scoping):
 *   - entity
 *   - contact
 *
 * Note: Asset routers (bankAccount, investmentAccount, homestead, rentalProperty,
 * vehicle, personalProperty, artwork) and task were removed from tRPC and are now
 * served via Neon Data API (PostgREST).
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { contact, entity } from '@/db/schema'
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
            id: 'test-crud-admin',
            name: 'CRUD Test Admin',
            email: 'crud-admin@test.com',
        }),
    )
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
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

describe.skipIf(isProductionDb)(
    'CRUD Operations - Core & Asset Routers',
    () => {
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
            // Core records (no FK dependencies on each other)
            if (testIds.contactId)
                await db
                    .delete(contact)
                    .where(eq(contact.id, testIds.contactId))
            if (testIds.entityId)
                await db.delete(entity).where(eq(entity.id, testIds.entityId))

            // Finally, the parent entity
            if (testIds.parentEntityId)
                await db
                    .delete(entity)
                    .where(eq(entity.id, testIds.parentEntityId))
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
                    const deleted = await caller.entity.delete(
                        testIds.entityId!,
                    )

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
                    expect(
                        results.some((r) => r.id === testIds.contactId),
                    ).toBe(true)
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
                    expect(
                        results.some((r) => r.id === testIds.contactId),
                    ).toBe(true)
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
                    const deleted = await caller.contact.delete(
                        testIds.contactId!,
                    )

                    expect(deleted).toBeDefined()
                    expect(deleted.id).toBe(testIds.contactId)

                    const result = await caller.contact.byId(testIds.contactId!)
                    expect(result).toBeUndefined()

                    testIds.contactId = null
                },
                TEST_TIMEOUT,
            )
        })
    },
)
