'use client'

/**
 * Editable Cell Components
 *
 * Reusable inline-editable table cell components.
 * All cells support: keyboard navigation (Enter to save, Escape to cancel),
 * loading states, and optimistic updates.
 *
 * PERF: All cells wrapped with React.memo() to prevent unnecessary re-renders
 * in table contexts where parent state changes frequently.
 */

import { Loader2 } from 'lucide-react'
import { memo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useEditableCell } from '@/hooks/use-editable-cell'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'

// =============================================================================
// EDITABLE TEXT CELL
// =============================================================================

interface EditableTextCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
    placeholder?: string
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditableTextCell = memo(function EditableTextCell({
    value,
    onSave,
    placeholder = '—',
}: EditableTextCellProps) {
    const {
        editing,
        editValue,
        saving,
        startEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    } = useEditableCell({
        value,
        onSave,
        formatForEdit: (v) => v || '',
        parseFromEdit: (v) => v || null,
    })

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm"
                    autoFocus
                />
                {saving && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    return (
        <div
            onClick={startEditing}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span className={cn('text-sm', !value && 'text-muted-foreground')}>
                {value || placeholder}
            </span>
        </div>
    )
})

// =============================================================================
// EDITABLE CURRENCY CELL
// =============================================================================

interface EditableCurrencyCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditableCurrencyCell = memo(function EditableCurrencyCell({
    value,
    onSave,
}: EditableCurrencyCellProps) {
    const {
        editing,
        editValue,
        saving,
        startEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    } = useEditableCell({
        value,
        onSave,
        formatForEdit: (v) => v || '',
        parseFromEdit: (v) => v || null,
    })

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm"
                    placeholder="$0.00"
                    autoFocus
                />
                {saving && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    return (
        <div
            onClick={startEditing}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span
                className={cn(
                    'text-sm font-medium',
                    !value && 'text-muted-foreground',
                )}
            >
                {value ? formatCurrency(value) : '—'}
            </span>
        </div>
    )
})

// =============================================================================
// EDITABLE SELECT CELL
// =============================================================================

interface EditableSelectCellProps {
    value: string
    options: readonly { value: string; label: string }[]
    onSave: (val: string) => Promise<unknown>
    /** Map of value to badge variant */
    variants?: Record<
        string,
        'default' | 'secondary' | 'destructive' | 'outline'
    >
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditableSelectCell = memo(function EditableSelectCell({
    value,
    options,
    onSave,
    variants,
}: EditableSelectCellProps) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value
        if (newValue === value) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await onSave(newValue)
            setEditing(false)
        } catch (err) {
            console.error('Save failed:', err)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <NativeSelect
                    value={value}
                    onChange={handleChange}
                    onBlur={() => setEditing(false)}
                    size="sm"
                    className="w-36"
                    autoFocus
                >
                    {options.map((opt) => (
                        <NativeSelectOption key={opt.value} value={opt.value}>
                            {opt.label}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
                {saving && (
                    <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    const label = options.find((o) => o.value === value)?.label || value
    const variant = variants?.[value] || 'secondary'

    return (
        <div
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <Badge variant={variant} className="font-normal">
                {label}
            </Badge>
        </div>
    )
})

// =============================================================================
// EDITABLE DATE CELL
// =============================================================================

interface EditableDateCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
    placeholder?: string
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditableDateCell = memo(function EditableDateCell({
    value,
    onSave,
    placeholder = '—',
}: EditableDateCellProps) {
    const {
        editing,
        editValue,
        saving,
        startEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    } = useEditableCell({
        value,
        onSave,
        formatForEdit: (v) => (v ? (v.split('T')[0] ?? '') : ''),
        parseFromEdit: (v) => (v ? new Date(v).toISOString() : null),
    })

    if (editing) {
        return (
            <div className="relative">
                <Input
                    type="date"
                    value={editValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm w-35"
                    autoFocus
                />
                {saving && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    return (
        <div
            onClick={startEditing}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span className={cn('text-sm', !value && 'text-muted-foreground')}>
                {value ? formatDate(value) : placeholder}
            </span>
        </div>
    )
})

// =============================================================================
// EDITABLE NUMBER CELL
// =============================================================================

interface EditableNumberCellProps {
    value: number | null
    onSave: (val: number | null) => Promise<unknown>
    min?: number
    max?: number
    placeholder?: string
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditableNumberCell = memo(function EditableNumberCell({
    value,
    onSave,
    min = 1,
    max = 10,
    placeholder = '—',
}: EditableNumberCellProps) {
    const {
        editing,
        editValue,
        saving,
        startEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    } = useEditableCell({
        value,
        onSave,
        formatForEdit: (v) => v?.toString() || '',
        parseFromEdit: (v) => {
            const n = Number.parseInt(v, 10)
            return Number.isNaN(n) ? null : Math.max(min, Math.min(max, n))
        },
    })

    if (editing) {
        return (
            <div className="relative">
                <Input
                    type="number"
                    min={min}
                    max={max}
                    value={editValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm w-16"
                    autoFocus
                />
                {saving && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    return (
        <div
            onClick={startEditing}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span
                className={cn(
                    'text-sm font-medium',
                    value === null && 'text-muted-foreground',
                )}
            >
                {value !== null ? value : placeholder}
            </span>
        </div>
    )
})

// =============================================================================
// EDITABLE PERCENT CELL
// =============================================================================

interface EditablePercentCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
}

/**
 * PERF: Memoized to prevent re-renders when parent state changes
 */
export const EditablePercentCell = memo(function EditablePercentCell({
    value,
    onSave,
}: EditablePercentCellProps) {
    const {
        editing,
        editValue,
        saving,
        startEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    } = useEditableCell({
        value,
        onSave,
        formatForEdit: (v) => v || '',
        parseFromEdit: (v) => v || null,
    })

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm w-20"
                    placeholder="0.00"
                    autoFocus
                />
                {saving && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                )}
            </div>
        )
    }

    const display = value ? `${Number.parseFloat(value).toFixed(2)}%` : '—'

    return (
        <div
            onClick={startEditing}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span
                className={cn(
                    'text-sm font-medium',
                    !value && 'text-muted-foreground',
                )}
            >
                {display}
            </span>
        </div>
    )
})
