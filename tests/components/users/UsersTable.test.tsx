/**
 * UsersTable Component Tests
 *
 * Tests for the UsersTable component that displays NeonAuthUser data
 * with support for owner vs. read-only modes, error states, and loading.
 */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NeonAuthUser } from '../../../src/app/(admin)/users/_components/types'
import { UsersTable } from '../../../src/app/(admin)/users/_components/UsersTable'

// Sample user data
const sampleUsers: NeonAuthUser[] = [
    {
        id: 'user-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        emailVerified: true,
        image: null,
        createdAt: '2025-01-01T00:00:00Z',
        neonRole: 'admin',
        banned: false,
        banReason: null,
        banExpires: null,
        appRole: 'admin',
        beneficiaryId: null,
        beneficiaryName: null,
    },
    {
        id: 'user-2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        emailVerified: false,
        image: null,
        createdAt: '2025-02-01T00:00:00Z',
        neonRole: null,
        banned: false,
        banReason: null,
        banExpires: null,
        appRole: 'user',
        beneficiaryId: 42,
        beneficiaryName: 'Bob Smith Trust Share',
    },
]

// Minimal column definitions for testing
const testColumns: ColumnDef<NeonAuthUser>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => row.original.name ?? '—',
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email,
    },
]

const defaultProps = {
    isOwner: true,
    loading: false,
    tableData: sampleUsers,
    columns: testColumns,
    usersError: null,
    onCreateClick: mock(() => {}),
}

describe('UsersTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders "No users found" message when tableData is empty', () => {
            render(<UsersTable {...defaultProps} tableData={[]} />)

            expect(screen.getByText('No users found')).toBeTruthy()
        })

        test('shows "0 users" count when tableData is empty', () => {
            render(<UsersTable {...defaultProps} tableData={[]} />)

            expect(screen.getByText('0 users')).toBeTruthy()
        })
    })

    describe('user data rendering', () => {
        test('renders user names from tableData', () => {
            render(<UsersTable {...defaultProps} />)

            expect(screen.getByText('Alice Johnson')).toBeTruthy()
            expect(screen.getByText('Bob Smith')).toBeTruthy()
        })

        test('renders user email addresses', () => {
            render(<UsersTable {...defaultProps} />)

            expect(screen.getByText('alice@example.com')).toBeTruthy()
            expect(screen.getByText('bob@example.com')).toBeTruthy()
        })

        test('shows correct user count in the header', () => {
            render(<UsersTable {...defaultProps} />)

            expect(screen.getByText('2 users')).toBeTruthy()
        })

        test('shows singular "user" when exactly one user', () => {
            render(
                <UsersTable {...defaultProps} tableData={[sampleUsers[0]]} />,
            )

            expect(screen.getByText('1 user')).toBeTruthy()
        })
    })

    describe('loading state', () => {
        test('renders the table container even while loading', () => {
            render(
                <UsersTable {...defaultProps} loading={true} tableData={[]} />,
            )

            // The component still renders its structure during loading
            expect(screen.getByText('Users')).toBeTruthy()
        })

        test('does not show read-only banner while loading (owner context)', () => {
            render(
                <UsersTable {...defaultProps} loading={true} isOwner={false} />,
            )

            // Banner is suppressed while loading
            expect(screen.queryByText(/read-only mode/)).toBeNull()
        })
    })

    describe('owner mode', () => {
        test('renders "Create Portal Account" button when isOwner is true', () => {
            render(<UsersTable {...defaultProps} isOwner={true} />)

            expect(screen.getByText('Create Portal Account')).toBeTruthy()
        })

        test('calls onCreateClick when the create button is clicked', async () => {
            const user = userEvent.setup()
            const onCreateClick = mock(() => {})

            render(
                <UsersTable
                    {...defaultProps}
                    isOwner={true}
                    onCreateClick={onCreateClick}
                />,
            )

            await user.click(screen.getByText('Create Portal Account'))
            expect(onCreateClick).toHaveBeenCalledTimes(1)
        })
    })

    describe('non-owner (read-only) mode', () => {
        test('does not render "Create Portal Account" button when isOwner is false', () => {
            render(<UsersTable {...defaultProps} isOwner={false} />)

            expect(screen.queryByText('Create Portal Account')).toBeNull()
        })

        test('shows read-only mode banner when not owner and not loading', () => {
            render(
                <UsersTable
                    {...defaultProps}
                    isOwner={false}
                    loading={false}
                />,
            )

            expect(screen.getByText(/read-only mode/)).toBeTruthy()
        })
    })

    describe('error state', () => {
        test('shows error message when usersError is set and isOwner is true', () => {
            render(
                <UsersTable
                    {...defaultProps}
                    isOwner={true}
                    usersError={{ message: 'Network error' }}
                />,
            )

            expect(
                screen.getByText(/Failed to load users: Network error/),
            ).toBeTruthy()
        })

        test('does not show error banner when isOwner is false', () => {
            render(
                <UsersTable
                    {...defaultProps}
                    isOwner={false}
                    usersError={{ message: 'Network error' }}
                />,
            )

            expect(screen.queryByText(/Failed to load users/)).toBeNull()
        })

        test('does not show error banner when usersError is null', () => {
            render(
                <UsersTable
                    {...defaultProps}
                    isOwner={true}
                    usersError={null}
                />,
            )

            expect(screen.queryByText(/Failed to load users/)).toBeNull()
        })
    })
})
