/** RentalPropertyTable component tests — DataTable with inline editing, actions, and loading/empty states. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RentalProperty } from '@/db/schema'
import { RentalPropertyTable } from '../../../src/app/(admin)/properties/_components/RentalPropertyTable'

const makeRentalProperty = (
    overrides: Partial<RentalProperty> = {},
): RentalProperty => ({
    id: 1,
    entityId: 1,
    name: 'Sunset Apartments',
    streetAddress: '456 Oak Ave',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    county: 'Dallas',
    parcelNumber: null,
    propertyType: 'MULTI_FAMILY',
    units: 4,
    squareFeet: null,
    lotSizeAcres: null,
    yearBuilt: null,
    rentalStatus: 'RENTED',
    monthlyRent: '3200.00',
    leaseStart: null,
    leaseEnd: null,
    propertyManager: null,
    acquisitionDate: null,
    acquisitionCost: null,
    mortgageBalance: null,
    dodValue: '480000.00',
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

describe('RentalPropertyTable', () => {
    afterEach(() => {
        cleanup()
    })

    test('renders empty message when no rental properties', () => {
        render(
            <RentalPropertyTable
                rentals={[]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )
        expect(
            screen.getByText('No rental properties. Click Add to create one.'),
        ).toBeTruthy()
    })

    test('renders table with rental property data', () => {
        const rentals = [
            makeRentalProperty({
                id: 1,
                name: 'Sunset Apartments',
                city: 'Dallas',
            }),
            makeRentalProperty({
                id: 2,
                name: 'Oak Street Duplex',
                city: 'Houston',
                state: 'TX',
                zip: '77001',
            }),
        ]

        render(
            <RentalPropertyTable
                rentals={rentals}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )

        expect(screen.getByText('Sunset Apartments')).toBeTruthy()
        expect(screen.getByText('Oak Street Duplex')).toBeTruthy()
    })

    test('renders loading state without crashing', () => {
        render(
            <RentalPropertyTable
                rentals={[]}
                rentalsLoading={true}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )
        // DataTable renders a table element even while loading
        expect(screen.getByRole('table')).toBeTruthy()
    })

    test('renders Add Rental Property button', () => {
        render(
            <RentalPropertyTable
                rentals={[]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('Add Rental Property')).toBeTruthy()
    })

    test('calls onAdd when Add Rental Property button clicked', async () => {
        const user = userEvent.setup()
        const onAdd = mock(() => {})

        render(
            <RentalPropertyTable
                rentals={[]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={onAdd}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )

        await user.click(screen.getByText('Add Rental Property'))
        expect(onAdd.mock.calls.length).toBe(1)
    })

    test('renders property address in table rows', () => {
        const rental = makeRentalProperty({
            streetAddress: '456 Oak Ave',
            city: 'Dallas',
            state: 'TX',
            zip: '75201',
        })

        render(
            <RentalPropertyTable
                rentals={[rental]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )

        expect(screen.getByText('456 Oak Ave')).toBeTruthy()
        expect(screen.getByText('Dallas, TX 75201')).toBeTruthy()
    })

    test('renders search filter input', () => {
        render(
            <RentalPropertyTable
                rentals={[makeRentalProperty()]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByPlaceholderText('Filter by name...')).toBeTruthy()
    })

    test('renders column headers', () => {
        render(
            <RentalPropertyTable
                rentals={[]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={mock(() => {})}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )
        expect(screen.getByText('Name')).toBeTruthy()
        expect(screen.getByText('Address')).toBeTruthy()
        expect(screen.getByText('Units')).toBeTruthy()
    })

    test('calls onDelete when delete button clicked', async () => {
        const user = userEvent.setup()
        const onDelete = mock(() => {})
        const rental = makeRentalProperty({ id: 7 })

        render(
            <RentalPropertyTable
                rentals={[rental]}
                rentalsLoading={false}
                selectedEntity={1}
                onAdd={mock(() => {})}
                onEdit={mock(() => {})}
                onDelete={onDelete}
                onUpdateRental={mock(() => Promise.resolve())}
            />,
        )

        const buttons = screen.getAllByRole('button')
        const deleteButton = buttons.find(
            (btn) => btn.getAttribute('title') === 'Delete property',
        )
        if (deleteButton) {
            await user.click(deleteButton)
        }

        expect(onDelete.mock.calls.length).toBeGreaterThan(0)
    })
})
