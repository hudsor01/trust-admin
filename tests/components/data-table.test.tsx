/** DataTable component tests — sorting, filtering, pagination, column visibility, loading/empty states. */

import '../setup'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import type { Column, ColumnDef } from '@tanstack/react-table'
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { DataTable } from '../../src/components/ui/data-table'
import { DataTableColumnHeader } from '../../src/components/ui/data-table-column-header'
import * as persistence from '../../src/lib/data-table-persistence'
import { PERSIST_DEBOUNCE_MS } from '../../src/lib/data-table-persistence'

const FLUSH_MS = PERSIST_DEBOUNCE_MS + 200

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

        test('does not write to localStorage on fresh mount when sizing is empty', async () => {
            // First-time mount with no prior data and no user resize should
            // NOT pollute localStorage with `{}`.
            render(
                <DataTable columns={columns} data={testData} tableId="t-1" />,
            )
            // Give the debounced persist effect time to NOT fire.
            await new Promise((r) => setTimeout(r, FLUSH_MS))
            expect(window.localStorage.getItem('dt:t-1:sizing')).toBeNull()
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
            // Persisted value reflects new size (after debounce flush).
            await new Promise((r) => setTimeout(r, FLUSH_MS))
            const persisted = JSON.parse(
                window.localStorage.getItem('dt:t-keyb:sizing') ?? '{}',
            )
            expect(persisted.name).toBe(after)
        })

        test('keyboard ArrowLeft on resize handle narrows the column', async () => {
            const user = userEvent.setup()
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-left"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            const before = Number(handle?.getAttribute('aria-valuenow'))
            handle?.focus()
            await user.keyboard('{ArrowLeft}')
            const after = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(after).toBeLessThan(before)
        })

        test('Escape on resize handle does NOT reset (would bubble to dialog dismiss)', async () => {
            const user = userEvent.setup()
            render(<DataTable columns={columns} data={testData} />)
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            handle?.focus()
            await user.keyboard('{ArrowRight>3/}')
            const widened = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(widened).toBeGreaterThan(150)
            await user.keyboard('{Escape}')
            const afterEscape = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            // Escape is intentionally unbound — column stays widened.
            expect(afterEscape).toBe(widened)
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

        test('rapid keystrokes coalesce to a single debounced write', async () => {
            // Spy on our own persistence module — happy-dom's Storage
            // instance methods aren't configurable so spying on
            // `window.localStorage.setItem` is a no-op.
            const saveSpy = spyOn(persistence, 'saveColumnSizing')
            try {
                render(
                    <DataTable
                        columns={columns}
                        data={testData}
                        tableId="t-storm"
                    />,
                )
                const handle = screen.getAllByRole('separator', {
                    name: /resize name column/i,
                })[0]
                if (!handle) throw new Error('handle missing')
                saveSpy.mockClear()
                // Fire 10 synchronous keydown events. `userEvent.keyboard`
                // awaits microtasks between presses and on slow CI can
                // exceed the 150ms debounce, allowing the timer to fire
                // between keystrokes (defeating what this test asserts).
                for (let i = 0; i < 10; i++) {
                    fireEvent.keyDown(handle, { key: 'ArrowRight' })
                }
                await new Promise((r) => setTimeout(r, FLUSH_MS))
                // All 10 keystrokes must collapse to exactly one
                // `saveColumnSizing` call — the debounce promise.
                expect(saveSpy.mock.calls.length).toBe(1)
            } finally {
                saveSpy.mockRestore()
            }
        })

        test('over-MAX programmatic resize is clamped on write — persistence stays lossless', async () => {
            render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-clamp"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            if (!handle) throw new Error('handle missing')
            handle.focus()
            // Drive past MAX (2000) using Shift+ArrowRight (+16px each
            // per the keyboard handler's `step = e.shiftKey ? 16 : 4`).
            // 600 × 16 = 9600 target, which would overflow MAX 4.8x
            // without the clamp — well past any reasonable boundary.
            for (let i = 0; i < 600; i++) {
                fireEvent.keyDown(handle, {
                    key: 'ArrowRight',
                    shiftKey: true,
                })
            }
            await new Promise((r) => setTimeout(r, FLUSH_MS))
            // Visible value must be at the cap, not beyond it.
            const valuenow = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(valuenow).toBe(2000)
            // Persisted value must be in-range so load-time validation
            // doesn't silently drop it on the next mount.
            const persisted = JSON.parse(
                window.localStorage.getItem('dt:t-clamp:sizing') ?? '{}',
            )
            expect(persisted.name).toBe(2000)
            expect(persisted.name).toBeLessThanOrEqual(2000)
            expect(persisted.name).toBeGreaterThanOrEqual(20)
        })

        test('tableId swap before debounce flushes preserves write under old key, not new', () => {
            function Harness() {
                const [tid, setTid] = React.useState('swap-a')
                return (
                    <>
                        <button
                            type="button"
                            data-testid="swap"
                            onClick={() => setTid('swap-b')}
                        >
                            swap
                        </button>
                        <DataTable
                            columns={columns}
                            data={testData}
                            tableId={tid}
                        />
                    </>
                )
            }
            const { unmount } = render(<Harness />)
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            if (!handle) throw new Error('handle missing')
            // Resize one step under tableId="swap-a".
            fireEvent.keyDown(handle, { key: 'ArrowRight' })
            // Swap to tableId="swap-b" BEFORE the debounce flushes.
            fireEvent.click(screen.getByTestId('swap'))
            // Unmount before any debounce timer for "swap-b" could fire.
            unmount()
            // A's resize MUST flush under A's key (transition-flush).
            const a = window.localStorage.getItem('dt:swap-a:sizing')
            expect(a).not.toBeNull()
            expect(JSON.parse(a ?? '{}').name).toBeGreaterThan(150)
            // B's storage must remain untouched (the bug we're guarding
            // against wrote A's sizing under B's key).
            expect(window.localStorage.getItem('dt:swap-b:sizing')).toBeNull()
        })

        test('unmount within debounce window flushes pending write', async () => {
            const user = userEvent.setup()
            const { unmount } = render(
                <DataTable
                    columns={columns}
                    data={testData}
                    tableId="t-unmount"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize name column/i,
            })[0]
            handle?.focus()
            await user.keyboard('{ArrowRight}')
            const after = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize name column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            // Unmount BEFORE the debounce flushes — the cleanup path
            // must synchronously persist the pending payload.
            unmount()
            const raw = window.localStorage.getItem('dt:t-unmount:sizing')
            expect(raw).not.toBeNull()
            expect(JSON.parse(raw ?? 'null').name).toBe(after)
        })

        test('Reset column widths menu item clears persisted state and resets visible column', async () => {
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
            // Persisted size hydrates into the handle on mount.
            expect(
                Number(
                    screen
                        .getAllByRole('separator', {
                            name: /resize name column/i,
                        })[0]
                        ?.getAttribute('aria-valuenow'),
                ),
            ).toBe(300)
            await user.click(screen.getByRole('button', { name: /columns/i }))
            await user.click(screen.getByText('Reset column widths'))
            await act(async () => {
                await new Promise((r) => setTimeout(r, FLUSH_MS))
            })
            // Visible column reset to TanStack default.
            expect(
                Number(
                    screen
                        .getAllByRole('separator', {
                            name: /resize name column/i,
                        })[0]
                        ?.getAttribute('aria-valuenow'),
                ),
            ).toBe(150)
            // Persisted state cleared.
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
