/**
 * tRPC tests for the dashboard router — focus on the new `activityCounts`
 * query (plan 25-01). Written RED-first: `dashboard.activityCounts` does not
 * exist when this file is created, so every shape/scope test fails until
 * Task 3 implements the procedure.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { getPublicDb } from '@/db'
import { activityLog, bankAccount, entity } from '@/db/schema'
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
            id: '981',
            name: 'Dashboard Test Admin',
            email: 'dashboard-admin@test.com',
        }),
    )
}

function beneficiaryCaller() {
    return createCaller(
        createBeneficiaryContext(null, {
            id: '982',
            name: 'Dashboard Test Ben',
            email: 'dashboard-ben@test.com',
        }),
    )
}

/** Day offset → ISO timestamp string at noon, so day-bucketing is deterministic. */
function isoDaysAgo(offset: number): string {
    const d = new Date()
    d.setUTCHours(12, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - offset)
    return d.toISOString()
}

const ids = {
    entityId: null as number | null,
    otherEntityId: null as number | null,
    bankA: null as number | null,
    bankB: null as number | null,
    bankOther: null as number | null,
    activityIds: [] as number[],
}

// Activity rows seeded inside the 30-day window for the in-scope entity.
// 3 rows fall inside the window; 1 row is 40 days old (outside the window).
const IN_WINDOW_DAYS = [0, 5, 5, 12]
const OUT_OF_WINDOW_DAYS = [40]

describe.skipIf(isProductionDb)('dashboard.activityCounts', () => {
    beforeAll(async () => {
        const pub = getPublicDb()
        const now = new Date().toISOString()

        const [e1] = await pub
            .insert(entity)
            .values({
                name: `Dashboard Test Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.entityId = e1.id

        const [e2] = await pub
            .insert(entity)
            .values({
                name: `Dashboard Other Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.otherEntityId = e2.id

        const banks = await pub
            .insert(bankAccount)
            .values([
                {
                    entityId: e1.id,
                    name: `Dashboard Bank A ${TS}`,
                    institution: 'Test Bank',
                    accountType: 'CHECKING',
                    accountNumber: `DA-${TS}`,
                    updatedAt: now,
                },
                {
                    entityId: e1.id,
                    name: `Dashboard Bank B ${TS}`,
                    institution: 'Test Bank',
                    accountType: 'SAVINGS',
                    accountNumber: `DB-${TS}`,
                    updatedAt: now,
                },
                {
                    entityId: e2.id,
                    name: `Dashboard Bank Other ${TS}`,
                    institution: 'Test Bank',
                    accountType: 'CHECKING',
                    accountNumber: `DO-${TS}`,
                    updatedAt: now,
                },
            ])
            .returning()
        ids.bankA = banks[0].id
        ids.bankB = banks[1].id
        ids.bankOther = banks[2].id

        // In-scope: bank_account activity for entity 1's records, inside window.
        const inScopeRows = IN_WINDOW_DAYS.map((daysAgo, i) => ({
            tableName: 'bank_account',
            recordId: String(i % 2 === 0 ? ids.bankA : ids.bankB),
            action: 'UPDATE' as const,
            changedBy: 'system',
            createdAt: isoDaysAgo(daysAgo),
        }))
        // In-scope table+entity but OUTSIDE the 30-day window.
        const outOfWindowRows = OUT_OF_WINDOW_DAYS.map((daysAgo) => ({
            tableName: 'bank_account',
            recordId: String(ids.bankA),
            action: 'UPDATE' as const,
            changedBy: 'system',
            createdAt: isoDaysAgo(daysAgo),
        }))
        // Cross-entity: bank_account activity for entity 2's record, inside window.
        const crossEntityRows = [
            {
                tableName: 'bank_account',
                recordId: String(ids.bankOther),
                action: 'UPDATE' as const,
                changedBy: 'system',
                createdAt: isoDaysAgo(3),
            },
            {
                tableName: 'bank_account',
                recordId: String(ids.bankOther),
                action: 'UPDATE' as const,
                changedBy: 'system',
                createdAt: isoDaysAgo(8),
            },
        ]

        const inserted = await pub
            .insert(activityLog)
            .values([...inScopeRows, ...outOfWindowRows, ...crossEntityRows])
            .returning({ id: activityLog.id })
        ids.activityIds = inserted.map((r) => r.id)
    }, TEST_TIMEOUT)

    afterAll(async () => {
        const pub = getPublicDb()
        if (ids.activityIds.length > 0) {
            await pub
                .delete(activityLog)
                .where(inArray(activityLog.id, ids.activityIds))
        }
        if (ids.entityId) {
            await pub
                .delete(bankAccount)
                .where(eq(bankAccount.entityId, ids.entityId))
            await pub.delete(entity).where(eq(entity.id, ids.entityId))
        }
        if (ids.otherEntityId) {
            await pub
                .delete(bankAccount)
                .where(eq(bankAccount.entityId, ids.otherEntityId))
            await pub.delete(entity).where(eq(entity.id, ids.otherEntityId))
        }
    }, TEST_TIMEOUT)

    test(
        'rejects a non-admin (beneficiary) caller — adminProcedure gated (T-25-01)',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.dashboard.activityCounts({
                    entityId: ids.entityId as number,
                    tableName: 'bank_account',
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'rejects an off-allowlist tableName via Zod validation (T-25-02)',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.dashboard.activityCounts({
                    entityId: ids.entityId as number,
                    // @ts-expect-error — intentionally off the z.enum allowlist
                    tableName: 'drop_table',
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'returns a dense 30-bucket day series totaling the in-window rows',
        async () => {
            const caller = adminCaller()
            const result = await caller.dashboard.activityCounts({
                entityId: ids.entityId as number,
                tableName: 'bank_account',
            })

            expect(Array.isArray(result)).toBe(true)
            // days defaults to 30 → exactly 30 buckets, one per day.
            expect(result.length).toBe(30)

            for (const bucket of result) {
                expect(typeof bucket.date).toBe('string')
                expect(typeof bucket.count).toBe('number')
            }

            // Series must be ordered oldest → newest.
            const dates = result.map((b) => b.date)
            const sortedDates = [...dates].sort()
            expect(dates).toEqual(sortedDates)

            // Total across all buckets equals the in-window seeded rows for
            // this entity (3 rows; the 40-day-old row is excluded).
            const total = result.reduce((sum, b) => sum + b.count, 0)
            expect(total).toBe(IN_WINDOW_DAYS.length)
        },
        TEST_TIMEOUT,
    )

    test(
        'excludes activity for records belonging to a different entity (T-25-01)',
        async () => {
            const caller = adminCaller()

            const inScope = await caller.dashboard.activityCounts({
                entityId: ids.entityId as number,
                tableName: 'bank_account',
            })
            const otherScope = await caller.dashboard.activityCounts({
                entityId: ids.otherEntityId as number,
                tableName: 'bank_account',
            })

            const inScopeTotal = inScope.reduce((s, b) => s + b.count, 0)
            const otherScopeTotal = otherScope.reduce((s, b) => s + b.count, 0)

            // entity 1 sees only its own 3 in-window rows.
            expect(inScopeTotal).toBe(IN_WINDOW_DAYS.length)
            // entity 2 sees only its own 2 cross-entity rows — never entity 1's.
            expect(otherScopeTotal).toBe(2)
        },
        TEST_TIMEOUT,
    )
})
