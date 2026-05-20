/** tRPC tests for the beneficiary router `reorder` mutation (plan 23-04, sortIndex column). */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { beneficiary, entity } from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import {
    createAdminContext,
    createBeneficiaryContext,
} from '../helpers/mock-context'

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)
const TS = Date.now().toString().slice(-8)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '993',
            name: 'Ben Reorder Admin',
            email: 'ben-reorder-admin@test.com',
        }),
    )
}

function beneficiaryCaller() {
    return createCaller(
        createBeneficiaryContext(null, {
            id: '994',
            name: 'Ben Reorder Ben',
            email: 'ben-reorder-ben@test.com',
        }),
    )
}

const ids = {
    entityId: null as number | null,
    otherEntityId: null as number | null,
    b1: null as number | null,
    b2: null as number | null,
    b3: null as number | null,
}

describe.skipIf(isProductionDb)('beneficiary router — reorder', () => {
    beforeAll(async () => {
        const [e1] = await db
            .insert(entity)
            .values({
                name: `Ben Reorder Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.entityId = e1.id

        const [e2] = await db
            .insert(entity)
            .values({
                name: `Ben Reorder Other Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.otherEntityId = e2.id

        const inserted = await db
            .insert(beneficiary)
            .values([
                {
                    entityId: e1.id,
                    firstName: 'Ann',
                    lastName: `Reorder ${TS}`,
                    relationship: 'Child',
                    updatedAt: new Date().toISOString(),
                },
                {
                    entityId: e1.id,
                    firstName: 'Bea',
                    lastName: `Reorder ${TS}`,
                    relationship: 'Child',
                    updatedAt: new Date().toISOString(),
                },
                {
                    entityId: e1.id,
                    firstName: 'Cal',
                    lastName: `Reorder ${TS}`,
                    relationship: 'Child',
                    updatedAt: new Date().toISOString(),
                },
            ])
            .returning()
        ids.b1 = inserted[0].id
        ids.b2 = inserted[1].id
        ids.b3 = inserted[2].id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (ids.entityId) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.entityId, ids.entityId))
            await db.delete(entity).where(eq(entity.id, ids.entityId))
        }
        if (ids.otherEntityId) {
            await db.delete(entity).where(eq(entity.id, ids.otherEntityId))
        }
    }, TEST_TIMEOUT)

    test(
        'updates sortIndex field for all matched beneficiaries',
        async () => {
            const caller = adminCaller()
            const result = await caller.beneficiary.reorder({
                entityId: ids.entityId as number,
                orderedIds: [
                    ids.b3 as number,
                    ids.b1 as number,
                    ids.b2 as number,
                ],
            })
            expect(result.length).toBe(3)

            const refreshed = await caller.beneficiary.list({
                entityId: ids.entityId as number,
            })
            const sorted = [...refreshed].sort(
                (a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0),
            )
            expect(sorted[0]?.id).toBe(ids.b3 as number)
            expect(sorted[1]?.id).toBe(ids.b1 as number)
            expect(sorted[2]?.id).toBe(ids.b2 as number)
        },
        TEST_TIMEOUT,
    )

    test(
        'throws NOT_FOUND when an id is missing from this entity',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.beneficiary.reorder({
                    entityId: ids.entityId as number,
                    orderedIds: [ids.b1 as number, 99999999],
                }),
            ).rejects.toThrow(/not found in this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'throws NOT_FOUND when an id belongs to a different entity (T-23-05)',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.beneficiary.reorder({
                    entityId: ids.otherEntityId as number,
                    orderedIds: [ids.b1 as number],
                }),
            ).rejects.toThrow(/not found in this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'rejects non-admin context',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.beneficiary.reorder({
                    entityId: ids.entityId as number,
                    orderedIds: [ids.b1 as number],
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )
})
