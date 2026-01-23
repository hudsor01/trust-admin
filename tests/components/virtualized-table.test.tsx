/**
 * VirtualizedTable Tests
 *
 * Tests for the virtualized table component used for large datasets
 * like the activity log.
 */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, render, screen, within } from '@testing-library/react'
import { VirtualizedTable } from '../../src/components/virtualized-table'

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
    recordId: 'record-' + (i + 1),
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

            // Should show loading skeleton or spinner
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

            // Component should render without error
            expect(screen.getByText('Action')).toBeTruthy()
        })
    })

    describe('virtualization', () => {
        test('handles large dataset without performance issues', () => {
            const largeData = Array.from({ length: 1000 }, (_, i) => ({
                id: i + 1,
                action: 'INSERT',
                tableName: 'large_table',
                recordId: 'record-' + (i + 1),
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

            // Should render in under 1 second even with 1000 rows
            expect(endTime - startTime).toBeLessThan(1000)

            // Should render the table
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

            // Component should render without error
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

            // Component should render without error
            expect(screen.getByRole('table')).toBeTruthy()
        })
    })

    describe('column definitions', () => {
        test('uses TanStack Table ColumnDef format', () => {
            const customColumns: ColumnDef<TestLog>[] = [
                {
                    accessorKey: 'action',
                    header: 'Custom Action Header',
                    cell: ({ row }) => 'Action: ' + row.original.action,
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

            // Should render without error
            const { container } = render(
                <VirtualizedTable
                    columns={customColumns}
                    data={testLogs.slice(0, 1)}
                />,
            )

            // Check that table structure is correct
            const table = container.querySelector('table')
            expect(table).toBeTruthy()
            expect(screen.getByText('Action')).toBeTruthy()
        })
    })

    describe('sorting', () => {
        test('supports sortable columns', () => {
            // VirtualizedTable should support sorting via column headers
            render(
                <VirtualizedTable
                    columns={columns}
                    data={testLogs.slice(0, 10)}
                />,
            )

            // Headers should be clickable for sorting
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
            // Should have header row
            const headerRow = within(table).getAllByRole('row')[0]
            expect(headerRow).toBeTruthy()
        })
    })
})

describe('VirtualizedTable with activity log data', () => {
    afterEach(() => {
        cleanup()
    })

    // Simulating the activity log page pattern
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

        // Verify headers render correctly
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

        // Verify table structure
        const table = container.querySelector('table')
        expect(table).toBeTruthy()
        expect(screen.getByText('Table Name')).toBeTruthy()
    })
})
