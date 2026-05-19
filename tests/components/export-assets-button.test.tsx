/** Integration tests for the assets Export CSV button — verify that the
 *  rows handed to the CSV serializer come from `getSortedRowModel`, so
 *  filter + search + sort state are all honored. These tests would have
 *  caught the regressions reported by the production browser test. */

import '../setup'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

interface ExportCall {
    headers: readonly string[]
    rows: unknown[][]
    filename: string
}
const exportCalls: ExportCall[] = []

// Mock the csv module BEFORE the component under test is imported, so the
// component picks up the mocked exportRowsToCsv when its module evaluates.
// bun:test `mock.module` is GLOBAL across the test run, so pass through
// the real exports for everything except `exportRowsToCsv` — otherwise
// tests like tests/lib/csv.test.ts that import `buildCsvText` get the
// mock instead of the real implementation.
const realCsv = await import('../../src/lib/csv')
mock.module('@/lib/csv', () => ({
    ...realCsv,
    exportRowsToCsv: (
        headers: readonly string[],
        rows: ReadonlyArray<ReadonlyArray<unknown>>,
        filename: string,
    ) => {
        exportCalls.push({
            headers,
            rows: rows.map((r) => [...r]),
            filename,
        })
    },
}))

import { ExportAssetsButton } from '../../src/app/(admin)/assets/_components/ExportAssetsButton'
import { DataTable } from '../../src/components/ui/data-table'
import { DataTableColumnHeader } from '../../src/components/ui/data-table-column-header'
import type { AssetRow } from '../../src/server/trpc/routers/asset'

// Three vehicles + two homesteads + one bank account, with deliberately
// non-sorted updatedAt and value fields so sort behavior is observable.
const assets: AssetRow[] = [
    {
        id: 1,
        kind: 'vehicle',
        name: 'GMC Sierra',
        description: null,
        category: 'Vehicle',
        value: '25000.00',
        status: 'ACTIVE',
        href: '/vehicles',
        updatedAt: '2026-05-01T00:00:00Z',
    },
    {
        id: 2,
        kind: 'homestead',
        name: 'Main House',
        description: 'primary residence',
        category: 'Homestead',
        value: '500000.00',
        status: 'ACTIVE',
        href: '/properties',
        updatedAt: '2026-05-02T00:00:00Z',
    },
    {
        id: 3,
        kind: 'vehicle',
        name: 'Ford F150',
        description: null,
        category: 'Vehicle',
        value: '18000.00',
        status: 'SOLD',
        href: '/vehicles',
        updatedAt: '2026-05-03T00:00:00Z',
    },
    {
        id: 4,
        kind: 'bankAccount',
        name: 'Chase Checking',
        description: null,
        category: 'Bank Account',
        value: '12500.50',
        status: 'ACTIVE',
        href: '/accounts',
        updatedAt: '2026-05-04T00:00:00Z',
    },
    {
        id: 5,
        kind: 'vehicle',
        name: 'Tesla Model 3',
        description: null,
        category: 'Vehicle',
        value: '35000.00',
        status: 'ACTIVE',
        href: '/vehicles',
        updatedAt: '2026-05-05T00:00:00Z',
    },
    {
        id: 6,
        kind: 'homestead',
        name: 'Lake Cabin',
        description: null,
        category: 'Homestead',
        value: null,
        status: 'ACTIVE',
        href: '/properties',
        updatedAt: '2026-05-06T00:00:00Z',
    },
]

const includesArrayFilter = <T,>(
    row: { getValue: (id: string) => T },
    id: string,
    value: T[],
): boolean =>
    Array.isArray(value) && value.length > 0
        ? value.includes(row.getValue(id))
        : true

const columns: ColumnDef<AssetRow>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => row.original.name,
        filterFn: 'includesString',
    },
    {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => row.original.kind,
        filterFn: includesArrayFilter,
    },
    {
        accessorKey: 'value',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Value" />
        ),
        cell: ({ row }) => row.original.value ?? '—',
        sortingFn: (a, b) => {
            const av = a.original.value
            const bv = b.original.value
            if (av == null && bv == null) return 0
            if (av == null) return 1
            if (bv == null) return -1
            return parseFloat(av) - parseFloat(bv)
        },
    },
]

