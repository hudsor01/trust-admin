import {
    type CellContext,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type Row,
    type SortingState,
    type ColumnDef as TanStackColumnDef,
    useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Pencil,
    Trash2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { DataTableProps } from '@/components/data-table'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export interface VirtualizedTableProps<T> extends DataTableProps<T> {
    /**
     * Height of each row in pixels for virtualization calculation
     * @default 53
     */
    rowHeight?: number
    /**
     * Maximum height of the table body before scrolling
     * @default 600
     */
    maxHeight?: number
    /**
     * Number of rows to render outside the visible area
     * @default 5
     */
    overscan?: number
}

/**
 * Virtualized data table for large datasets.
 *
 * Uses @tanstack/react-virtual to only render visible rows,
 * dramatically improving performance for tables with 100+ rows.
 *
 * Same interface as DataTable - drop-in replacement for large lists.
 *
 * @example
 * ```tsx
 * <VirtualizedTable
 *   data={activityLogs} // 1000+ rows
 *   columns={columns}
 *   maxHeight={500}
 *   rowHeight={48}
 * />
 * ```
 */
export function VirtualizedTable<T>({
    data,
    columns,
    onEdit,
    onDelete,
    emptyMessage = 'No data available',
    isLoading = false,
    pagination,
    rowHeight = 53,
    maxHeight = 600,
    overscan = 5,
}: VirtualizedTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const parentRef = useRef<HTMLDivElement>(null)

    const hasActions = onEdit || onDelete

    // Transform custom ColumnDef to TanStack ColumnDef
    const tanstackColumns: TanStackColumnDef<T>[] = [
        ...columns.map((col) => ({
            id: col.key,
            accessorKey: col.key,
            header: col.header,
            cell: col.render
                ? ({ row }: CellContext<T, unknown>) =>
                      col.render!(row.original)
                : ({ getValue }: CellContext<T, unknown>) => getValue(),
            enableSorting: col.sortable ?? false,
            meta: { align: col.align ?? 'left' },
            sortingFn: (rowA: Row<T>, rowB: Row<T>, columnId: string) => {
                const aVal = rowA.getValue(columnId)
                const bVal = rowB.getValue(columnId)

                if (aVal == null && bVal == null) return 0
                if (aVal == null) return 1
                if (bVal == null) return -1

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal
                }

                const aStr = String(aVal).toLowerCase()
                const bStr = String(bVal).toLowerCase()
                return aStr.localeCompare(bStr)
            },
        })),
        ...(hasActions
            ? [
                  {
                      id: 'actions',
                      header: 'Actions',
                      meta: { align: 'center' },
                      cell: ({ row, table }: CellContext<T, unknown>) => (
                          <div className="flex gap-1 justify-center">
                              {table.options.meta?.onEdit && (
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                          table.options.meta?.onEdit?.(
                                              row.original,
                                          )
                                      }
                                  >
                                      <Pencil className="h-4 w-4" />
                                  </Button>
                              )}
                              {table.options.meta?.onDelete && (
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() =>
                                          table.options.meta?.onDelete?.(
                                              row.original,
                                          )
                                      }
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      ),
                  } as TanStackColumnDef<T>,
              ]
            : []),
    ]

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        onSortingChange: setSorting,
        meta: { onEdit, onDelete },
    })

    const { rows } = table.getRowModel()

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan,
    })

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.key}
                                    className="text-center"
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                            {hasActions && (
                                <TableHead className="w-[100px] text-center">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col) => (
                                    <TableCell key={col.key}>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                ))}
                                {hasActions && (
                                    <TableCell className="text-center">
                                        <Skeleton className="h-8 w-16 mx-auto" />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="rounded-md border p-12 text-center">
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="text-center"
                                    >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                            <button
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="flex items-center justify-center gap-2 hover:text-foreground transition-colors w-full"
                                            >
                                                {flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )}
                                                {{
                                                    asc: (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ),
                                                    desc: (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ),
                                                }[
                                                    header.column.getIsSorted() as string
                                                ] ?? (
                                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                )}
                                            </button>
                                        ) : (
                                            flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                </Table>
                <div
                    ref={parentRef}
                    className="overflow-auto"
                    style={{ maxHeight }}
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const row = rows[virtualRow.index]
                            if (!row) return null
                            return (
                                <div
                                    key={row.id}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                {row
                                                    .getVisibleCells()
                                                    .map((cell) => {
                                                        const align =
                                                            (
                                                                cell.column
                                                                    .columnDef
                                                                    .meta as {
                                                                    align?: string
                                                                }
                                                            )?.align ?? 'left'
                                                        const alignClass =
                                                            align === 'center'
                                                                ? 'text-center'
                                                                : align ===
                                                                    'right'
                                                                  ? 'text-right'
                                                                  : 'text-left'
                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                className={
                                                                    alignClass
                                                                }
                                                            >
                                                                {flexRender(
                                                                    cell.column
                                                                        .columnDef
                                                                        .cell,
                                                                    cell.getContext(),
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            {pagination && (
                <Pagination
                    currentPage={pagination.currentPage}
                    pageSize={pagination.pageSize}
                    totalCount={pagination.totalCount}
                    onPageChange={pagination.onPageChange}
                    disabled={isLoading}
                />
            )}
        </div>
    )
}
