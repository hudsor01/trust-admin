/** tRPC tests for the trustee router — focus on the new `reorder` mutation (plan 23-04). */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { entity, trustee } from '@/db/schema'
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
            id: '991',
            name: 'Trustee Test Admin',
            email: 'trustee-admin@test.com',
        }),
    )
}

function beneficiaryCaller() {
    return createCaller(
        createBeneficiaryContext(null, {
            id: '992',
            name: 'Trustee Test Ben',
            email: 'trustee-ben@test.com',
        }),
    )
}

const ids = {
    entityId: null as number | null,
    otherEntityId: null as number | null,
    t1: null as number | null,
    t2: null as number | null,
    t3: null as number | null,
}

describe.skipIf(isProductionDb)('trustee router — reorder', () => {
    beforeAll(async () => {
        const [e1] = await db
            .insert(entity)
            .values({
                name: `Trustee Test Entity ${TS}`,
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
                name: `Trustee Other Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.otherEntityId = e2.id

        const inserted = await db
            .insert(trustee)
            .values([
                {
                    entityId: e1.id,
                    name: `Trustee A ${TS}`,
                    order: 0,
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString(),
                },
                {
                    entityId: e1.id,
                    name: `Trustee B ${TS}`,
                    order: 1,
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString(),
                },
                {
                    entityId: e1.id,
                    name: `Trustee C ${TS}`,
                    order: 2,
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString(),
                },
            ])
            .returning()
        ids.t1 = inserted[0].id
        ids.t2 = inserted[1].id
        ids.t3 = inserted[2].id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (ids.entityId) {
            await db.delete(trustee).where(eq(trustee.entityId, ids.entityId))
            await db.delete(entity).where(eq(entity.id, ids.entityId))
        }
        if (ids.otherEntityId) {
            await db.delete(entity).where(eq(entity.id, ids.otherEntityId))
        }
    }, TEST_TIMEOUT)

    test(
        'updates order field for all matched trustees',
        async () => {
            const caller = adminCaller()
            const result = await caller.trustee.reorder({
                entityId: ids.entityId as number,
                orderedIds: [
                    ids.t3 as number,
                    ids.t1 as number,
                    ids.t2 as number,
                ],
            })
            expect(result.length).toBe(3)

            const refreshed = await caller.trustee.list({
                entityId: ids.entityId as number,
            })
            const sorted = [...refreshed].sort(
                (a, b) => (a.order ?? 0) - (b.order ?? 0),
            )
            expect(sorted[0]?.id).toBe(ids.t3 as number)
            expect(sorted[1]?.id).toBe(ids.t1 as number)
            expect(sorted[2]?.id).toBe(ids.t2 as number)
        },
        TEST_TIMEOUT,
    )

    test(
        'throws NOT_FOUND when an id is missing from this entity',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.trustee.reorder({
                    entityId: ids.entityId as number,
                    orderedIds: [ids.t1 as number, 99999999],
                }),
            ).rejects.toThrow(/not found in this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'throws NOT_FOUND when an id belongs to a different entity (T-23-05)',
        async () => {
            const caller = adminCaller()
            // t1 is real but belongs to ids.entityId — passing otherEntityId
            // means the WHERE clause matches no row.
            await expect(
                caller.trustee.reorder({
                    entityId: ids.otherEntityId as number,
                    orderedIds: [ids.t1 as number],
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
                caller.trustee.reorder({
                    entityId: ids.entityId as number,
                    orderedIds: [ids.t1 as number],
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )
})
