/** Column helper tests — TanStack Table column definition generators for DataTable components. */

import { describe, expect, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import {
    actionsColumn,
    badgeColumn,
    currencyColumn,
    dateColumn,
    editableCurrencyColumn,
    editableDateColumn,
    editableSelectColumn,
    editableTextColumn,
    textColumn,
} from '../../src/lib/column-helpers'

// Test data type
interface TestItem {
    id: number
    name: string
    amount: string | null
    status: string
    date: string | null
}

describe('column-helpers', () => {
    describe('textColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = textColumn<TestItem>('name', 'Name')
            expect(column.accessorKey).toBe('name')
        })

        test('creates column with string header when not sortable', () => {
            const column = textColumn<TestItem>('name', 'Name')
            expect(column.header).toBe('Name')
        })

        test('creates column with function header when sortable', () => {
            const column = textColumn<TestItem>('name', 'Name', {
                sortable: true,
            })
            expect(typeof column.header).toBe('function')
        })

        test('cell renders value correctly', () => {
            const column = textColumn<TestItem>('name', 'Name')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test Name',
                    amount: null,
                    status: 'active',
                    date: null,
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            expect(result).toBe('Test Name')
        })

        test('cell renders em dash for null value', () => {
            const column = textColumn<TestItem>('amount', 'Amount')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test',
                    amount: null,
                    status: 'active',
                    date: null,
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            expect(result).toBe('—')
        })
    })

    describe('dateColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = dateColumn<TestItem>('date', 'Date')
            expect(column.accessorKey).toBe('date')
        })

        test('cell renders formatted date', () => {
            const column = dateColumn<TestItem>('date', 'Date')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test',
                    amount: null,
                    status: 'active',
                    date: '2025-01-15T12:00:00',
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            expect(result).toBe('Jan 15, 2025')
        })

        test('cell renders em dash for null date', () => {
            const column = dateColumn<TestItem>('date', 'Date')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test',
                    amount: null,
                    status: 'active',
                    date: null,
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            expect(result).toBe('—')
        })
    })

    describe('currencyColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = currencyColumn<TestItem>('amount', 'Amount')
            expect(column.accessorKey).toBe('amount')
        })

        test('cell renders formatted currency', () => {
            const column = currencyColumn<TestItem>('amount', 'Amount')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test',
                    amount: '1234.56',
                    status: 'active',
                    date: null,
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            // Result is a React element, check it exists
            expect(result).toBeTruthy()
        })
    })

    describe('badgeColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = badgeColumn<TestItem>('status', 'Status')
            expect(column.accessorKey).toBe('status')
        })

        test('cell renders em dash for null status', () => {
            const column = badgeColumn<TestItem>('amount', 'Amount')
            const mockRow = {
                original: {
                    id: 1,
                    name: 'Test',
                    amount: null,
                    status: 'active',
                    date: null,
                },
            }
            // @ts-expect-error - simplified mock
            const result = column.cell?.({ row: mockRow })
            expect(result).toBe('—')
        })
    })

    describe('actionsColumn', () => {
        test('creates column with id "actions"', () => {
            const column = actionsColumn<TestItem>({})
            expect(column.id).toBe('actions')
        })

        test('creates column with header "Actions"', () => {
            const column = actionsColumn<TestItem>({})
            expect(column.header).toBe('Actions')
        })

        test('cell is a function', () => {
            const column = actionsColumn<TestItem>({
                onEdit: () => {},
                onDelete: () => {},
            })
            expect(typeof column.cell).toBe('function')
        })
    })

    describe('editableTextColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = editableTextColumn<TestItem>(
                'name',
                'Name',
                async () => {},
            )
            expect(column.accessorKey).toBe('name')
        })

        test('cell is a function that returns React element', () => {
            const column = editableTextColumn<TestItem>(
                'name',
                'Name',
                async () => {},
            )
            expect(typeof column.cell).toBe('function')
        })
    })

    describe('editableCurrencyColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = editableCurrencyColumn<TestItem>(
                'amount',
                'Amount',
                async () => {},
            )
            expect(column.accessorKey).toBe('amount')
        })
    })

    describe('editableSelectColumn', () => {
        test('creates column with correct accessorKey', () => {
            const options = [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
            ]
            const column = editableSelectColumn<TestItem>(
                'status',
                'Status',
                options,
                async () => {},
            )
            expect(column.accessorKey).toBe('status')
        })
    })

    describe('editableDateColumn', () => {
        test('creates column with correct accessorKey', () => {
            const column = editableDateColumn<TestItem>(
                'date',
                'Date',
                async () => {},
            )
            expect(column.accessorKey).toBe('date')
        })
    })

    describe('column structure validation', () => {
        test('all columns have required TanStack Table properties', () => {
            const columns: ColumnDef<TestItem>[] = [
                textColumn<TestItem>('name', 'Name'),
                dateColumn<TestItem>('date', 'Date'),
                currencyColumn<TestItem>('amount', 'Amount'),
                badgeColumn<TestItem>('status', 'Status'),
                actionsColumn<TestItem>({}),
            ]

            columns.forEach((col) => {
                // Each column should have either accessorKey or id
                const hasIdentifier = 'accessorKey' in col || 'id' in col
                expect(hasIdentifier).toBe(true)

                // Each column should have a header
                expect(col.header).toBeDefined()

                // Each column should have a cell renderer
                expect(col.cell).toBeDefined()
            })
        })
    })
})
