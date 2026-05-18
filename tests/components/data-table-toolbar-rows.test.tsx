/** Documents the reactivity contract ExportAssetsButton depends on:
 *  `table.getFilteredRowModel().rows` and `table.getSortedRowModel().rows`
 *  accessed from inside a DataTable toolbar render-prop reflect the
 *  current search / column-filter / sort state. If these tests pass
 *  locally but production exports unfiltered rows, the bug is in
 *  deployment (stale bundle / CDN cache); if they fail, the bug is in
 *  our wiring. */

import '../setup'
import { afterEach, describe, expect, test } from 'bun:test'
import type { ColumnDef, Table as TanStackTable } from '@tanstack/react-table'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '../../src/components/ui/data-table'

interface Item {
    id: number
    name: string
    kind: string
}

const data: Item[] = [
    { id: 1, name: 'Alpha', kind: 'vehicle' },
    { id: 2, name: 'Bravo', kind: 'homestead' },
    { id: 3, name: 'Charlie', kind: 'vehicle' },
    { id: 4, name: 'Delta', kind: 'bankAccount' },
]

const columns: ColumnDef<Item>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => row.original.id },
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
    },
]

// Mirrors how ExportAssetsButton reads rows from the toolbar render-prop.
function RowProbe({ table }: { table: TanStackTable<Item> }) {
    const filtered = table.getFilteredRowModel().rows
    const sorted = table.getSortedRowModel().rows
    return (
        <span data-testid="probe">
            filtered={filtered.length}|sorted={sorted.length}|first=
            {sorted[0]?.original.name ?? '—'}
        </span>
    )
}

describe('DataTable toolbar render-prop receives reactive row models', () => {
    afterEach(cleanup)

    test('initial render: probe sees all 4 rows', () => {
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                toolbar={(table) => <RowProbe table={table} />}
            />,
        )
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=4|sorted=4|first=Alpha',
        )
    })

    test('after search narrows to 1 row, probe reflects the filter', async () => {
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                searchPlaceholder="Search…"
                toolbar={(table) => <RowProbe table={table} />}
            />,
        )
        await user.type(screen.getByPlaceholderText('Search…'), 'Bravo')
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=1|sorted=1|first=Bravo',
        )
    })

    test('after a column filter is set, probe reflects the column filter', async () => {
        // Set the column filter declaratively from a toolbar button so we
        // test the column-filter pipeline directly (not just search).
        const user = userEvent.setup()
        render(
            <DataTable
                columns={columns}
                data={data}
                searchKey="name"
                toolbar={(table) => (
                    <>
                        <button
                            type="button"
                            data-testid="filter-vehicle"
                            onClick={() =>
                                table
                                    .getColumn('kind')!
                                    .setFilterValue('vehicle')
                            }
                        >
                            filter
                        </button>
                        <RowProbe table={table} />
                    </>
                )}
            />,
        )
        await user.click(screen.getByTestId('filter-vehicle'))
        // Alpha and Charlie are the two vehicles in the dataset.
        expect(screen.getByTestId('probe').textContent).toBe(
            'filtered=2|sorted=2|first=Alpha',
        )
    })
})
