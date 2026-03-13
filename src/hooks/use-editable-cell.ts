'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const log = logger.create('EditableCell')

interface UseEditableCellOptions<T> {
    value: T
    onSave: (value: T) => Promise<unknown>
    /** Convert stored value to string for editing */
    formatForEdit?: (value: T) => string
    /** Convert edited string back to stored type */
    parseFromEdit: (value: string) => T
    /** Validate the edited string before saving. Return an error message to block save, or null to allow. */
    validate?: (editValue: string) => string | null
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

/** Inline-editable cell state: edit mode, value tracking, save/cancel, and Enter/Escape key handling. */
export function useEditableCell<T>(
    options: UseEditableCellOptions<T>,
): UseEditableCellReturn {
    const { value, onSave, formatForEdit, parseFromEdit, validate } = options

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
        const parsed = parseFromEdit(editValue)

        // Skip save if value hasn't changed
        const currentFormatted = formatForEdit
            ? formatForEdit(value)
            : String(value ?? '')
        if (editValue === currentFormatted) {
            setEditing(false)
            return
        }

        // Run validation before persisting (empty strings bypass — clearing a field is always allowed)
        if (validate && editValue) {
            const error = validate(editValue)
            if (error) {
                toast.error(error)
                return
            }
        }

        setSaving(true)
        try {
            await onSave(parsed)
            setEditing(false)
        } catch (e) {
            log.error('Save failed', { error: e })
            toast.error('Failed to save changes')
            Sentry.captureException(e, {
                tags: { component: 'editable-cell' },
            })
        } finally {
            setSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            handleSave()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
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
