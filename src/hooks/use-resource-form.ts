import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

export interface UseResourceFormOptions<T> {
    initialData: T
    onSubmit: (data: T) => Promise<void>
}

/**
 * Dialog + TanStack Form state for CRUD resource dialogs (open/close, create/edit mode, submit).
 *
 * Return type is intentionally inferred per TanStack Form guidance -- avoids
 * passing generics or referencing internal form types.
 */
export function useResourceForm<T>({
    initialData,
    onSubmit,
}: UseResourceFormOptions<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<T | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const formInstance = useForm({
        defaultValues: initialData,
        onSubmit: async ({ value }) => {
            setIsSubmitting(true)
            try {
                await onSubmit(value)
                closeDialog()
            } finally {
                setIsSubmitting(false)
            }
        },
    })

    const openDialog = (defaults?: Partial<T>) => {
        const mergedDefaults = defaults
            ? { ...initialData, ...defaults }
            : initialData
        formInstance.reset(mergedDefaults)
        setIsOpen(true)
    }

    const closeDialog = () => {
        setIsOpen(false)
        setEditing(null)
        formInstance.reset(initialData)
    }

    const handleEdit = (item: T) => {
        setEditing(item)
        formInstance.reset(item)
        setIsOpen(true)
    }

    const handleAdd = () => {
        setEditing(null)
        formInstance.reset(initialData)
        setIsOpen(true)
    }

    const handleSave = () => {
        formInstance.handleSubmit()
    }

    return {
        isOpen,
        open: openDialog,
        close: closeDialog,
        isEditing: editing !== null,
        editing,
        handleEdit,
        handleAdd,
        handleSave,
        isSubmitting,
        formInstance,
    }
}

export type UseResourceFormReturn<T> = ReturnType<typeof useResourceForm<T>>
