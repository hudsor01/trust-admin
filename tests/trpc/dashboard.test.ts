/**
 * tRPC tests for the dashboard router — focus on the new `activityCounts`
 * query (plan 25-01). Written RED-first: `dashboard.activityCounts` does not
 * exist when this file is created, so every shape/scope test fails until
 * Task 3 implements the procedure.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { db, getPublicDb } from '@/db'
import { activityLog, bankAccount, entity, firearm } from '@/db/schema'
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

// =============================================================================
// dashboard.summary — firearm aggregator coverage (GAP-31-02 + GAP-31-03)
// =============================================================================
//
// Phase 31 wired the `firearm` table into `dashboard.summary` so totals and
// allocation charts include firearms. The original verification was a
// programmatic UAT script (`scripts/verify-phase-31.ts`) that was created,
// run, and removed — leaving a transcript-only audit trail. This describe
// block formalizes that probe as a permanent regression test (GAP-31-03)
// and closes GAP-31-02 (no automated dashboard.summary coverage).
//
// What's covered:
// - dashboard.summary response shape includes the `firearms` array (ASSET-01)
// - The array is entity-scoped: foreign-entity firearms do not leak
// - Firearm row fields needed by DashboardClient downstream (dodValue, name)
//   round-trip through the wire correctly
// =============================================================================

describe.skipIf(isProductionDb)(
    'dashboard.summary — firearm aggregator (Phase 31)',
    () => {
        const summaryIds = {
            entityId: null as number | null,
            otherEntityId: null as number | null,
            firearmId: null as number | null,
            otherFirearmId: null as number | null,
        }

        beforeAll(async () => {
            const pub = getPublicDb()
            const now = new Date().toISOString()

            const [e1] = await pub
                .insert(entity)
                .values({
                    name: `Dashboard Firearm Test ${TS}`,
                    entityType: 'TRUST',
                    updatedAt: now,
                })
                .returning()
            summaryIds.entityId = e1.id

            const [e2] = await pub
                .insert(entity)
                .values({
                    name: `Dashboard Firearm Other ${TS}`,
                    entityType: 'TRUST',
                    updatedAt: now,
                })
                .returning()
            summaryIds.otherEntityId = e2.id

            const [fa] = await db
                .insert(firearm)
                .values({
                    entityId: e1.id,
                    name: `Dashboard FA ${TS}`,
                    make: 'Glock',
                    model: '17',
                    serialNumber: `DASH-FA-${TS}`,
                    firearmType: 'PISTOL',
                    isNfa: false,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                    dodValue: '1234.56',
                    updatedAt: now,
                })
                .returning()
            summaryIds.firearmId = fa.id

            const [otherFa] = await db
                .insert(firearm)
                .values({
                    entityId: e2.id,
                    name: `Dashboard Other FA ${TS}`,
                    make: 'Ruger',
                    model: '10/22',
                    serialNumber: `DASH-OTHER-FA-${TS}`,
                    firearmType: 'RIFLE',
                    isNfa: false,
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                    dodValue: '9999.99',
                    updatedAt: now,
                })
                .returning()
            summaryIds.otherFirearmId = otherFa.id
        }, TEST_TIMEOUT)

        afterAll(async () => {
            const pub = getPublicDb()
            if (summaryIds.firearmId || summaryIds.otherFirearmId) {
                const fids = [
                    summaryIds.firearmId,
                    summaryIds.otherFirearmId,
                ].filter((x): x is number => x !== null)
                if (fids.length > 0) {
                    await db.delete(firearm).where(inArray(firearm.id, fids))
                }
            }
            const eids = [summaryIds.entityId, summaryIds.otherEntityId].filter(
                (x): x is number => x !== null,
            )
            if (eids.length > 0) {
                await pub.delete(entity).where(inArray(entity.id, eids))
            }
        }, TEST_TIMEOUT)

        test('response includes firearms field with seeded row', async () => {
            const result = await adminCaller().dashboard.summary({
                entityId: summaryIds.entityId as number,
            })
            // GAP-31-02: dashboard.summary returns the firearms array — Phase 31
            // Task 2 wired this in; without this assertion the wiring could
            // silently regress.
            expect(Array.isArray(result.firearms)).toBe(true)
            expect(result.firearms.length).toBeGreaterThanOrEqual(1)
            const fa = result.firearms.find(
                (f) => f.id === summaryIds.firearmId,
            )
            expect(fa).toBeDefined()
            expect(fa?.name).toBe(`Dashboard FA ${TS}`)
            expect(fa?.dodValue).toBe('1234.56')
        })

        test('firearms array is entity-scoped (cross-entity isolation)', async () => {
            // GAP-31-03: replaces the removed programmatic UAT script — proves
            // the WHERE clause on the firearm fetch is entity-correct.
            const inScope = await adminCaller().dashboard.summary({
                entityId: summaryIds.entityId as number,
            })
            const otherScope = await adminCaller().dashboard.summary({
                entityId: summaryIds.otherEntityId as number,
            })

            const inScopeFirearmIds = new Set(inScope.firearms.map((f) => f.id))
            const otherScopeFirearmIds = new Set(
                otherScope.firearms.map((f) => f.id),
            )

            // entity 1 sees only its own firearm, never entity 2's.
            expect(inScopeFirearmIds.has(summaryIds.firearmId as number)).toBe(
                true,
            )
            expect(
                inScopeFirearmIds.has(summaryIds.otherFirearmId as number),
            ).toBe(false)
            // entity 2 sees only its own firearm, never entity 1's.
            expect(
                otherScopeFirearmIds.has(summaryIds.otherFirearmId as number),
            ).toBe(true)
            expect(
                otherScopeFirearmIds.has(summaryIds.firearmId as number),
            ).toBe(false)
        })

        test('firearm dodValue can be summed alongside other asset class values', async () => {
            // GAP-31-03: DashboardClient computes totalAssetValue by summing
            // dodValue/currentBalance/coverageAmount across all asset arrays
            // returned by summary. Verify the firearm row exposes a numeric
            // string parseable by parseFloat — the same contract every other
            // asset class follows.
            const result = await adminCaller().dashboard.summary({
                entityId: summaryIds.entityId as number,
            })
            const fa = result.firearms.find(
                (f) => f.id === summaryIds.firearmId,
            )
            expect(fa).toBeDefined()
            expect(typeof fa?.dodValue).toBe('string')
            expect(parseFloat(fa?.dodValue ?? '0')).toBeCloseTo(1234.56)
            expect(parseFloat(fa?.dodValue ?? '0')).toBeGreaterThan(0)
        })
    },
)
