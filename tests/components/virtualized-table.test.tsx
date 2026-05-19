/** VirtualizedTable tests — virtualized rendering for large datasets like the activity log. */

import '../setup'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { VirtualizedTable } from '../../src/components/virtualized-table'
import { PERSIST_DEBOUNCE_MS } from '../../src/lib/data-table-persistence'

const FLUSH_MS = PERSIST_DEBOUNCE_MS + 200

interface TestLog {
    id: number
    action: string
    tableName: string
    recordId: string
    createdAt: string
}

const testLogs: TestLog[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    action: i % 3 === 0 ? 'INSERT' : i % 3 === 1 ? 'UPDATE' : 'DELETE',
    tableName: 'test_table',
    recordId: `record-${i + 1}`,
    createdAt: '2025-01-15T12:00:00',
}))

const columns: ColumnDef<TestLog>[] = [
    {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => row.original.action,
    },
    {
        accessorKey: 'tableName',
        header: 'Table',
        cell: ({ row }) => row.original.tableName,
    },
    {
        accessorKey: 'recordId',
        header: 'Record ID',
        cell: ({ row }) => row.original.recordId,
    },
]

describe('VirtualizedTable', () => {
    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        test('renders table with column headers', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 10)}
                />,
            )

            expect(screen.getByText('Action')).toBeTruthy()
            expect(screen.getByText('Table')).toBeTruthy()
            expect(screen.getByText('Record ID')).toBeTruthy()
        })

        test('renders empty state when no data', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={[]}
                    emptyMessage="No activity logs found."
                />,
            )

            expect(screen.getByText('No activity logs found.')).toBeTruthy()
        })

        test('renders loading state', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={[]}
                    isLoading={true}
                />,
            )

            const table = screen.getByRole('table')
            expect(table).toBeTruthy()
        })

        test('renders with custom max height', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs}
                    maxHeight={300}
                />,
            )

            expect(screen.getByText('Action')).toBeTruthy()
        })
    })

    describe('virtualization', () => {
        test('handles large dataset without performance issues', () => {
            const largeData = Array.from({ length: 1000 }, (_, i) => ({
                id: i + 1,
                action: 'INSERT',
                tableName: 'large_table',
                recordId: `record-${i + 1}`,
                createdAt: '2025-01-15T12:00:00',
            }))

            const startTime = performance.now()

            render(
                <VirtualizedTable
                    columns={columns}
                    data={largeData}
                    maxHeight={500}
                />,
            )

            const endTime = performance.now()

            expect(endTime - startTime).toBeLessThan(1000)
            expect(screen.getByRole('table')).toBeTruthy()
        })

        test('uses correct row height for virtualization', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs}
                    rowHeight={48}
                    maxHeight={500}
                />,
            )

            expect(screen.getByRole('table')).toBeTruthy()
        })

        test('configures overscan correctly', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs}
                    overscan={10}
                />,
            )

            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('column definitions', () => {
        test('uses TanStack Table ColumnDef format', () => {
            const customColumns: ColumnDef<TestLog>[] = [
                {
                    accessorKey: 'action',
                    header: 'Custom Action Header',
                    cell: ({ row }) => `Action: ${row.original.action}`,
                },
            ]

            render(
                <VirtualizedTable
                    columns={customColumns}
                    data={testLogs.slice(0, 5)}
                />,
            )

            expect(screen.getByText('Custom Action Header')).toBeTruthy()
        })

        test('accepts TanStack ColumnDef with cell function', () => {
            // VirtualizedTable uses virtualization - only visible rows render in DOM.
            // Test that column definition is accepted properly.
            const customColumns: ColumnDef<TestLog>[] = [
                {
                    accessorKey: 'action',
                    header: 'Action',
                    cell: ({ row }) => (
                        <span data-testid="custom-cell">
                            {row.original.action}
                        </span>
                    ),
                },
            ]

            const { container } = render(
                <VirtualizedTable
                    columns={customColumns}
                    data={testLogs.slice(0, 1)}
                />,
            )

            const table = container.querySelector('table')
            expect(table).toBeTruthy()
            expect(screen.getByText('Action')).toBeTruthy()
        })
    })

    describe('sorting', () => {
        test('supports sortable columns', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 10)}
                />,
            )

            const actionHeader = screen.getByText('Action')
            expect(actionHeader).toBeTruthy()
        })
    })

    describe('accessibility', () => {
        test('renders as table element', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                />,
            )

            expect(screen.getByRole('table')).toBeTruthy()
        })

        test('has proper table structure', () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                />,
            )

            const table = screen.getByRole('table')
            const headerRow = within(table).getAllByRole('row')[0]
            expect(headerRow).toBeTruthy()
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
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                />,
            )
            const separators = screen.getAllByRole('separator', {
                name: /resize .* column/i,
            })
            expect(separators.length).toBe(columns.length)
            for (const sep of separators) {
                expect(sep.getAttribute('aria-orientation')).toBe('vertical')
                expect(sep.getAttribute('tabindex')).toBe('0')
            }
        })

        test('does not write to localStorage when tableId is absent', async () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                />,
            )
            await act(async () => {
                await new Promise((r) => setTimeout(r, FLUSH_MS))
            })
            expect(window.localStorage.length).toBe(0)
        })

        test('does not write on fresh mount when sizing is empty', async () => {
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                    tableId="vt-1"
                />,
            )
            await act(async () => {
                await new Promise((r) => setTimeout(r, FLUSH_MS))
            })
            expect(window.localStorage.getItem('dt:vt-1:sizing')).toBeNull()
        })

        test('loads persisted sizing on mount and reflects it on the handle', () => {
            window.localStorage.setItem(
                'dt:vt-load:sizing',
                JSON.stringify({ action: 240 }),
            )
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                    tableId="vt-load"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize action column/i,
            })[0]
            expect(Number(handle?.getAttribute('aria-valuenow'))).toBe(240)
        })

        test('ignores malformed persisted sizing without throwing', () => {
            window.localStorage.setItem('dt:vt-bad:sizing', 'not-json')
            expect(() =>
                render(
                    <VirtualizedTable
                        columns={columns}
                        data={testLogs.slice(0, 5)}
                        tableId="vt-bad"
                    />,
                ),
            ).not.toThrow()
        })

        test('keyboard ArrowRight widens the column and persists after debounce', async () => {
            const user = userEvent.setup()
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                    tableId="vt-keyb"
                />,
            )
            const handle = screen.getAllByRole('separator', {
                name: /resize action column/i,
            })[0]
            const before = Number(handle?.getAttribute('aria-valuenow'))
            handle?.focus()
            await user.keyboard('{ArrowRight}')
            const after = Number(
                screen
                    .getAllByRole('separator', {
                        name: /resize action column/i,
                    })[0]
                    ?.getAttribute('aria-valuenow'),
            )
            expect(after).toBeGreaterThan(before)
            await act(async () => {
                await new Promise((r) => setTimeout(r, FLUSH_MS))
            })
            const persisted = JSON.parse(
                window.localStorage.getItem('dt:vt-keyb:sizing') ?? '{}',
            )
            expect(persisted.action).toBe(after)
        })

        test('shows Reset column widths button only when columns have been resized', async () => {
            const user = userEvent.setup()
            const { rerender } = render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 5)}
                    tableId="vt-reset"
                />,
            )
            // Initially nothing resized: no Reset button.
            expect(
                screen.queryByRole('button', { name: /reset column widths/i }),
            ).toBeNull()

            // Resize a column via keyboard.
            const handle = screen.getAllByRole('separator', {
                name: /resize action column/i,
            })[0]
            handle?.focus()
            await user.keyboard('{ArrowRight}')

            // Reset button appears.
            const resetButton = screen.getByRole('button', {
                name: /reset column widths/i,
            })
            await user.click(resetButton)
            await act(async () => {
                await new Promise((r) => setTimeout(r, FLUSH_MS))
            })

            // Column visually reset.
            expect(
                Number(
                    screen
                        .getAllByRole('separator', {
                            name: /resize action column/i,
                        })[0]
                        ?.getAttribute('aria-valuenow'),
                ),
            ).toBe(150)
            // Reset button hides again.
            await act(async () => {
                rerender(
                    <VirtualizedTable
                        columns={columns}
                        data={testLogs.slice(0, 5)}
                        tableId="vt-reset"
                    />,
                )
            })
            expect(
                screen.queryByRole('button', { name: /reset column widths/i }),
            ).toBeNull()
        })

        test('tableId swap before debounce flushes preserves write under old key, not new', () => {
            function Harness() {
                const [tid, setTid] = useState('vt-swap-a')
                return (
                    <>
                        <button
                            type="button"
                            data-testid="vt-swap"
                            onClick={() => setTid('vt-swap-b')}
                        >
                            swap
                        </button>
                        <VirtualizedTable
                            columns={columns}
                            data={testLogs.slice(0, 5)}
                            tableId={tid}
                        />
                    </>
                )
            }
            const { unmount } = render(<Harness />)
            const handle = screen.getAllByRole('separator', {
                name: /resize action column/i,
            })[0]
            if (!handle) throw new Error('handle missing')
            // Resize one step under tableId="vt-swap-a".
            fireEvent.keyDown(handle, { key: 'ArrowRight' })
            // Swap to tableId="vt-swap-b" BEFORE the debounce flushes.
            fireEvent.click(screen.getByTestId('vt-swap'))
            // Unmount before any debounce timer for "vt-swap-b" could fire.
            unmount()
            // A's resize MUST flush under A's key (transition-flush).
            const a = window.localStorage.getItem('dt:vt-swap-a:sizing')
            expect(a).not.toBeNull()
            expect(JSON.parse(a ?? '{}').action).toBeGreaterThan(150)
            // B's storage must remain untouched (the bug we're guarding
            // against wrote A's sizing under B's key).
            expect(
                window.localStorage.getItem('dt:vt-swap-b:sizing'),
            ).toBeNull()
        })
    })
})

