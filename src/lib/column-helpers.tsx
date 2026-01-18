/**
 * Column Definition Helpers
 *
 * Utility functions for creating common column configurations for DataTable.
 * Reduces boilerplate when defining table columns across admin pages.
 */

import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@/components/data-table'
import {
    EditableCurrencyCell,
    EditableDateCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    align?: 'left' | 'center' | 'right'
}

type IdAccessor<T> = (item: T) => number

// =============================================================================
// TEXT COLUMN
// =============================================================================

/**
 * Creates a simple text display column
 *
 * @example
 * textColumn<Vehicle>('make', 'Make', { sortable: true })
 */
export function textColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => {
            const value = item[key]
            return value != null ? String(value) : '—'
        },
    }
}

// =============================================================================
// EDITABLE TEXT COLUMN
// =============================================================================

/**
 * Creates an editable text column with inline editing
 *
 * @example
 * editableTextColumn<Vehicle>('color', 'Color', (id, val) => handleUpdate(id, { color: val }), { placeholder: 'Add color' })
 */
export function editableTextColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { placeholder?: string; getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => (
            <EditableTextCell
                value={item[key] as string | null}
                onSave={(val) => onSave(getId(item), val)}
                placeholder={opts?.placeholder ?? '—'}
            />
        ),
    }
}

// =============================================================================
// EDITABLE CURRENCY COLUMN
// =============================================================================

/**
 * Creates an editable currency column with inline editing and currency formatting
 *
 * @example
 * editableCurrencyColumn<Vehicle>('dodValue', 'DOD Value', (id, val) => handleUpdate(id, { dodValue: val }))
 */
export function editableCurrencyColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'right',
        render: (item) => (
            <EditableCurrencyCell
                value={item[key] as string | null}
                onSave={(val) => onSave(getId(item), val)}
            />
        ),
    }
}

// =============================================================================
// EDITABLE SELECT COLUMN
// =============================================================================

/**
 * Creates an editable select column with dropdown and badge display
 *
 * @example
 * editableSelectColumn<Vehicle>(
 *   'titleStatus',
 *   'Title',
 *   TITLE_STATUS,
 *   (id, val) => handleUpdate(id, { titleStatus: asTitleStatus(val) }),
 *   { variants: STATUS_VARIANTS }
 * )
 */
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
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => (
            <EditableSelectCell
                value={item[key] as string}
                options={options}
                variants={opts?.variants}
                onSave={(val) => onSave(getId(item), val)}
            />
        ),
    }
}

// =============================================================================
// DATE COLUMN
// =============================================================================

/**
 * Creates a formatted date display column
 *
 * @example
 * dateColumn<Vehicle>('acquisitionDate', 'Acquired', { sortable: true })
 */
export function dateColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => {
            const value = item[key] as string | null
            return value ? formatDate(value) : '—'
        },
    }
}

// =============================================================================
// EDITABLE DATE COLUMN
// =============================================================================

/**
 * Creates an editable date column with inline date picker
 *
 * @example
 * editableDateColumn<Vehicle>('acquisitionDate', 'Acquired', (id, val) => handleUpdate(id, { acquisitionDate: val }))
 */
export function editableDateColumn<T>(
    key: keyof T & string,
    header: string,
    onSave: (id: number, value: string | null) => Promise<void>,
    opts?: ColumnOpts & { placeholder?: string; getId?: IdAccessor<T> },
): ColumnDef<T> {
    const getId = opts?.getId ?? ((item: T) => (item as { id: number }).id)
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => (
            <EditableDateCell
                value={item[key] as string | null}
                onSave={(val) => onSave(getId(item), val)}
                placeholder={opts?.placeholder ?? '—'}
            />
        ),
    }
}

// =============================================================================
// CURRENCY COLUMN (read-only)
// =============================================================================

/**
 * Creates a formatted currency display column (read-only)
 *
 * @example
 * currencyColumn<Vehicle>('dodValue', 'DOD Value', { sortable: true })
 */
export function currencyColumn<T>(
    key: keyof T & string,
    header: string,
    opts?: ColumnOpts,
): ColumnDef<T> {
    return {
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'right',
        render: (item) => {
            const value = item[key] as string | null
            return value ? formatCurrency(value) : '—'
        },
    }
}

// =============================================================================
// BADGE COLUMN
// =============================================================================

/**
 * Creates a badge display column with optional variant mapping
 *
 * @example
 * badgeColumn<Vehicle>('status', 'Status', { variants: STATUS_VARIANTS, sortable: true })
 */
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
        key,
        header,
        sortable: opts?.sortable ?? false,
        align: opts?.align ?? 'left',
        render: (item) => {
            const value = item[key] as string | null
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

/**
 * Creates a standard actions column with edit/delete buttons
 *
 * @example
 * actionsColumn<Vehicle>({ onEdit: handleEdit, onDelete: handleDelete })
 */
export function actionsColumn<T>(opts: {
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    onView?: (item: T) => void
}): ColumnDef<T> {
    return {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        render: (item) => (
            <div className="flex items-center gap-1 justify-center">
                {opts.onEdit && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => opts.onEdit!(item)}
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
                                    onClick={() => opts.onDelete!(item)}
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
