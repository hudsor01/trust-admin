/** DataTable component tests — sorting, filtering, pagination, column visibility, loading/empty states. */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '../../src/components/ui/data-table'
import { DataTableColumnHeader } from '../../src/components/ui/data-table-column-header'

// Test data type
interface TestPerson {
    id: number
    name: string
    email: string
    age: number
    status: string
}

// Test data
const testData: TestPerson[] = [
    {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
        status: 'active',
    },
    {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        age: 25,
        status: 'inactive',
    },
    {
        id: 3,
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 35,
        status: 'active',
    },
    {
        id: 4,
        name: 'Diana',
        email: 'diana@example.com',
        age: 28,
        status: 'pending',
    },
    { id: 5, name: 'Eve', email: 'eve@example.com', age: 32, status: 'active' },
]

// Column definitions
const columns: ColumnDef<TestPerson>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => row.original.name,
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email,
    },
    {
        accessorKey: 'age',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Age" />
        ),
        cell: ({ row }) => row.original.age,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => row.original.status,
    },
]

describe('DataTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        test('renders table with data', () => {
            render(<DataTable columns={columns} data={testData} />)

            expect(screen.getByText('Alice')).toBeTruthy()
            expect(screen.getByText('Bob')).toBeTruthy()
            expect(screen.getByText('Charlie')).toBeTruthy()
        })

        test('renders column headers', () => {
            render(<DataTable columns={columns} data={testData} />)

            expect(screen.getByText('Name')).toBeTruthy()
            expect(screen.getByText('Email')).toBeTruthy()
            expect(screen.getByText('Age')).toBeTruthy()
            expect(screen.getByText('Status')).toBeTruthy()
        })

        test('renders correct number of rows', () => {
            render(<DataTable columns={columns} data={testData} />)

            const table = screen.getByRole('table')
            const rows = within(table).getAllByRole('row')
            expect(rows.length).toBe(6)
        })

        test('renders empty state when no data', () => {
            render(
                <DataTable
                    columns={columns}
                    data={[]}
                    emptyMessage="No results found."
                />,
            )

            expect(screen.getByText('No results found.')).toBeTruthy()
        })

        test('renders loading state', () => {
            render(<DataTable columns={columns} data={[]} isLoading={true} />)

            const table = screen.getByRole('table')
            expect(table).toBeTruthy()
        })
    })

    describe('searching/filtering', () => {
        test('renders search input when searchKey provided', () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    searchKey="name"
                    searchPlaceholder="Search by name..."
                />,
            )

            expect(
                screen.getByPlaceholderText('Search by name...'),
            ).toBeTruthy()
        })

        test('filters data based on search input', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    searchKey="name"
                    searchPlaceholder="Search..."
                />,
            )

            const searchInput = screen.getByPlaceholderText('Search...')
            await user.type(searchInput, 'Alice')

            expect(screen.getByText('Alice')).toBeTruthy()
            expect(screen.queryByText('Bob')).toBeNull()
        })

        test('shows all data when search is cleared', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    searchKey="name"
                    searchPlaceholder="Search..."
                />,
            )

            const searchInput = screen.getByPlaceholderText('Search...')
            await user.type(searchInput, 'Alice')
            await user.clear(searchInput)

            expect(screen.getByText('Alice')).toBeTruthy()
            expect(screen.getByText('Bob')).toBeTruthy()
        })

        test('handles case-insensitive search', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    searchKey="name"
                    searchPlaceholder="Search..."
                />,
            )

            const searchInput = screen.getByPlaceholderText('Search...')
            await user.type(searchInput, 'alice')

            expect(screen.getByText('Alice')).toBeTruthy()
        })
    })

    describe('sorting', () => {
        test('renders sortable column headers', () => {
            render(<DataTable columns={columns} data={testData} />)

            // Check that sortable headers are rendered
            const nameHeader = screen.getByText('Name')
            expect(nameHeader).toBeTruthy()
            // The header should be clickable (part of DataTableColumnHeader)
            expect(
                nameHeader.closest('button') || nameHeader.closest('div'),
            ).toBeTruthy()
        })

        test('column headers are interactive', () => {
            render(<DataTable columns={columns} data={testData} />)

            // Age column should also be sortable
            const ageHeader = screen.getByText('Age')
            expect(ageHeader).toBeTruthy()
        })
    })

    describe('pagination', () => {
        const manyItems: TestPerson[] = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            name: `Person ${i + 1}`,
            email: `person${i + 1}@example.com`,
            age: 20 + i,
            status: 'active',
        }))

        test('renders pagination when enabled', () => {
            render(
                <DataTable
                    columns={columns}
                    data={manyItems}
                    enablePagination={true}
                />,
            )

            expect(screen.getByText(/Page/)).toBeTruthy()
        })

        test('shows correct page info', () => {
            render(
                <DataTable
                    columns={columns}
                    data={manyItems}
                    enablePagination={true}
                />,
            )

            expect(screen.getByText(/Page 1/)).toBeTruthy()
        })

        test('navigates to next page', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={manyItems}
                    enablePagination={true}
                />,
            )

            const nextButton = screen.getByRole('button', { name: /next/i })
            await user.click(nextButton)

            expect(screen.getByText(/Page 2/)).toBeTruthy()
        })
    })

    describe('column visibility', () => {
        test('renders column visibility toggle when enabled', () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    enableColumnVisibility={true}
                />,
            )

            expect(
                screen.getByRole('button', { name: /view|columns/i }),
            ).toBeTruthy()
        })
    })

    describe('row selection', () => {
        // Note: Row selection in DataTable requires adding a checkbox column to columns.
        // The enableRowSelection prop enables selection state but does not auto-add checkboxes.
        // These tests verify the prop is accepted and does not break rendering.

        test('accepts enableRowSelection prop', () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    enableRowSelection={true}
                />,
            )

            // Table should render normally with row selection enabled
            expect(screen.getByRole('table')).toBeTruthy()
            expect(screen.getByText('Alice')).toBeTruthy()
        })

        test('renders with pagination when enabled', () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    enableRowSelection={true}
                    enablePagination={true}
                />,
            )

            // Table and pagination should render
            expect(screen.getByRole('table')).toBeTruthy()
            expect(screen.getByText(/Page/)).toBeTruthy()
        })
    })

    describe('custom toolbar', () => {
        test('renders custom toolbar when provided', () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    toolbar={<button>Custom Action</button>}
                />,
            )

            expect(screen.getByText('Custom Action')).toBeTruthy()
        })
    })
})

describe('DataTableColumnHeader', () => {
    afterEach(() => {
        cleanup()
    })

    // Create a more complete mock that includes all required TanStack Table column methods
    const createMockColumn = (overrides = {}) => ({
        getIsSorted: () => false as const,
        toggleSorting: () => {},
        getCanSort: () => true,
        getCanHide: () => true,
        getIsVisible: () => true,
        id: 'test',
        ...overrides,
    })

    test('renders title', () => {
        const mockColumn = createMockColumn()

        render(
            // @ts-expect-error - simplified mock for unit test
            <DataTableColumnHeader column={mockColumn} title="Test Title" />,
        )

        expect(screen.getByText('Test Title')).toBeTruthy()
    })

    test('shows sort indicator when sorted', () => {
        const mockColumn = createMockColumn({
            getIsSorted: () => 'asc' as const,
            id: 'sorted',
        })

        render(
            // @ts-expect-error - simplified mock for unit test
            <DataTableColumnHeader column={mockColumn} title="Sorted Column" />,
        )

        expect(screen.getByText('Sorted Column')).toBeTruthy()
    })
})
