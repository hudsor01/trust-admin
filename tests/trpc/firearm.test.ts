/** tRPC tests for the firearm router — Phase 29 binding contract: SC-1..SC-4 + NFA guard + D-03 regression. */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { entity, firearm } from '@/db/schema'
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
            name: 'Firearm Test Admin',
            email: 'firearm-admin@test.com',
        }),
    )
}

function beneficiaryCaller() {
    return createCaller(
        createBeneficiaryContext(null, {
            id: '982',
            name: 'Firearm Test Ben',
            email: 'firearm-ben@test.com',
        }),
    )
}

const ids = {
    entityId: null as number | null,
    nonNfaFirearmId: null as number | null,
    nfaFirearmId: null as number | null,
}

describe.skipIf(isProductionDb)('firearm router', () => {
    beforeAll(async () => {
        const [e] = await db
            .insert(entity)
            .values({
                name: `Firearm Router Test Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.entityId = e.id

        const [nonNfa] = await db
            .insert(firearm)
            .values({
                entityId: e.id,
                name: `Non-NFA ${TS}`,
                make: 'Remington',
                model: '700',
                serialNumber: `NONNFA-${TS}`,
                firearmType: 'RIFLE',
                isNfa: false,
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.nonNfaFirearmId = nonNfa.id

        const [nfa] = await db
            .insert(firearm)
            .values({
                entityId: e.id,
                name: `Suppressor ${TS}`,
                make: 'SilencerCo',
                model: 'Omega',
                serialNumber: `NFA-${TS}`,
                firearmType: 'SUPPRESSOR',
                isNfa: true,
                nfaClass: 'SUPPRESSOR',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.nfaFirearmId = nfa.id
    }, TEST_TIMEOUT)

    // -------------------------------------------------------------------------
    // SC-1: list returns entity-scoped rows
    // -------------------------------------------------------------------------
    test(
        'SC-1: list returns rows scoped to entityId',
        async () => {
            const caller = adminCaller()
            const rows = await caller.firearm.list({
                entityId: ids.entityId as number,
            })
            expect(rows.length).toBeGreaterThanOrEqual(2)
            for (const row of rows) {
                expect(row.entityId).toBe(ids.entityId as number)
            }
        },
        TEST_TIMEOUT,
    )

    // -------------------------------------------------------------------------
    // SC-2: create rejects duplicate serialNumber with CONFLICT
    // -------------------------------------------------------------------------
    test(
        'SC-2: create rejects duplicate serialNumber with TRPCError CONFLICT',
        async () => {
            const caller = adminCaller()
            const dupSerial = `DUPE-${TS}`

            // First insert succeeds
            await caller.firearm.create({
                entityId: ids.entityId as number,
                name: `Original ${TS}`,
                make: 'Glock',
                model: '17',
                serialNumber: dupSerial,
                firearmType: 'PISTOL',
                isNfa: false,
                condition: 'GOOD',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                insured: false,
                updatedAt: new Date().toISOString(),
            })

            // Second insert with same serial must throw CONFLICT
            let thrown: unknown
            try {
                await caller.firearm.create({
                    entityId: ids.entityId as number,
                    name: `Duplicate ${TS}`,
                    make: 'Glock',
                    model: '17',
                    serialNumber: dupSerial,
                    firearmType: 'PISTOL',
                    isNfa: false,
                    condition: 'GOOD',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                    insured: false,
                    updatedAt: new Date().toISOString(),
                })
                throw new Error('expected create to throw on duplicate serial')
            } catch (err) {
                thrown = err
            }
            expect(thrown).toBeInstanceOf(TRPCError)
            expect((thrown as TRPCError).code).toBe('CONFLICT')
            expect((thrown as TRPCError).message).toMatch(/serial number/i)
        },
        TEST_TIMEOUT,
    )

    // -------------------------------------------------------------------------
    // SC-3: byId throws NOT_FOUND on cross-entity / nonexistent id
    // -------------------------------------------------------------------------
    test(
        'SC-3: byId throws NOT_FOUND when id does not belong to the requested entity',
        async () => {
            const caller = adminCaller()

            // Real id, wrong entity → NOT_FOUND
            let thrownA: unknown
            try {
                await caller.firearm.byId({
                    id: ids.nonNfaFirearmId as number,
                    entityId: 999999,
                })
                throw new Error('expected NOT_FOUND on wrong entityId')
            } catch (err) {
                thrownA = err
            }
            expect(thrownA).toBeInstanceOf(TRPCError)
            expect((thrownA as TRPCError).code).toBe('NOT_FOUND')

            // Nonexistent id → NOT_FOUND
            let thrownB: unknown
            try {
                await caller.firearm.byId({
                    id: 999999999,
                    entityId: ids.entityId as number,
                })
                throw new Error('expected NOT_FOUND on nonexistent id')
            } catch (err) {
                thrownB = err
            }
            expect(thrownB).toBeInstanceOf(TRPCError)
            expect((thrownB as TRPCError).code).toBe('NOT_FOUND')
        },
        TEST_TIMEOUT,
    )

    test(
        'byId returns the firearm + eager-loaded entity/valuations/documents for the happy path',
        async () => {
            const caller = adminCaller()
            const result = await caller.firearm.byId({
                id: ids.nfaFirearmId as number,
                entityId: ids.entityId as number,
            })
            expect(result).toBeDefined()
            expect(result.id).toBe(ids.nfaFirearmId as number)
            expect(result.entity).toBeDefined()
            expect(result.entity.id).toBe(ids.entityId as number)
            expect(Array.isArray(result.valuations)).toBe(true)
            expect(Array.isArray(result.documents)).toBe(true)
        },
        TEST_TIMEOUT,
    )

    // -------------------------------------------------------------------------
    // SC-4: all 6 procedures reject beneficiary JWT
    // -------------------------------------------------------------------------
    test(
        'SC-4: list rejects beneficiary JWT (FORBIDDEN)',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.list({ entityId: ids.entityId as number }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'SC-4: byId rejects beneficiary JWT',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.byId({
                    id: ids.nonNfaFirearmId as number,
                    entityId: ids.entityId as number,
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'SC-4: create rejects beneficiary JWT',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.create({
                    entityId: ids.entityId as number,
                    name: 'Should fail',
                    make: 'X',
                    model: 'Y',
                    serialNumber: `BEN-${TS}`,
                    firearmType: 'PISTOL',
                    isNfa: false,
                    condition: 'GOOD',
                    status: 'ACTIVE',
                    transferStatus: 'PENDING',
                    insured: false,
                    updatedAt: new Date().toISOString(),
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'SC-4: update rejects beneficiary JWT',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.update({
                    id: ids.nonNfaFirearmId as number,
                    entityId: ids.entityId as number,
                    data: { name: 'Hijacked' },
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'SC-4: delete rejects beneficiary JWT',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.delete({
                    id: ids.nonNfaFirearmId as number,
                    entityId: ids.entityId as number,
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    test(
        'SC-4: setNfaTransferStatus rejects beneficiary JWT',
        async () => {
            const caller = beneficiaryCaller()
            await expect(
                caller.firearm.setNfaTransferStatus({
                    id: ids.nfaFirearmId as number,
                    entityId: ids.entityId as number,
                    status: 'FILED',
                }),
            ).rejects.toThrow()
        },
        TEST_TIMEOUT,
    )

    // -------------------------------------------------------------------------
    // setNfaTransferStatus — happy path + NFA guard (NFA guard locked IN per
    // CONTEXT.md Claude's discretion + RESEARCH Finding 6).
    // -------------------------------------------------------------------------
    test(
        'setNfaTransferStatus advances NFA firearm through NOT_FILED → FILED → APPROVED with metadata',
        async () => {
            const caller = adminCaller()
            const controlNumber = `CTRL-${TS}`

            const filed = await caller.firearm.setNfaTransferStatus({
                id: ids.nfaFirearmId as number,
                entityId: ids.entityId as number,
                status: 'FILED',
                atfControlNumber: controlNumber,
            })
            expect(filed.nfaTransferStatus).toBe('FILED')
            expect(filed.atfControlNumber).toBe(controlNumber)

            const approved = await caller.firearm.setNfaTransferStatus({
                id: ids.nfaFirearmId as number,
                entityId: ids.entityId as number,
                status: 'APPROVED',
                taxStampDate: '2026-01-15T00:00:00.000Z',
            })
            expect(approved.nfaTransferStatus).toBe('APPROVED')
            // taxStampDate is stored as text in Postgres; just confirm it persisted.
            expect(approved.taxStampDate).toBeTruthy()
        },
        TEST_TIMEOUT,
    )

    test(
        'setNfaTransferStatus rejects non-NFA firearm with TRPCError BAD_REQUEST (T-29-NFA guard)',
        async () => {
            const caller = adminCaller()
            let thrown: unknown
            try {
                await caller.firearm.setNfaTransferStatus({
                    id: ids.nonNfaFirearmId as number,
                    entityId: ids.entityId as number,
                    status: 'FILED',
                })
                throw new Error('expected BAD_REQUEST on non-NFA firearm')
            } catch (err) {
                thrown = err
            }
            expect(thrown).toBeInstanceOf(TRPCError)
            expect((thrown as TRPCError).code).toBe('BAD_REQUEST')
            expect((thrown as TRPCError).message).toMatch(/non-NFA/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'setNfaTransferStatus throws NOT_FOUND when firearm does not exist in this entity',
        async () => {
            const caller = adminCaller()
            let thrown: unknown
            try {
                await caller.firearm.setNfaTransferStatus({
                    id: 999999999,
                    entityId: ids.entityId as number,
                    status: 'FILED',
                })
                throw new Error('expected NOT_FOUND')
            } catch (err) {
                thrown = err
            }
            expect(thrown).toBeInstanceOf(TRPCError)
            expect((thrown as TRPCError).code).toBe('NOT_FOUND')
        },
        TEST_TIMEOUT,
    )

    // -------------------------------------------------------------------------
    // D-03 regression: nfaTransferStatus cannot flow through generic update.
    // The omit + partial + refine chain strips the field before the refine
    // counts it as "provided" — so an update with ONLY {nfaTransferStatus} is
    // rejected by the "at least one field" refine.
    // -------------------------------------------------------------------------
    test(
        'D-03 regression: update with only nfaTransferStatus is rejected (field omitted; refine sees zero fields)',
        async () => {
            const caller = adminCaller()
            let thrown: unknown
            try {
                await caller.firearm.update({
                    id: ids.nfaFirearmId as number,
                    entityId: ids.entityId as number,
                    // @ts-expect-error D-03 contract: nfaTransferStatus is omitted from the input shape; this should fail Zod validation
                    data: { nfaTransferStatus: 'APPROVED' },
                })
                throw new Error(
                    'expected update with only nfaTransferStatus to reject',
                )
            } catch (err) {
                thrown = err
            }
            // Zod-rejection comes through as TRPCError BAD_REQUEST.
            expect(thrown).toBeInstanceOf(TRPCError)
            expect((thrown as TRPCError).code).toBe('BAD_REQUEST')
        },
        TEST_TIMEOUT,
    )

    afterAll(async () => {
        if (ids.entityId) {
            await db.delete(firearm).where(eq(firearm.entityId, ids.entityId))
            await db.delete(entity).where(eq(entity.id, ids.entityId))
        }
    }, TEST_TIMEOUT)
})
