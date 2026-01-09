import { useState } from "react"
import { Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef as TanStackColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/pagination"

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
  pagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
}

/**
 * Generic data table component with sorting and actions
 *
 * @param data - Array of items to display
 * @param columns - Column definitions with optional render functions
 * @param onEdit - Optional edit handler (adds Edit button)
 * @param onDelete - Optional delete handler (adds Delete button)
 * @param emptyMessage - Message shown when no data (default: "No data available")
 * @param isLoading - Show skeleton loading state
 *
 * @example
 * ```typescript
 * import { DataTable, type ColumnDef } from "@/components/data-table"
 * import { EditableCurrencyCell } from "@/components/editable-cells"
 * import { Badge } from "@/components/ui/badge"
 *
 * interface Liability {
 *   id: string
 *   creditor: string
 *   currentBalance: string
 *   status: string
 * }
 *
 * const columns: ColumnDef<Liability>[] = [
 *   { key: "creditor", header: "Creditor", sortable: true },
 *   {
 *     key: "currentBalance",
 *     header: "Balance",
 *     sortable: true,
 *     render: (item) => (
 *       <EditableCurrencyCell
 *         value={item.currentBalance}
 *         onSave={async (val) => await updateLiability(item.id, { currentBalance: val })}
 *       />
 *     ),
 *   },
 *   {
 *     key: "status",
 *     header: "Status",
 *     render: (item) => <Badge>{item.status}</Badge>,
 *   },
 * ]
 *
 * <DataTable
 *   data={liabilities}
 *   columns={columns}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  emptyMessage = "No data available",
  isLoading = false,
  pagination,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const hasActions = onEdit || onDelete

  // Transform custom ColumnDef to TanStack ColumnDef
  const tanstackColumns: TanStackColumnDef<T>[] = [
    ...columns.map((col) => ({
      accessorKey: col.key,
      header: col.header,
      cell: col.render
        ? ({ row }: { row: any }) => col.render!(row.original)
        : ({ getValue }: { getValue: () => any }) => getValue(),
      enableSorting: col.sortable ?? false,
      // Type-aware sorting for better number comparison
      sortingFn: (rowA: any, rowB: any, columnId: string) => {
        const aVal = rowA.getValue(columnId)
        const bVal = rowB.getValue(columnId)

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        // Type-aware comparison
        if (typeof aVal === "number" && typeof bVal === "number") {
          return aVal - bVal
        }

        // String comparison
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        return aStr.localeCompare(bStr)
      },
    })),
    // Add actions column if handlers provided
    ...(hasActions
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row, table }: { row: any; table: any }) => (
              <div className="flex gap-1">
                {table.options.meta?.onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => table.options.meta.onEdit(row.original)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {table.options.meta?.onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => table.options.meta.onDelete(row.original)}
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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              {hasActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
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
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="h-4 w-4" />,
                          desc: <ChevronDown className="h-4 w-4" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
