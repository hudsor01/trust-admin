import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export interface VirtualizedTableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]
    emptyMessage?: string
    isLoading?: boolean
    rowHeight?: number
    maxHeight?: number
    /** Rows rendered outside visible area to reduce flicker during fast scroll. */
    overscan?: number
}

/** PERF: Only renders visible rows via @tanstack/react-virtual. Same ColumnDef API as DataTable. */
export function VirtualizedTable<T>({
    data,
    columns,
    emptyMessage = 'No data available',
    isLoading = false,
    rowHeight = 53,
    maxHeight = 600,
    overscan = 5,
}: VirtualizedTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const parentRef = useRef<HTMLDivElement>(null)

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
        onSortingChange: setSorting,
    })

    const { rows } = table.getRowModel()

    // PERF: Stable refs prevent virtualizer from recalculating on every render
    const getScrollElement = useCallback(() => parentRef.current, [])
    const estimateSize = useCallback(() => rowHeight, [rowHeight])

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement,
        estimateSize,
        overscan,
    })

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, i) => (
                                <TableHead key={col.id ?? `col-${i}`}>
                                    <Skeleton className="h-4 w-20" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col, j) => (
                                    <TableCell key={col.id ?? `cell-${i}-${j}`}>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
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
                                                    .map((cell) => (
                                                        <TableCell
                                                            key={cell.id}
                                                        >
                                                            {flexRender(
                                                                cell.column
                                                                    .columnDef
                                                                    .cell,
                                                                cell.getContext(),
                                                            )}
                                                        </TableCell>
                                                    ))}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
