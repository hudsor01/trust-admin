'use client'

/**
 * Data Table Component
 *
 * A powerful, flexible data table built on TanStack Table.
 * Supports sorting, filtering, pagination, row selection, and column visibility.
 *
 * @see https://ui.shadcn.com/docs/components/data-table
 * @see https://tanstack.com/table/v8/docs/introduction
 */

import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './data-table-pagination'
import { DataTableViewOptions } from './data-table-view-options'
import { Input } from './input'
import { Skeleton } from './skeleton'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    /** Column key to use for the search filter */
    searchKey?: string
    /** Placeholder text for search input */
    searchPlaceholder?: string
    /** Show loading skeleton */
    isLoading?: boolean
    /** Message when no data */
    emptyMessage?: string
    /** Enable row selection */
    enableRowSelection?: boolean
    /** Enable column visibility toggle */
    enableColumnVisibility?: boolean
    /** Enable pagination */
    enablePagination?: boolean
    /** Custom toolbar content (rendered before column visibility) */
    toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    isLoading = false,
    emptyMessage = 'No results.',
    enableRowSelection = false,
    enableColumnVisibility = true,
    enablePagination = true,
    toolbar,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: enablePagination
            ? getPaginationRowModel()
            : undefined,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    // PERF: Memoize search handler to prevent Input re-renders
    const handleSearchChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
        },
        [searchKey, table],
    )

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center py-4">
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="ml-auto h-10 w-[100px]" />
                </div>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.slice(0, 5).map((_, i) => (
                                    <TableHead key={i}>
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {columns.slice(0, 5).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* Toolbar */}
            <div className="flex items-center py-4 gap-2">
                {searchKey && (
                    <Input
                        placeholder={searchPlaceholder}
                        value={
                            (table
                                .getColumn(searchKey)
                                ?.getFilterValue() as string) ?? ''
                        }
                        onChange={handleSearchChange}
                        className="max-w-sm"
                    />
                )}
                {toolbar}
                {enableColumnVisibility && (
                    <DataTableViewOptions table={table} />
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {enablePagination && (
                <div className="py-4">
                    <DataTablePagination
                        table={table}
                        showSelectedCount={enableRowSelection}
                    />
                </div>
            )}
        </div>
    )
}

// Re-export types for convenience
export type { ColumnDef } from '@tanstack/react-table'
