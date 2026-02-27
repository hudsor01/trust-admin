/** TanStack Table column definition helpers for DataTable. */

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableDateCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { BadgeVariant } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/utils/formatters'

// =============================================================================
// TYPES
// =============================================================================

export interface ColumnOpts {
    sortable?: boolean
}

type IdAccessor<T> = (item: T) => number

// =============================================================================
// TEXT COLUMN
// =============================================================================

/** Simple text display column. */
export function textColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => {
            const value = row.original[key]
            return value != null ? String(value) : '—'
        },
    }
}

// =============================================================================
// EDITABLE TEXT COLUMN
// =============================================================================

/** Editable text column with inline editing. */
export function editableTextColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { placeholder?: string; getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => (
            <EditableTextCell
                value={row.original[key] as string | null}
                onSave={(val) => onSave(getId(row.original), val)}
                placeholder={opts?.placeholder ?? '—'}
            />
        ),
    }
}

// =============================================================================
// EDITABLE CURRENCY COLUMN
// =============================================================================

/** Editable currency column with inline editing and currency formatting. */
export function editableCurrencyColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => (
            <EditableCurrencyCell
                value={row.original[key] as string | null}
                onSave={(val) => onSave(getId(row.original), val)}
            />
        ),
    }
}

// =============================================================================
// EDITABLE SELECT COLUMN
// =============================================================================

/** Editable select column with dropdown and badge display. */
export function editableSelectColumn<T>(
    key: keyof T & string,
    header: string,
    options: readonly { value: string; label: string }[],
    onSave: (id: number, value: string) => Promise<void>,
    opts?: ColumnOpts & {
        variants?: Record<string, BadgeVariant>
        getId?: IdAccessor<T>
    },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => (
            <EditableSelectCell
                value={row.original[key] as string}
                options={options}
                variants={opts?.variants}
                onSave={(val) => onSave(getId(row.original), val)}
            />
        ),
    }
}

// =============================================================================
// DATE COLUMN
// =============================================================================

/** Formatted date display column. */
export function dateColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => {
            const value = row.original[key] as string | null
            return value ? formatDate(value) : '—'
        },
    }
}

// =============================================================================
// EDITABLE DATE COLUMN
// =============================================================================

/** Editable date column with inline date picker. */
export function editableDateColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { placeholder?: string; getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => (
            <EditableDateCell
                value={row.original[key] as string | null}
                onSave={(val) => onSave(getId(row.original), val)}
                placeholder={opts?.placeholder ?? '—'}
            />
        ),
    }
}

// =============================================================================
// CURRENCY COLUMN (read-only)
// =============================================================================

/** Read-only formatted currency display column. */
export function currencyColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => {
            const value = row.original[key] as string | null
            return (
                <span className="text-right tabular-nums">
                    {value ? formatCurrency(value) : '—'}
                </span>
            )
        },
    }
}

// =============================================================================
// BADGE COLUMN
// =============================================================================

/** Badge display column with optional variant mapping. */
export function badgeColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts & {
        variants?: Record<string, BadgeVariant>
        /** Transform the value before display */
        format?: (value: string) => string
    },
): ColumnDef<T> {
    return {
        accessorKey: key,
        header: opts?.sortable
            ? ({ column }) => (
                  <DataTableColumnHeader column={column} title={header} />
              )
            : header,
        cell: ({ row }) => {
            const value = row.original[key] as string | null
            if (!value) return '—'
            const variant = opts?.variants?.[value] ?? 'secondary'
            const display = opts?.format ? opts.format(value) : value
            return (
                <Badge variant={variant} className="font-normal">
                    {display}
                </Badge>
            )
        },
    }
}

// =============================================================================
// ACTIONS COLUMN
// =============================================================================

/** Standard actions column with edit/delete buttons. */
export function actionsColumn<T>(opts: {
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    onView?: (item: T) => void
}): ColumnDef<T> {
    return {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
            <div className="flex items-center gap-1 justify-center">
                {opts.onEdit && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => opts.onEdit!(row.original)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Edit</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                {opts.onDelete && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => opts.onDelete!(row.original)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Delete</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        ),
    }
}