describe('ExportAssetsButton', () => {
    beforeEach(() => {
        exportCalls.length = 0
    })
    afterEach(cleanup)

    test('with no filter or sort: exports all 6 rows in input order', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <ExportAssetsButton table={table} />}
            />,
        )
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        expect(exportCalls).toHaveLength(1)
        const call = exportCalls[0]!
        expect(call.rows).toHaveLength(6)
        expect(call.headers[0]).toBe('ID')
        // First row id should be 1 (GMC Sierra) — the order in `assets[]`.
        expect(call.rows[0]![0]).toBe(1)
    })

    test('with name search narrowing to 1 row: exports only that row (FAILURE #15)', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <ExportAssetsButton table={table} />}
            />,
        )
        await user.type(screen.getByPlaceholderText('Search…'), 'GMC')
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        expect(exportCalls).toHaveLength(1)
        const call = exportCalls[0]!
        expect(call.rows).toHaveLength(1)
        expect(call.rows[0]![1]).toBe('GMC Sierra')
    })

    test('with column filter (kind = vehicle): exports only vehicles (FAILURE #13)', async () => {
        // No direct UI to set column filters in this minimal harness, so
        // wire one through the toolbar so the test can drive it.
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                toolbar={(table) => (
                    <>
                        <button
                            type="button"
                            data-testid="apply-vehicle-filter"
                            onClick={() =>
                                table
                                    .getColumn('kind')!
                                    .setFilterValue(['vehicle'])
                            }
                        >
                            apply
                        </button>
                        <ExportAssetsButton table={table} />
                    </>
                )}
            />,
        )
        await user.click(screen.getByTestId('apply-vehicle-filter'))
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        expect(exportCalls).toHaveLength(1)
        const call = exportCalls[0]!
        // 3 vehicles in assets[] (ids 1, 3, 5)
        expect(call.rows).toHaveLength(3)
        // Type column (index 3 in the export) should be 'Vehicle' for all
        const typeColumn = call.rows.map((r) => r[3])
        expect(typeColumn.every((t) => t === 'Vehicle')).toBe(true)
    })

    test('with Value column sorted desc: export rows are in that order (FAILURE #17)', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                toolbar={(table) => (
                    <>
                        <button
                            type="button"
                            data-testid="sort-desc"
                            onClick={() =>
                                table.getColumn('value')!.toggleSorting(true)
                            }
                        >
                            sort
                        </button>
                        <ExportAssetsButton table={table} />
                    </>
                )}
            />,
        )
        // Capture default-order first so we can prove the sort took effect.
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        const defaultOrder = exportCalls[0]!.rows.map((r) => r[0])
        exportCalls.length = 0

        await user.click(screen.getByTestId('sort-desc'))
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        expect(exportCalls).toHaveLength(1)
        const sortedOrder = exportCalls[0]!.rows.map((r) => r[0])

        // What the agent reported: sorted export came out in default order.
        // After the fix the orders must differ.
        expect(sortedOrder).not.toEqual(defaultOrder)
        // Among non-null rows, descending by value: Main House (500000)
        // comes before Chase Checking (12500.50).
        expect(sortedOrder.indexOf(2)).toBeLessThan(sortedOrder.indexOf(4))
    })

    test('search to zero matches: button disables (FAILURE #7)', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <ExportAssetsButton table={table} />}
            />,
        )
        const button = screen.getByRole('button', { name: /export csv/i })
        expect(button.hasAttribute('disabled')).toBe(false)
        await user.type(
            screen.getByPlaceholderText('Search…'),
            'NonexistentXYZ',
        )
        expect(
            screen
                .getByRole('button', { name: /export csv/i })
                .hasAttribute('disabled'),
        ).toBe(true)
    })

    // Reproduces a production-only failure mode: rapid sequential
    // setFilterValue calls (multi-keystroke typing) followed by
    // immediate inspection. The original FAILURE #7 test types one
    // string and lets React settle — that passed locally even when
    // production failed. This test bypasses the settle-between-renders
    // contract by driving `setFilterValue` directly and asserting state
    // BEFORE awaiting the next paint.
    //
    // KNOWN LIMITATION: the production bug this test was meant to guard
    // against turned out to be a React Compiler interaction (Compiler
    // memoizes ExportAssetsButton based on its reference-stable `table`
    // prop and skips re-running the body when TanStack state mutates).
    // bun:test doesn't run the Compiler, so every iteration of this test
    // has passed — even versions of the code that failed in production.
    // The component now has a `'use no memo'` directive (PR #87) to opt
    // out of the Compiler. This test still has value as a regression
    // guard against the non-Compiler path, but end-to-end verification
    // on a real production bundle (BROWSER-TEST-CSV-EXPORT.md step 6)
    // is the canonical signal for Compiler-interaction bugs.
    test('search to zero — disabled reflects post-filter row count without explicit settle', async () => {
        let capturedTable:
            | import('@tanstack/react-table').Table<AssetRow>
            | null = null
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                toolbar={(table) => {
                    capturedTable = table
                    return <ExportAssetsButton table={table} />
                }}
            />,
        )
        const table =
            capturedTable! as unknown as import('@tanstack/react-table').Table<AssetRow>

        // Drive filter directly — this is what the search input does
        // under the hood, but without React-Testing-Library's settle
        // semantics in between keystrokes.
        await import('@testing-library/react').then(({ act }) =>
            act(() => {
                table.getColumn('name')!.setFilterValue('NonexistentXYZ')
            }),
        )
        // After the act() commit, the button MUST reflect filtered = 0
        const btn = screen.getByRole('button', { name: /export csv/i })
        expect(btn.hasAttribute('disabled')).toBe(true)
        // Also assert the underlying row model agrees — sanity check
        // that this isn't just a render-pass-only artifact.
        expect(table.getFilteredRowModel().rows.length).toBe(0)
        expect(table.getSortedRowModel().rows.length).toBe(0)
    })

    test('filename uses local-time YYYY-MM-DD, not UTC', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                toolbar={(table) => <ExportAssetsButton table={table} />}
            />,
        )
        await user.click(screen.getByRole('button', { name: /export csv/i }))
        const filename = exportCalls[0]!.filename
        expect(filename).toMatch(/^hudson-trust-assets-\d{4}-\d{2}-\d{2}\.csv$/)
        // Compute the expected local date the same way the component does
        const d = new Date()
        const expected =
            `${d.getFullYear()}-` +
            `${String(d.getMonth() + 1).padStart(2, '0')}-` +
            `${String(d.getDate()).padStart(2, '0')}`
        expect(filename).toBe(`hudson-trust-assets-${expected}.csv`)
    })
})
