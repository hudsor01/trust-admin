/** HomesteadSection component tests — homestead property details or empty state with Add button. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Homestead } from '@/db/schema'
import { HomesteadSection } from '../../../src/app/(admin)/properties/_components/HomesteadSection'

const makeHomestead = (overrides: Partial<Homestead> = {}): Homestead => ({
    id: 1,
    entityId: 1,
    streetAddress: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    county: 'Travis',
    parcelNumber: 'ABC-123-456',
    legalDescription: 'Lot 1, Block 2',
    propertyType: 'SINGLE_FAMILY',
    yearBuilt: 1995,
    squareFeet: 2500,
    lotSizeAcres: '0.2500',
    bedrooms: 4,
    bathrooms: '2.5',
    acquisitionDate: null,
    acquisitionCost: null,
    dodValue: '350000.00',
    dodValueDate: null,
    dodValueType: null,
    dodAffidavitFiled: false,
    dodAffidavitDate: null,
    clerkFileNo: null,
    status: 'ACTIVE',
    transferStatus: 'NOT_STARTED',
    notes: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
})

describe('HomesteadSection', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty state when no homestead provided', () => {
        render(
            <HomesteadSection
                homestead={undefined}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )
        expect(screen.getByText('No homestead on record')).toBeTruthy()
        expect(screen.getByText('Add Homestead')).toBeTruthy()
    })

    test('calls onAdd when Add Homestead button is clicked', async () => {
        const user = userEvent.setup()
        const onAdd = mock(() => {})

        render(
            <HomesteadSection
                homestead={undefined}
                selectedEntity={1}
                onAdd={onAdd}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        await user.click(screen.getByText('Add Homestead'))
        expect(onAdd.mock.calls.length).toBe(1)
    })

    test('renders homestead street address when homestead is provided', () => {
        const homestead = makeHomestead({ streetAddress: '123 Main St' })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        // Street address appears in the heading and in the address section
        const matches = screen.getAllByText('123 Main St')
        expect(matches.length).toBeGreaterThan(0)
    })

    test('renders city, state, zip of homestead', () => {
        const homestead = makeHomestead({
            city: 'Austin',
            state: 'TX',
            zip: '78701',
        })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('Austin, TX 78701')).toBeTruthy()
    })

    test('renders transfer status badge', () => {
        const homestead = makeHomestead({ transferStatus: 'NOT_STARTED' })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('NOT_STARTED')).toBeTruthy()
    })

    test('renders bedroom and bathroom info when provided', () => {
        const homestead = makeHomestead({ bedrooms: 4, bathrooms: '2.5' })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('4 bed / 2.5 bath')).toBeTruthy()
    })

    test('renders square footage when provided', () => {
        const homestead = makeHomestead({ squareFeet: 2500 })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('2,500 sq ft')).toBeTruthy()
    })

    test('shows Not yet filed when dodAffidavitFiled is false and parcelNumber exists', () => {
        const homestead = makeHomestead({
            parcelNumber: 'ABC-123',
            dodAffidavitFiled: false,
        })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('Not yet filed')).toBeTruthy()
    })

    test('renders notes section when notes are provided', () => {
        const homestead = makeHomestead({ notes: 'Primary residence note' })

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
            />,
        )

        expect(screen.getByText('Primary residence note')).toBeTruthy()
    })

    test('calls onEdit when edit button is clicked', async () => {
        const user = userEvent.setup()
        const onEdit = mock(() => {})
        const homestead = makeHomestead()

        render(
            <HomesteadSection
                homestead={homestead}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={onEdit}
                onDelete={mock(() => {})}
            />,
        )

        const buttons = screen.getAllByRole('button')
        // Edit button has Pencil icon
        const editButton = buttons.find((btn) => btn.querySelector('svg'))
        if (editButton) {
            await user.click(editButton)
        }

        expect(onEdit.mock.calls.length).toBeGreaterThan(0)
    })
})
