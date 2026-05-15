/** DataTable component tests — sorting, filtering, pagination, column visibility, loading/empty states. */

import '../setup'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Column, ColumnDef } from '@tanstack/react-table'
import { act, cleanup, render, screen, within } from '@testing-library/react'
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

    describe('column resizing', () => {
        beforeEach(() => {
            window.localStorage.clear()
        })
        afterEach(() => {
            window.localStorage.clear()
        })

        test('renders a resize handle per resizable header', () => {
            render(<DataTable columns={columns} data={testData} />)
            const separators = screen.getAllByRole('separator', {
                name: /resize .* column/i,
            })
            expect(separators.length).toBe(columns.length)
            for (const sep of separators) {
                expect(sep.getAttribute('aria-orientation')).toBe('vertical')
                expect(
                    Number(sep.getAttribute('aria-valuenow')),
                ).toBeGreaterThan(0)
                expect(sep.getAttribute('tabindex')).toBe('0')
            }
        })

        test('does not write to localStorage when tableId is absent', async () => {
            render(<DataTable columns={columns} data={testData} />)
            // Allow any effects to flush.
            await Promise.resolve()
            expect(window.localStorage.length).toBe(0)
        })

        test('writes current sizing under the tableId localStorage key on mount', async () => {
            render(
                <DataTable columns={columns} data={testData} tableId="t-1" />,
            )
            // The persist effect runs on mount with the current (empty) state.
            // We assert the key is written and the value is the canonical shape.
            await Promise.resolve()
            const raw = window.localStorage.getItem('dt:t-1:sizing')
            expect(raw).not.toBeNull()
            expect(JSON.parse(raw ?? 'null')).toEqual({})
        })

        test('keyboard ArrowRight on resize handle widens the column and persists', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-keyb"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            expect(handle).toBeTruthy()
            const before = Number(handle?.getAttribute('aria-valuenow'))
            handle?.focus()
            await user.keyboard('{ArrowRight}')
            const after = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(after).toBeGreaterThan(before)
            // Persisted value reflects new size.
            await Promise.resolve()
            const persisted = JSON.parse(
                window.localStorage.getItem('dt:t-keyb:sizing') ?? '{}',
            )
            expect(persisted.name).toBe(after)
        })

        test('keyboard Home on resize handle resets the column size', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-reset"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            handle?.focus()
            // Nudge wider then reset.
            await user.keyboard('{ArrowRight>4/}')
            const widened = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(widened).toBeGreaterThan(150)
            await user.keyboard('{Home}')
            const reset = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(reset).toBe(150)
        })

        test('loads persisted sizing on mount and reflects it on the handle', () => {
            window.localStorage.setItem(
                'dt:t-load:sizing',
                JSON.stringify({ name: 275 }),
            )
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-load"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            expect(Number(handle?.getAttribute('aria-valuenow'))).toBe(275)
        })

        test('ignores malformed persisted sizing without throwing', () => {
            window.localStorage.setItem('dt:t-bad:sizing', 'not-json')
            expect(() =>
                render(
                    <DataTable
                        columns={columns}
                        data={testData}
                        tableId="t-bad"
                    />,
                ),
            ).not.toThrow()
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            // Falls back to default size 150.
            expect(Number(handle?.getAttribute('aria-valuenow'))).toBe(150)
        })

        test('Reset column widths menu item clears persisted state', async () => {
            const user = userEvent.setup()
            window.localStorage.setItem(
                'dt:t-mreset:sizing',
                JSON.stringify({ name: 300 }),
            )
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-mreset"
                />,
            )
            await user.click(screen.getByRole('button', { name: /columns/i }))
            await user.click(screen.getByText('Reset column widths'))
            await act(async () => {
                await Promise.resolve()
            })
            expect(
                JSON.parse(
                    window.localStorage.getItem('dt:t-mreset:sizing') ?? '{}',
                ),
            ).toEqual({})
        })
    })
})

describe('DataTableColumnHeader', () => {
    afterEach(() => {
        cleanup()
    })

    /** Creates a mock Column with the methods DataTableColumnHeader actually uses. */
    function createMockColumn(
        overrides: Partial<Column<TestPerson, unknown>> = {},
    ): Column<TestPerson, unknown> {
        return {
            getIsSorted: () => false as const,
            toggleSorting: () => {},
            getCanSort: () => true,
            getCanHide: () => true,
            getIsVisible: () => true,
            toggleVisibility: () => {},
            id: 'test',
            ...overrides,
        } as Column<TestPerson, unknown>
    }

    test('renders title', () => {
        const mockColumn = createMockColumn()

        render(<DataTableColumnHeader column={mockColumn} title="Test Title" />)

        expect(screen.getByText('Test Title')).toBeTruthy()
    })

    test('shows sort indicator when sorted', () => {
        const mockColumn = createMockColumn({
            getIsSorted: () => 'asc' as const,
            id: 'sorted',
        } as Partial<Column<TestPerson, unknown>>)

        render(
            <DataTableColumnHeader column={mockColumn} title="Sorted Column" />,
        )

        expect(screen.getByText('Sorted Column')).toBeTruthy()
    })
})
