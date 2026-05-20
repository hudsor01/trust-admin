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
    type Row,
    type SortingState,
    type Table as TanStackTable,
    useReactTable,
    type VisibilityState,
} from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
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
    COLUMN_WIDTH_MAX,
    COLUMN_WIDTH_MIN,
    clampColumnSizing,
    loadColumnSizing,
    PERSIST_DEBOUNCE_MS,
    saveColumnSizing,
} from '@/lib/data-table-persistence'
import { cn } from '@/lib/utils'
import {
    type BulkAction,
    DataTableBulkActions,
} from './data-table-bulk-actions'
import { DataTableExport } from './data-table-export'
import { DataTablePagination } from './data-table-pagination'
import { ResizeHandle } from './data-table-resize-handle'
import { DataTableViewOptions } from './data-table-view-options'
import { Input } from './input'
import { Skeleton } from './skeleton'

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
    /** When provided, render a sticky bulk-action toolbar below the table header when selection is non-empty. */
    bulkActions?: BulkAction<TData>[]
    /** When true, render a CSV export button in the top-right toolbar slot. */
    exportable?: boolean
    /** Used by the CSV exporter for filename (e.g. "vehicles" → "vehicles-2026-05-19.csv"). */
    exportResource?: string
    /** Optional per-column formatters for CSV export (keyed by column id). */
    exportFormatters?: Record<string, (value: unknown, row: unknown) => string>
    /** When provided, each row renders an expand chevron and `getRowDetail(row)` below the row when expanded. */
    getRowDetail?: (row: TData) => React.ReactNode
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
    bulkActions,
    exportable,
    exportResource,
    exportFormatters,
    getRowDetail,
}: DataTableProps<TData, TValue>) {
    const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
        new Set(),
    )
    const toggleExpand = React.useCallback((rowId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev)
            if (next.has(rowId)) next.delete(rowId)
            else next.add(rowId)
            return next
        })
    }, [])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>(initialColumnVisibility ?? {})
    const [rowSelection, setRowSelection] = React.useState({})
    // Always initialize with empty sizing so SSR HTML (where
    // `loadColumnSizing` returns `{}` because `window` is undefined)
    // matches the client's first-render HTML byte-for-byte. Persisted
    // widths get applied via the mount/tableId effect below, after
    // React commits the initial hydration — eliminates React #418
    // hydration mismatches when a user with persisted column widths
    // (re)visits a page rendered through `HydrationBoundary`.
    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
        {},
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
    // Dedup ref. Tracks the last value we've written to localStorage so
    // a no-op render doesn't issue a redundant write. Starts at the
    // SSR-safe `'{}'` and is updated whenever persisted sizing loads or
    // is written through.
    const lastPersisted = React.useRef('{}')
    // Holds the most-recent unflushed write for the unmount-flush effect.
    // Set by the debounce timer's schedule path; cleared by its commit.
    const pendingWrite = React.useRef<{
        tableId: string
        sizing: ColumnSizingState
    } | null>(null)
    // Tracks the previous tableId across renders so the render-time
    // transition handler can detect swaps and flush a pending write
    // under the prior tableId before resetting.
    const prevTableIdRef = React.useRef<string | undefined>(undefined)
    // Distinguishes "first render after mount" from later renders. The
    // initial render must NOT read localStorage (would mismatch SSR's
    // `{}` and trigger React #418), but later tableId transitions need
    // the render-time reset pattern to avoid a stale-sizing-under-new-key
    // window between effect-driven `setColumnSizing({})` and re-render.
    const hasMountedRef = React.useRef(false)

    // Render-time tableId transition (post-mount only). Uses the
    // canonical "store information from previous renders" pattern:
    // React discards the current render output and re-renders with the
    // reset state, so the persist effect never observes a transitional
    // render where `tableId` is NEW but `columnSizing` is OLD. Skipped
    // on the very first render so SSR HTML and client first-render HTML
    // stay byte-identical — the initial load happens in the mount
    // effect below, after hydration commits.
    if (hasMountedRef.current && prevTableIdRef.current !== tableId) {
        const pending = pendingWrite.current
        if (pending && pending.tableId === prevTableIdRef.current) {
            saveColumnSizing(pending.tableId, pending.sizing)
        }
        prevTableIdRef.current = tableId
        const loaded = tableId ? loadColumnSizing(tableId) : {}
        setColumnSizing(loaded)
        lastPersisted.current = JSON.stringify(loaded)
        pendingWrite.current = null
    }

    // Mount-only effect: load persisted sizing AFTER hydration commits.
    // Empty deps so it fires exactly once on mount and never on later
    // tableId changes (those go through the render-time handler above).
    // Without this gating, `loadColumnSizing` running on the very first
    // render would return persisted widths client-side but `{}` on the
    // server, producing the React #418 hydration mismatch this whole
    // file is shaped to avoid.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design — tableId changes are handled by the render-time block above.
    React.useEffect(() => {
        hasMountedRef.current = true
        if (!tableId) return
        prevTableIdRef.current = tableId
        const loaded = loadColumnSizing(tableId)
        setColumnSizing(loaded)
        lastPersisted.current = JSON.stringify(loaded)
    }, [])

    // Persist column widths per table. Three guards layered:
    // 1. Skip while a mouse/touch drag is in progress (TanStack fires one
    //    setColumnSizing per pixel under `columnResizeMode: 'onChange'`).
    // 2. Debounce so a held keyboard arrow doesn't trigger one synchronous
    //    localStorage write per repeat tick.
    // 3. Dedup against the last serialised payload so renders that don't
    //    change sizing don't write.
    // The cleanup ONLY clears the timer — it does NOT call
    // `saveColumnSizing`. Cleanups run on every dep change, so writing
    // synchronously here would defeat the debounce (every keystroke would
    // flush the previous interim value). The unmount-flush lives in the
    // mount-only effect below.
    React.useEffect(() => {
        if (!tableId) return
        // During an in-progress drag, defer the debounced write until
        // the drag finishes — TanStack fires one setColumnSizing per
        // mousemove pixel. BUT capture the latest sizing into the
        // pending-ref anyway, so an unmount mid-drag (rare: browser
        // back during drag, modal close, etc.) flushes the live drag
        // delta rather than a pre-drag snapshot.
        if (columnSizingInfo.isResizingColumn) {
            pendingWrite.current = { tableId, sizing: columnSizing }
            return
        }
        const serialized = JSON.stringify(columnSizing)
        if (lastPersisted.current === serialized) return
        pendingWrite.current = { tableId, sizing: columnSizing }
        const t = window.setTimeout(() => {
            lastPersisted.current = serialized
            saveColumnSizing(tableId, columnSizing)
            pendingWrite.current = null
        }, PERSIST_DEBOUNCE_MS)
        return () => window.clearTimeout(t)
    }, [tableId, columnSizing, columnSizingInfo.isResizingColumn])

    // Mount-only unmount-flush. The cleanup of an effect with empty
    // deps fires exactly once, on unmount, so a pending payload that
    // hasn't yet flushed gets a synchronous final write here.
    React.useEffect(() => {
        return () => {
            const pending = pendingWrite.current
            if (pending) {
                saveColumnSizing(pending.tableId, pending.sizing)
                pendingWrite.current = null
            }
        }
    }, [])

    const table = useReactTable({
        data,
        columns,
        columnResizeMode: 'onChange',
        enableColumnResizing: true,
        // Bound mouse-drag widths to the same [min, max] range the
        // keyboard handler and persistence validator enforce. Without
        // this, drag can produce values > COLUMN_WIDTH_MAX which
        // load-time validation later silently drops.
        defaultColumn: {
            minSize: COLUMN_WIDTH_MIN,
            maxSize: COLUMN_WIDTH_MAX,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        // Clamp at the state-write boundary. TanStack's
        // `defaultColumn.maxSize` only clamps `getSize()` (the read);
        // raw drag writes go straight into `columnSizing` unbounded.
        // Without this wrap, a drag past MAX would persist out-of-range
        // values that the load-time validator silently drops on the next
        // mount.
        onColumnSizingChange: (updater) =>
            setColumnSizing((old) =>
                clampColumnSizing(
                    typeof updater === 'function' ? updater(old) : updater,
                ),
            ),
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
                {exportable && exportResource && (
                    <DataTableExport
                        table={table}
                        resource={exportResource}
                        formatters={exportFormatters}
                    />
                )}
                {enableColumnVisibility && (
                    <DataTableViewOptions table={table} />
                )}
            </div>

            {bulkActions && bulkActions.length > 0 && (
                <DataTableBulkActions
                    table={table}
                    actions={bulkActions}
                    resourceLabel={exportResource}
                />
            )}

            {/* `width: 100%` + `minWidth: totalSize` keeps narrow tables flush
                with the container while letting wide / user-resized tables
                exceed it and engage the wrapper's horizontal scroll.
                `tableLayout: fixed` makes per-column width hints exact. */}
            <div className="rounded-md border overflow-x-auto">
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
                                {getRowDetail && (
                                    <TableHead
                                        style={{ width: 40 }}
                                        aria-hidden="true"
                                    />
                                )}
                                {headerGroup.headers.map((header) => {
                                    const canResize =
                                        header.column.getCanResize()
                                    return (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            style={{
                                                width: header.getSize(),
                                                position: 'relative',
                                            }}
                                            className={
                                                canResize ? 'pr-3' : undefined
                                            }
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                            {canResize && (
                                                <ResizeHandle
                                                    header={header}
                                                    table={table}
                                                />
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const isExpanded = expandedRows.has(row.id)
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            data-state={
                                                row.getIsSelected() &&
                                                'selected'
                                            }
                                            role={
                                                onRowClick
                                                    ? 'button'
                                                    : undefined
                                            }
                                            tabIndex={
                                                onRowClick ? 0 : undefined
                                            }
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
                                                          onRowClick(
                                                              row.original,
                                                              row,
                                                          )
                                                      }
                                                    : undefined
                                            }
                                            onKeyDown={
                                                onRowClick
                                                    ? (e) => {
                                                          if (
                                                              e.key ===
                                                                  'Enter' ||
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
                                            {getRowDetail && (
                                                <TableCell
                                                    style={{ width: 40 }}
                                                    className="w-10 p-0 text-center align-middle"
                                                >
                                                    <button
                                                        type="button"
                                                        aria-expanded={
                                                            isExpanded
                                                        }
                                                        aria-label={
                                                            isExpanded
                                                                ? 'Collapse row'
                                                                : 'Expand row'
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleExpand(row.id)
                                                        }}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <ChevronRight
                                                            className={cn(
                                                                'h-4 w-4 transition-transform',
                                                                isExpanded &&
                                                                    'rotate-90',
                                                            )}
                                                        />
                                                    </button>
                                                </TableCell>
                                            )}
                                            {row
                                                .getVisibleCells()
                                                .map((cell) => (
                                                    <TableCell
                                                        key={cell.id}
                                                        style={{
                                                            width: cell.column.getSize(),
                                                        }}
                                                        className="overflow-hidden"
                                                    >
                                                        {flexRender(
                                                            cell.column
                                                                .columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </TableCell>
                                                ))}
                                        </TableRow>
                                        {getRowDetail && isExpanded && (
                                            <TableRow
                                                aria-hidden={false}
                                                data-row-detail="true"
                                            >
                                                <TableCell
                                                    colSpan={
                                                        row.getVisibleCells()
                                                            .length + 1
                                                    }
                                                    className="bg-muted/30 p-4 border-b border-border"
                                                >
                                                    {getRowDetail(row.original)}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        columns.length + (getRowDetail ? 1 : 0)
                                    }
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
