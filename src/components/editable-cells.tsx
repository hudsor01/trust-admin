'use client'

/**
 * Editable Cell Components
 *
 * Reusable inline-editable table cell components.
 * All cells support: keyboard navigation (Enter to save, Escape to cancel),
 * loading states, and optimistic updates.
 */

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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

export function EditableTextCell({
    value,
    onSave,
    placeholder = '—',
}: EditableTextCellProps) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(value || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (editValue === (value || '')) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await onSave(editValue || null)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setEditing(false)
                    }}
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
            onClick={() => {
                setEditValue(value || '')
                setEditing(true)
            }}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span className={cn('text-sm', !value && 'text-muted-foreground')}>
                {value || placeholder}
            </span>
        </div>
    )
}

// =============================================================================
// EDITABLE CURRENCY CELL
// =============================================================================

interface EditableCurrencyCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
}

export function EditableCurrencyCell({
    value,
    onSave,
}: EditableCurrencyCellProps) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(value || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (editValue === (value || '')) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await onSave(editValue || null)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setEditing(false)
                    }}
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
            onClick={() => {
                setEditValue(value || '')
                setEditing(true)
            }}
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
}

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

export function EditableSelectCell({
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
}

// =============================================================================
// EDITABLE DATE CELL
// =============================================================================

interface EditableDateCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
    placeholder?: string
}

export function EditableDateCell({
    value,
    onSave,
    placeholder = '—',
}: EditableDateCellProps) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(value ? value.split('T')[0] : '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const newVal = editValue ? new Date(editValue).toISOString() : null
        if (newVal === value) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await onSave(newVal)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <Input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setEditing(false)
                    }}
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
            onClick={() => {
                setEditValue(value ? value.split('T')[0] : '')
                setEditing(true)
            }}
            className="cursor-pointer rounded px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 min-h-7 flex items-center"
        >
            <span className={cn('text-sm', !value && 'text-muted-foreground')}>
                {value ? formatDate(value) : placeholder}
            </span>
        </div>
    )
}

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

export function EditableNumberCell({
    value,
    onSave,
    min = 1,
    max = 10,
    placeholder = '—',
}: EditableNumberCellProps) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(value?.toString() || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const numVal = editValue ? parseInt(editValue, 10) : null
        if (numVal === value) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            const bounded =
                numVal !== null ? Math.max(min, Math.min(max, numVal)) : null
            await onSave(bounded)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <Input
                    type="number"
                    min={min}
                    max={max}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setEditing(false)
                    }}
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
            onClick={() => {
                setEditValue(value?.toString() || '')
                setEditing(true)
            }}
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
}

// =============================================================================
// EDITABLE PERCENT CELL
// =============================================================================

interface EditablePercentCellProps {
    value: string | null
    onSave: (val: string | null) => Promise<unknown>
}

export function EditablePercentCell({
    value,
    onSave,
}: EditablePercentCellProps) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(value || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (editValue === (value || '')) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            await onSave(editValue || null)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="relative">
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setEditing(false)
                    }}
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

    const display = value ? `${parseFloat(value).toFixed(2)}%` : '—'

    return (
        <div
            onClick={() => {
                setEditValue(value || '')
                setEditing(true)
            }}
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
}
