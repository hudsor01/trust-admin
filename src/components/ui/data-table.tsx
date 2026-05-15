'use client'

import {
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnSizingInfoState,
    type ColumnSizingState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Header,
    type Row,
    type SortingState,
    type Table as TanStackTable,
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
import {
    loadColumnSizing,
    saveColumnSizing,
} from '@/lib/data-table-persistence'
import { cn } from '@/lib/utils'
import { DataTablePagination } from './data-table-pagination'
import { DataTableViewOptions } from './data-table-view-options'
import { Input } from './input'
import { Skeleton } from './skeleton'

const RESIZE_MIN = 20
const RESIZE_MAX = 2000

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    isLoading?: boolean
    emptyMessage?: string
    enableRowSelection?: boolean
    enableColumnVisibility?: boolean
    enablePagination?: boolean
    /** Columns hidden by default (user can toggle via column visibility menu) */
    initialColumnVisibility?: VisibilityState
    /** When set, column widths persist to localStorage under `dt:${tableId}:sizing`. */
    tableId?: string
    /** Rendered before the column visibility toggle. Pass a callback to
     *  receive the table instance for faceted filters / column refs. */
    toolbar?:
        | React.ReactNode
        | ((table: TanStackTable<TData>) => React.ReactNode)
    /** Click handler for table body rows. Wires up cursor: pointer when set. */
    onRowClick?: (row: TData, ctx: Row<TData>) => void
}

function ResizeHandle<TData, TValue>({
    header,
    table,
}: {
    header: Header<TData, TValue>
    table: TanStackTable<TData>
}) {
    const currentSize = header.getSize()
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 16 : 4
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [header.column.id]: Math.max(RESIZE_MIN, currentSize - step),
            }))
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            table.setColumnSizing((old) => ({
                ...old,
                [header.column.id]: Math.min(RESIZE_MAX, currentSize + step),
            }))
        } else if (e.key === 'Home' || e.key === 'Escape') {
            e.preventDefault()
            header.column.resetSize()
        }
    }
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(currentSize)}
            aria-valuemin={RESIZE_MIN}
            aria-valuemax={RESIZE_MAX}
            aria-label={`Resize ${String(header.column.id)} column`}
            tabIndex={0}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onDoubleClick={() => header.column.resetSize()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            title="Drag, double-click, or arrow keys to resize — Home/Esc to reset"
            className={cn(
                "absolute top-0 right-0 h-full w-px cursor-col-resize touch-none select-none bg-border/60 transition-colors before:absolute before:inset-y-0 before:-left-1.5 before:-right-1.5 before:content-[''] hover:bg-primary/60 focus-visible:bg-primary focus-visible:outline-none",
                header.column.getIsResizing() && 'bg-primary w-0.5',
            )}
        />
    )
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
    initialColumnVisibility,
    tableId,
    toolbar,
    onRowClick,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>(initialColumnVisibility ?? {})
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
        () => loadColumnSizing(tableId),
    )
    const [columnSizingInfo, setColumnSizingInfo] =
        React.useState<ColumnSizingInfoState>({
            columnSizingStart: [],
            deltaOffset: null,
            deltaPercentage: null,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
        })

    // Persist column widths per table. Only writes when a drag is NOT in
    // progress (avoids one synchronous localStorage write per pixel of drag,
    // which costs frames on long-row tables). A ref de-dupes identical
    // serializations so re-renders that don't change sizing don't write.
    const lastPersisted = React.useRef<string | null>(null)
    React.useEffect(() => {
        if (!tableId) return
        if (columnSizingInfo.isResizingColumn) return
        const serialized = JSON.stringify(columnSizing)
        if (lastPersisted.current === serialized) return
        lastPersisted.current = serialized
        saveColumnSizing(tableId, columnSizing)
    }, [tableId, columnSizing, columnSizingInfo.isResizingColumn])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnSizingChange: setColumnSizing,
        onColumnSizingInfoChange: setColumnSizingInfo,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: enablePagination
            ? getPaginationRowModel()
            : undefined,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        // Required by DataTableFacetedFilter; no-op when no facets are read.
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            columnSizing,
            columnSizingInfo,
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

    const totalSize = table.getTotalSize()

    return (
        <div className="w-full">
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
                {typeof toolbar === 'function' ? toolbar(table) : toolbar}
                {enableColumnVisibility && (
                    <DataTableViewOptions table={table} />
                )}
            </div>

            {/* `width: 100%` + `minWidth: totalSize` keeps narrow tables flush
                with the container while letting wide / user-resized tables
                exceed it and engage the wrapper's horizontal scroll.
                `tableLayout: fixed` makes per-column width hints exact. */}
            <div className="rounded-md border">
                <Table
                    style={{
                        tableLayout: 'fixed',
                        width: '100%',
                        minWidth: totalSize,
                    }}
                >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            width: header.getSize(),
                                            position: 'relative',
                                        }}
                                        className="pr-3"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                        {header.column.getCanResize() && (
                                            <ResizeHandle
                                                header={header}
                                                table={table}
                                            />
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
                                    role={onRowClick ? 'button' : undefined}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    className={
                                        onRowClick
                                            ? 'cursor-pointer focus:outline-none focus-visible:bg-muted/50'
                                            : undefined
                                    }
                                    onClick={
                                        onRowClick
                                            ? (e) => {
                                                  // Don't navigate when the
                                                  // click landed on a child
                                                  // interactive element (a
                                                  // button, link, input, …).
                                                  // The row itself carries
                                                  // role="button" for a11y,
                                                  // so exclude that match
                                                  // via currentTarget.
                                                  const target =
                                                      e.target as HTMLElement
                                                  const interactive =
                                                      target.closest(
                                                          'button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="menuitem"]',
                                                      )
                                                  if (
                                                      interactive &&
                                                      interactive !==
                                                          e.currentTarget
                                                  ) {
                                                      return
                                                  }
                                                  onRowClick(row.original, row)
                                              }
                                            : undefined
                                    }
                                    onKeyDown={
                                        onRowClick
                                            ? (e) => {
                                                  if (
                                                      e.key === 'Enter' ||
                                                      e.key === ' '
                                                  ) {
                                                      e.preventDefault()
                                                      onRowClick(
                                                          row.original,
                                                          row,
                                                      )
                                                  }
                                              }
                                            : undefined
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            style={{
                                                width: cell.column.getSize(),
                                            }}
                                            className="overflow-hidden"
                                        >
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

export type { ColumnDef } from '@tanstack/react-table'
