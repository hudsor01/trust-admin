'use client'

import { useState } from 'react'

interface UseEditableCellOptions<T> {
    value: T
    onSave: (value: T) => Promise<unknown>
    /** Convert stored value to string for editing */
    formatForEdit?: (value: T) => string
    /** Convert edited string back to stored type */
    parseFromEdit?: (value: string) => T
}

interface UseEditableCellReturn {
    editing: boolean
    editValue: string
    saving: boolean
    startEditing: () => void
    cancelEditing: () => void
    handleChange: (value: string) => void
    handleSave: () => Promise<void>
    handleKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * Hook for managing inline-editable cell state.
 *
 * Encapsulates the common editing/saving state pattern:
 * - editing: whether cell is in edit mode
 * - editValue: current value in the input
 * - saving: whether save is in progress
 *
 * Provides handlers for:
 * - startEditing: enter edit mode
 * - cancelEditing: exit edit mode without saving
 * - handleChange: update editValue
 * - handleSave: save and exit edit mode
 * - handleKeyDown: Enter saves, Escape cancels
 *
 * @example
 * const { editing, editValue, saving, startEditing, handleChange, handleSave, handleKeyDown } =
 *   useEditableCell({
 *     value,
 *     onSave,
 *     formatForEdit: (v) => v || '',
 *     parseFromEdit: (v) => v || null,
 *   })
 */
export function useEditableCell<T>(
    options: UseEditableCellOptions<T>,
): UseEditableCellReturn {
    const { value, onSave, formatForEdit, parseFromEdit } = options

    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)

    const startEditing = () => {
        const formatted = formatForEdit
            ? formatForEdit(value)
            : String(value ?? '')
        setEditValue(formatted)
        setEditing(true)
    }

    const cancelEditing = () => {
        setEditing(false)
    }

    const handleChange = (v: string) => {
        setEditValue(v)
    }

    const handleSave = async () => {
        const parsed = parseFromEdit
            ? parseFromEdit(editValue)
            : (editValue as unknown as T)

        // Check if value changed (compare formatted versions for consistency)
        const currentFormatted = formatForEdit
            ? formatForEdit(value)
            : String(value ?? '')
        if (editValue === currentFormatted) {
            setEditing(false)
            return
        }

        setSaving(true)
        try {
            await onSave(parsed)
            setEditing(false)
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        }
        if (e.key === 'Escape') {
            cancelEditing()
        }
    }

    return {
        editing,
        editValue,
        saving,
        startEditing,
        cancelEditing,
        handleChange,
        handleSave,
        handleKeyDown,
    }
}
