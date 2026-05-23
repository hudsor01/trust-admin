/** FirearmRowDetail component tests — row-expand panel with Physical Details,
 *  conditional NFA Classification section, and Related Records (valuations +
 *  documents). The component calls trpc.firearm.byId.useQuery internally, so
 *  @/lib/trpc is replaced with a module mock before the component is imported.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Firearm } from '@/db/schema'

// ---------------------------------------------------------------------------
// trpc mock — declared before the component import so Bun's module graph
// picks up the replacement when FirearmRowDetail.tsx evaluates.
// ---------------------------------------------------------------------------

// byIdData is mutated per-test so each test can control what byId returns.
let byIdData:
    | {
          valuations: {
              id: number
              valuationDate: string
              valuationType: string
              value: string
          }[]
          documents: { id: number; name: string; documentType: string }[]
      }
    | undefined = { valuations: [], documents: [] }

mock.module('@/lib/trpc', () => ({
    trpc: {
        firearm: {
            byId: {
                useQuery: (_input: { id: number; entityId: number }) => ({
                    data: byIdData,
                }),
            },
        },
    },
}))

// Import AFTER mock.module so the component picks up the mocked trpc.
import { FirearmRowDetail } from '../../../src/app/(admin)/firearms/_components/FirearmRowDetail'

// ---------------------------------------------------------------------------
// Factory helper — mirrors makeFirearm pattern from FirearmTable.test.tsx
// ---------------------------------------------------------------------------

const makeFirearm = (overrides: Partial<Firearm> = {}): Firearm => ({
    id: 1,
    entityId: 1,
    name: "Dad's Glock",
    description: null,
    make: 'Glock',
    model: '19',
    serialNumber: 'ABCD1234',
    firearmType: 'PISTOL',
    caliber: '9mm',
    barrelLength: '4.02',
    isNfa: false,
    nfaClass: null,
    atfFormType: null,
    atfControlNumber: null,
    taxStampDate: null,
    nfrtrSerial: null,
    nfaRegistered: null,
    nfaTransferStatus: null,
    acquisitionDate: null,
    acquisitionCost: null,
    dodValue: '800.00',
    dodValueDate: null,
    dodValueType: null,
    condition: 'GOOD',
    action: 'Semi-Auto',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    location: 'Gun safe',
    insured: false,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FirearmRowDetail', () => {
    afterEach(() => {
        cleanup()
        // Reset byId response to empty (no valuations/documents) between tests.
        byIdData = { valuations: [], documents: [] }
    })

    // 1. Physical Details always rendered
    test('always renders Physical Details section with expected labels', () => {
        render(<FirearmRowDetail firearm={makeFirearm()} />)

        expect(screen.getByText('Physical Details')).toBeTruthy()
        expect(screen.getByText('Barrel Length')).toBeTruthy()
        expect(screen.getByText('Caliber')).toBeTruthy()
        expect(screen.getByText('Condition')).toBeTruthy()
        expect(screen.getByText('Storage Location')).toBeTruthy()
        expect(screen.getByText('Insured')).toBeTruthy()
        expect(screen.getByText('Acquisition Date')).toBeTruthy()
        expect(screen.getByText('Acquisition Cost')).toBeTruthy()
        expect(screen.getByText('Action Type')).toBeTruthy()
        expect(screen.getByText('Notes')).toBeTruthy()
    })

    // 2. NFA section hidden for non-NFA firearms
    test('NFA Classification section is NOT rendered when isNfa=false', () => {
        render(<FirearmRowDetail firearm={makeFirearm({ isNfa: false })} />)

        expect(screen.queryByText('NFA Classification')).toBeNull()
        expect(
            screen.queryByRole('button', { name: /update form 5 status/i }),
        ).toBeNull()
    })

    // 3. NFA section shown for NFA firearms
    test('NFA Classification section IS rendered when isNfa=true', () => {
        render(
            <FirearmRowDetail
                firearm={makeFirearm({
                    isNfa: true,
                    nfaClass: 'SUPPRESSOR',
                    nfaRegistered: true,
                })}
            />,
        )

        expect(screen.getByText('NFA Classification')).toBeTruthy()
        expect(screen.getByText('NFA Class')).toBeTruthy()
        expect(screen.getByText('ATF Form Type')).toBeTruthy()
        expect(screen.getByText('ATF Control Number')).toBeTruthy()
        expect(screen.getByText('Tax Stamp Date')).toBeTruthy()
        expect(screen.getByText('NFRTR Serial')).toBeTruthy()
        expect(screen.getByText('NFRTR Registered')).toBeTruthy()
    })

    // 4a. "Update Form 5 Status" button rendered when onUpdateNfaStatus provided
    test('Update Form 5 Status button is rendered when onUpdateNfaStatus prop is provided', async () => {
        const user = userEvent.setup()
        const onUpdateNfaStatus = mock((_f: Firearm) => {})
        const firearm = makeFirearm({
            isNfa: true,
            nfaClass: 'SUPPRESSOR',
            nfaRegistered: true,
        })

        render(
            <FirearmRowDetail
                firearm={firearm}
                onUpdateNfaStatus={onUpdateNfaStatus}
            />,
        )

        const btn = screen.getByRole('button', {
            name: /update form 5 status/i,
        })
        expect(btn).toBeTruthy()

        await user.click(btn)

        expect(onUpdateNfaStatus.mock.calls.length).toBe(1)
        // Callback receives the firearm object
        const called = onUpdateNfaStatus.mock.calls[0]?.[0] as Firearm
        expect(called.id).toBe(firearm.id)
    })

    // 4b. "Update Form 5 Status" button NOT rendered when onUpdateNfaStatus omitted
    test('Update Form 5 Status button is NOT rendered when onUpdateNfaStatus prop is omitted', () => {
        render(
            <FirearmRowDetail
                firearm={makeFirearm({
                    isNfa: true,
                    nfaClass: 'SBR',
                    nfaRegistered: true,
                })}
                // onUpdateNfaStatus intentionally omitted
            />,
        )

        expect(
            screen.queryByRole('button', { name: /update form 5 status/i }),
        ).toBeNull()
    })

    // 5. Unregistered NFA warning
    test('shows unregistered NFA warning when isNfa=true and nfaRegistered=false', () => {
        render(
            <FirearmRowDetail
                firearm={makeFirearm({
                    isNfa: true,
                    nfaClass: 'SUPPRESSOR',
                    nfaRegistered: false,
                })}
            />,
        )

        expect(
            screen.getByText(/this nfa item is not registered in the nfrtr/i),
        ).toBeTruthy()
    })

    // 5b. Warning is absent when nfaRegistered is NOT false
    test('does NOT show unregistered NFA warning when nfaRegistered=true', () => {
        render(
            <FirearmRowDetail
                firearm={makeFirearm({
                    isNfa: true,
                    nfaClass: 'SUPPRESSOR',
                    nfaRegistered: true,
                })}
            />,
        )

        expect(
            screen.queryByText(/this nfa item is not registered in the nfrtr/i),
        ).toBeNull()
    })

    // 6. Empty valuations
    test('shows "No valuation history." when byId returns empty valuations', () => {
        byIdData = { valuations: [], documents: [] }

        render(<FirearmRowDetail firearm={makeFirearm()} />)

        expect(screen.getByText('No valuation history.')).toBeTruthy()
    })

    // 7. Empty documents
    test('shows "No documents attached." when byId returns empty documents', () => {
        byIdData = { valuations: [], documents: [] }

        render(<FirearmRowDetail firearm={makeFirearm()} />)

        expect(screen.getByText('No documents attached.')).toBeTruthy()
    })

    // 8. Valuations are rendered when present
    test('renders valuation rows when byId returns valuations', () => {
        byIdData = {
            valuations: [
                {
                    id: 1,
                    valuationDate: '2025-01-15',
                    valuationType: 'APPRAISAL',
                    value: '950.00',
                },
            ],
            documents: [],
        }

        render(<FirearmRowDetail firearm={makeFirearm()} />)

        expect(screen.queryByText('No valuation history.')).toBeNull()
        // valuationDate · valuationType is rendered as muted text
        expect(screen.getByText('2025-01-15 · APPRAISAL')).toBeTruthy()
    })

    // 9. Documents are rendered when present
    test('renders document rows when byId returns documents', () => {
        byIdData = {
            valuations: [],
            documents: [
                { id: 1, name: 'Purchase Receipt', documentType: 'RECEIPT' },
            ],
        }

        render(<FirearmRowDetail firearm={makeFirearm()} />)

        expect(screen.queryByText('No documents attached.')).toBeNull()
        expect(screen.getByText('Purchase Receipt')).toBeTruthy()
        expect(screen.getByText('RECEIPT')).toBeTruthy()
    })

    // 10. Physical field values are displayed correctly
    test('displays firearm field values in Physical Details', () => {
        const firearm = makeFirearm({
            barrelLength: '16.00',
            caliber: '.308',
            condition: 'EXCELLENT',
            location: 'Vault A',
            insured: true,
        })

        render(<FirearmRowDetail firearm={firearm} />)

        expect(screen.getByText('16.00')).toBeTruthy()
        expect(screen.getByText('.308')).toBeTruthy()
        // CONDITION_LABELS maps EXCELLENT → 'Excellent'
        expect(screen.getByText('Excellent')).toBeTruthy()
        expect(screen.getByText('Vault A')).toBeTruthy()
        expect(screen.getByText('Yes')).toBeTruthy()
    })
})
