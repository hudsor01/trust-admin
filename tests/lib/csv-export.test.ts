/**
 * Tests for the CSV export library introduced by plan 23-04.
 *
 * Covers: filename format, header row, body row count, RFC-4180 escaping,
 * custom formatters, filter respect, hidden-column exclusion (T-23-04
 * information-disclosure mitigation).
 */
import '../setup'
import { describe, expect, test } from 'bun:test'
import {
    type ColumnDef,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { renderHook } from '@testing-library/react'
import {
    buildCsvBody,
    escapeCsvCell,
    exportTableToCsv,
    makeCsvFilename,
} from '../../src/lib/csv-export'

interface Row {
    id: number
    name: string
    amount: string
    date: string
    secret: string
}

const data: Row[] = [
    {
        id: 1,
        name: 'Alice',
        amount: '1000.00',
        date: '2026-05-19',
        secret: 'top-secret-1',
    },
    {
        id: 2,
        name: 'Bob, Esq.',
        amount: '2500.50',
        date: '2026-05-18',
        secret: 'top-secret-2',
    },
    {
        id: 3,
        name: 'Carol "the boss"',
        amount: '750.00',
        date: '2026-05-17',
        secret: 'top-secret-3',
    },
]

const helper = createColumnHelper<Row>()
const columns: ColumnDef<Row>[] = [
    helper.accessor('name', { id: 'name', header: 'Name' }),
    helper.accessor('amount', { id: 'amount', header: 'Amount' }),
    helper.accessor('date', { id: 'date', header: 'Date' }),
    helper.accessor('secret', { id: 'secret', header: 'Secret' }),
]

describe('makeCsvFilename', () => {
    test('produces filename matching {resource}-{YYYY-MM-DD}.csv', () => {
        expect(
            makeCsvFilename('vehicles', new Date('2026-05-19T12:00:00Z')),
        ).toBe('vehicles-2026-05-19.csv')
    })

    test('uses current date when not supplied', () => {
        const out = makeCsvFilename('accounts')
        expect(out).toMatch(/^accounts-\d{4}-\d{2}-\d{2}\.csv$/)
    })
})

describe('escapeCsvCell', () => {
    test('empty for null/undefined', () => {
        expect(escapeCsvCell(null)).toBe('')
        expect(escapeCsvCell(undefined)).toBe('')
    })

    test('passes through plain strings', () => {
        expect(escapeCsvCell('Alice')).toBe('Alice')
    })

    test('quotes cells containing commas', () => {
        expect(escapeCsvCell('Bob, Esq.')).toBe('"Bob, Esq."')
    })

    test('doubles internal quotes and wraps in quotes', () => {
        expect(escapeCsvCell('Carol "the boss"')).toBe('"Carol ""the boss"""')
    })

    test('quotes cells containing newlines', () => {
        expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
    })

    test('renders booleans as Yes/No', () => {
        expect(escapeCsvCell(true)).toBe('Yes')
        expect(escapeCsvCell(false)).toBe('No')
    })
})

describe('buildCsvBody', () => {
    test('emits header row + one body row per filtered table row', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const { body, rowCount } = buildCsvBody(result.current)
        expect(rowCount).toBe(3)
        const lines = body.split('\n')
        expect(lines.length).toBe(4) // header + 3 rows
        expect(lines[0]).toBe('Name,Amount,Date,Secret')
    })

    test('escapes RFC-4180 special chars in the body', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const { body } = buildCsvBody(result.current)
        // Bob's row contains a comma → must be quoted
        expect(body).toContain('"Bob, Esq."')
        // Carol's row contains internal quotes → quotes doubled
        expect(body).toContain('"Carol ""the boss"""')
    })

    test('uses custom formatters when provided', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const { body } = buildCsvBody(result.current, {
            formatters: { amount: (v) => `USD ${v}` },
        })
        expect(body).toContain('USD 1000.00')
        expect(body).toContain('USD 2500.50')
    })

    test('excludes hidden columns (T-23-04 information disclosure mitigation)', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                state: { columnVisibility: { secret: false } },
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const { body } = buildCsvBody(result.current)
        // "Secret" header gone, values gone
        expect(body).not.toContain('Secret')
        expect(body).not.toContain('top-secret-1')
        expect(body).not.toContain('top-secret-2')
        expect(body).not.toContain('top-secret-3')
    })

    test('respects column filters (only filtered rows exported)', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                state: {
                    columnFilters: [{ id: 'name', value: 'Alice' }],
                },
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const { rowCount, body } = buildCsvBody(result.current)
        expect(rowCount).toBe(1)
        expect(body).toContain('Alice')
        expect(body).not.toContain('Bob, Esq.')
        expect(body).not.toContain('Carol')
    })
})

describe('exportTableToCsv', () => {
    test('returns rowCount + filename + body and does not throw without DOM download', () => {
        const { result } = renderHook(() =>
            useReactTable<Row>({
                data,
                columns,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
            }),
        )
        const out = exportTableToCsv(result.current, {
            filename: 'test.csv',
        })
        expect(out.rowCount).toBe(3)
        expect(out.filename).toBe('test.csv')
        expect(typeof out.body).toBe('string')
        expect(out.body.split('\n').length).toBe(4)
    })
})
