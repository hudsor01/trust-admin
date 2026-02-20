/**
 * ContactTable Component Tests
 *
 * Tests for the ContactTable component that displays professional contacts
 * (attorneys, accountants, financial advisors, etc.) with inline editing
 * and action buttons for view, edit, and delete.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactTable } from '../../../src/app/(admin)/contacts/_components/ContactTable'
import type { Contact } from '../../../src/db/schema'

const sampleContacts: Contact[] = [
    {
        id: 1,
        name: 'Jane Attorney',
        role: 'ATTORNEY',
        company: 'Law Offices LLC',
        email: 'jane@lawoffices.com',
        phone: '555-0101',
        dob: null,
        streetAddress: null,
        city: null,
        state: null,
        zip: null,
        licenseNo: null,
        barNo: 'TX12345',
        notes: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
    },
    {
        id: 2,
        name: 'Bob Accountant',
        role: 'ACCOUNTANT',
        company: 'CPA Firm Inc',
        email: 'bob@cpafirm.com',
        phone: '555-0202',
        dob: null,
        streetAddress: null,
        city: null,
        state: null,
        zip: null,
        licenseNo: 'CPA-999',
        barNo: null,
        notes: null,
        createdAt: '2025-02-01T00:00:00Z',
        updatedAt: '2025-02-01T00:00:00Z',
    },
]

const defaultProps = {
    contacts: sampleContacts,
    isLoading: false,
    onView: mock((_contact: Contact) => {}),
    onEdit: mock((_contact: Contact) => {}),
    onDelete: mock((_contact: Contact) => Promise.resolve()),
    onUpdateField: mock((_id: number, _data: Partial<Contact>) =>
        Promise.resolve(),
    ),
}

describe('ContactTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders "No contacts found" when contacts array is empty', () => {
            render(<ContactTable {...defaultProps} contacts={[]} />)

            expect(screen.getByText('No contacts found')).toBeTruthy()
        })

        test('does not render a table when contacts array is empty', () => {
            render(<ContactTable {...defaultProps} contacts={[]} />)

            expect(screen.queryByRole('table')).toBeNull()
        })
    })

    describe('loading state', () => {
        test('renders loading spinner when isLoading is true', () => {
            const { container } = render(
                <ContactTable {...defaultProps} isLoading={true} />,
            )

            // The spinner is a Loader2 icon with animate-spin class
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeTruthy()
        })

        test('does not render table rows when isLoading is true', () => {
            render(<ContactTable {...defaultProps} isLoading={true} />)

            expect(screen.queryByRole('table')).toBeNull()
        })
    })

    describe('data rendering', () => {
        test('renders contact names in the table', () => {
            render(<ContactTable {...defaultProps} />)

            expect(screen.getByText('Jane Attorney')).toBeTruthy()
            expect(screen.getByText('Bob Accountant')).toBeTruthy()
        })

        test('renders column headers', () => {
            render(<ContactTable {...defaultProps} />)

            expect(screen.getByText('Name')).toBeTruthy()
            expect(screen.getByText('Role')).toBeTruthy()
            expect(screen.getByText('Company')).toBeTruthy()
            expect(screen.getByText('Email')).toBeTruthy()
            expect(screen.getByText('Phone')).toBeTruthy()
        })

        test('renders the table element with contact rows', () => {
            render(<ContactTable {...defaultProps} />)

            expect(screen.getByRole('table')).toBeTruthy()
        })

        test('renders role labels correctly (Attorney for ATTORNEY role)', () => {
            render(<ContactTable {...defaultProps} />)

            // Role is displayed via EditableSelectCell which shows the label
            // The role value 'ATTORNEY' maps to label 'Attorney'
            expect(screen.getByText('Attorney')).toBeTruthy()
        })
    })

    describe('action callbacks', () => {
        test('calls onView when the view button is clicked', async () => {
            const user = userEvent.setup()
            const onView = mock((_contact: Contact) => {})

            render(<ContactTable {...defaultProps} onView={onView} />)

            // There are multiple view buttons (one per row); click the first
            const viewButtons = screen.getAllByRole('button', { name: '' })
            // The view button is the first icon button in the first row
            // Find it by looking for buttons before edit/delete
            // Actually let's find all ghost buttons and click the first one
            await user.click(viewButtons[0])

            expect(onView).toHaveBeenCalledTimes(1)
            expect(onView).toHaveBeenCalledWith(sampleContacts[0])
        })

        test('calls onEdit when the edit (pencil) button is clicked', async () => {
            const user = userEvent.setup()
            const onEdit = mock((_contact: Contact) => {})

            render(<ContactTable {...defaultProps} onEdit={onEdit} />)

            const allButtons = screen.getAllByRole('button', { name: '' })
            // Buttons per row: view (0), edit (1), delete (2), then repeat for row 2
            await user.click(allButtons[1])

            expect(onEdit).toHaveBeenCalledTimes(1)
            expect(onEdit).toHaveBeenCalledWith(sampleContacts[0])
        })

        test('calls onDelete when the delete (trash) button is clicked', async () => {
            const user = userEvent.setup()
            const onDelete = mock((_contact: Contact) => Promise.resolve())

            render(<ContactTable {...defaultProps} onDelete={onDelete} />)

            const allButtons = screen.getAllByRole('button', { name: '' })
            // Delete is the third button per row
            await user.click(allButtons[2])

            expect(onDelete).toHaveBeenCalledTimes(1)
            expect(onDelete).toHaveBeenCalledWith(sampleContacts[0])
        })
    })
})