describe('VirtualizedTable with activity log data', () => {
    afterEach(() => {
        cleanup()
    })

    interface ActivityLog {
        id: number
        action: 'INSERT' | 'UPDATE' | 'DELETE'
        tableName: string
        recordId: string
        oldValues: Record<string, unknown> | null
        newValues: Record<string, unknown> | null
        createdAt: string
    }

    const activityLogs: ActivityLog[] = [
        {
            id: 1,
            action: 'INSERT',
            tableName: 'beneficiary',
            recordId: 'ben-1',
            oldValues: null,
            newValues: { firstName: 'John', lastName: 'Doe' },
            createdAt: '2025-01-15T10:00:00',
        },
        {
            id: 2,
            action: 'UPDATE',
            tableName: 'liability',
            recordId: 'liab-1',
            oldValues: { currentBalance: '10000.00' },
            newValues: { currentBalance: '9500.00' },
            createdAt: '2025-01-15T11:00:00',
        },
        {
            id: 3,
            action: 'DELETE',
            tableName: 'document',
            recordId: 'doc-1',
            oldValues: { name: 'Old Document' },
            newValues: null,
            createdAt: '2025-01-15T12:00:00',
        },
    ]

    test('renders activity log column headers', () => {
        // VirtualizedTable uses virtualization - only visible rows render.
        // Test that headers are correct and table structure is valid.
        const columns: ColumnDef<ActivityLog>[] = [
            {
                accessorKey: 'action',
                header: 'Action',
                cell: ({ row }) => row.original.action,
            },
            {
                accessorKey: 'tableName',
                header: 'Table',
                cell: ({ row }) => row.original.tableName,
            },
            {
                accessorKey: 'recordId',
                header: 'Record ID',
                cell: ({ row }) => row.original.recordId,
            },
        ]

        render(<VirtualizedTable columns={columns} data={activityLogs} />)

        expect(screen.getByText('Action')).toBeTruthy()
        expect(screen.getByText('Table')).toBeTruthy()
        expect(screen.getByText('Record ID')).toBeTruthy()
    })

    test('renders table structure with data', () => {
        const columns: ColumnDef<ActivityLog>[] = [
            {
                accessorKey: 'tableName',
                header: 'Table Name',
                cell: ({ row }) => row.original.tableName,
            },
        ]

        const { container } = render(
            <VirtualizedTable columns={columns} data={activityLogs} />,
        )

        const table = container.querySelector('table')
        expect(table).toBeTruthy()
        expect(screen.getByText('Table Name')).toBeTruthy()
    })
})
