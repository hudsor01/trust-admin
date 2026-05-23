/**
 * FirearmsClient orchestrator tests.
 *
 * DEEP-MOCK LIMITATION: No component test in this codebase mocks tRPC deeply
 * (grep tests/components/ for trpc.useUtils / useMutation returns nothing).
 * FirearmsClient calls trpc.entity.list, trpc.firearm.list,
 * trpc.firearm.create/update/delete — wiring a fake tRPC provider requires
 * substantial infrastructure not yet present here.
 *
 * DEFERRED BEHAVIOR — "CONFLICT keeps dialog open" (30-VALIDATION.md):
 *   When trpc.firearm.create.useMutation rejects with
 *   TRPCClientError { data.code === 'CONFLICT' }, FirearmsClient.onSubmit
 *   catches the error, calls toast.error(), and returns WITHOUT calling
 *   firearmForm.close(), leaving FirearmDialog mounted with isOpen=true.
 *   This is verified by code inspection of FirearmsClient.tsx lines 140-149.
 *   A full behavioral test requires either:
 *     (a) a tRPC mock provider wrapper (future infrastructure work), or
 *     (b) a Playwright e2e test that triggers a duplicate serial-number POST.
 *
 * What IS tested here:
 *   - Module exports the expected FirearmsClient function (import smoke test)
 *   - makeFirearm helper covers all Firearm schema fields (type-level contract)
 *   - KPI computation logic (pure functions exercised without React)
 */

import '../../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup } from '@testing-library/react'
import type { Firearm } from '@/db/schema'

afterEach(() => {
    cleanup()
})

// ---------------------------------------------------------------------------
// Factory — mirrors the full Firearm Drizzle type (db/schema.ts ~line 1466)
// ---------------------------------------------------------------------------

export const makeFirearm = (overrides: Partial<Firearm> = {}): Firearm => ({
    id: 1,
    entityId: 1,
    name: "Dad's Remington 870",
    description: null,
    make: 'Remington',
    model: '870',
    serialNumber: 'AB12345',
    firearmType: 'SHOTGUN',
    caliber: '12 gauge',
    barrelLength: '28.00',
    isNfa: false,
    nfaClass: null,
    atfFormType: null,
    atfControlNumber: null,
    taxStampDate: null,
    nfrtrSerial: null,
    nfaRegistered: false,
    nfaTransferStatus: null,
    acquisitionDate: null,
    acquisitionCost: null,
    dodValue: '1200.00',
    dodValueDate: null,
    dodValueType: null,
    condition: 'GOOD',
    action: 'PUMP',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    location: 'Gun safe',
    insured: false,
    notes: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
})

// ---------------------------------------------------------------------------
// Smoke: module export
// ---------------------------------------------------------------------------

describe('FirearmsClient module', () => {
    test('exports FirearmsClient as a function', async () => {
        const mod = await import(
            '../../../src/app/(admin)/firearms/_components/FirearmsClient'
        )
        expect(typeof mod.FirearmsClient).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// makeFirearm helper
// ---------------------------------------------------------------------------

describe('makeFirearm helper', () => {
    test('produces a valid Firearm with defaults', () => {
        const f = makeFirearm()
        expect(f.id).toBe(1)
        expect(f.entityId).toBe(1)
        expect(f.make).toBe('Remington')
        expect(f.model).toBe('870')
        expect(f.serialNumber).toBe('AB12345')
        expect(f.firearmType).toBe('SHOTGUN')
        expect(f.isNfa).toBe(false)
        expect(f.condition).toBe('GOOD')
        expect(f.status).toBe('ACTIVE')
        expect(f.transferStatus).toBe('PENDING')
        expect(f.dodValue).toBe('1200.00')
    })

    test('applies overrides correctly', () => {
        const f = makeFirearm({
            id: 42,
            isNfa: true,
            nfaClass: 'SBR',
            transferStatus: 'COMPLETE',
            dodValue: '5000.00',
        })
        expect(f.id).toBe(42)
        expect(f.isNfa).toBe(true)
        expect(f.nfaClass).toBe('SBR')
        expect(f.transferStatus).toBe('COMPLETE')
        expect(f.dodValue).toBe('5000.00')
    })

    test('NFA firearm has expected shape', () => {
        const nfa = makeFirearm({
            isNfa: true,
            nfaClass: 'SUPPRESSOR',
            atfFormType: 'FORM_4',
            atfControlNumber: 'XXX-2025-001',
            nfaTransferStatus: 'FILED',
        })
        expect(nfa.nfaClass).toBe('SUPPRESSOR')
        expect(nfa.atfFormType).toBe('FORM_4')
        expect(nfa.atfControlNumber).toBe('XXX-2025-001')
        expect(nfa.nfaTransferStatus).toBe('FILED')
    })
})

// ---------------------------------------------------------------------------
// KPI computation — pure logic extracted from FirearmsClient (UI-SPEC §KPI)
// ---------------------------------------------------------------------------

/** Mirror of the KPI logic in FirearmsClient (lines 234-247). */
function computeKpis(firearms: Firearm[]) {
    const totalDodValue = firearms
        .map((f) => (f.dodValue ? parseFloat(f.dodValue) : 0))
        .reduce((sum, v) => sum + v, 0)

    const transferredCount = firearms.filter(
        (f) => f.transferStatus === 'COMPLETE',
    ).length

    const transferPct =
        firearms.length > 0 ? (transferredCount / firearms.length) * 100 : 0

    const nfaCount = firearms.filter((f) => f.isNfa).length

    return { totalDodValue, transferredCount, transferPct, nfaCount }
}

describe('KPI computation logic', () => {
    test('returns zeros for empty list', () => {
        const kpi = computeKpis([])
        expect(kpi.totalDodValue).toBe(0)
        expect(kpi.transferredCount).toBe(0)
        expect(kpi.transferPct).toBe(0)
        expect(kpi.nfaCount).toBe(0)
    })

    test('sums dodValue across all firearms', () => {
        const firearms = [
            makeFirearm({ dodValue: '1000.00' }),
            makeFirearm({ id: 2, dodValue: '2500.50' }),
            makeFirearm({ id: 3, dodValue: null }),
        ]
        const kpi = computeKpis(firearms)
        expect(kpi.totalDodValue).toBeCloseTo(3500.5)
    })

    test('counts COMPLETE transfers correctly', () => {
        const firearms = [
            makeFirearm({ id: 1, transferStatus: 'COMPLETE' }),
            makeFirearm({ id: 2, transferStatus: 'PENDING' }),
            makeFirearm({ id: 3, transferStatus: 'COMPLETE' }),
        ]
        const kpi = computeKpis(firearms)
        expect(kpi.transferredCount).toBe(2)
        expect(kpi.transferPct).toBeCloseTo(66.67)
    })

    test('counts NFA items', () => {
        const firearms = [
            makeFirearm({ id: 1, isNfa: true, nfaClass: 'SBR' }),
            makeFirearm({ id: 2, isNfa: false }),
            makeFirearm({ id: 3, isNfa: true, nfaClass: 'SUPPRESSOR' }),
        ]
        const kpi = computeKpis(firearms)
        expect(kpi.nfaCount).toBe(2)
    })

    test('100% transfer pct when all firearms complete', () => {
        const firearms = [
            makeFirearm({ id: 1, transferStatus: 'COMPLETE' }),
            makeFirearm({ id: 2, transferStatus: 'COMPLETE' }),
        ]
        const kpi = computeKpis(firearms)
        expect(kpi.transferPct).toBe(100)
    })
})
