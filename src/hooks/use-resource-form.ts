import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

export interface UseResourceFormOptions<T> {
    initialData: T
    onSubmit: (data: T) => Promise<void>
}

/**
 * Hook for managing form state in resource dialogs
 *
 * Encapsulates the common pattern of:
 * - Opening/closing dialog
 * - Tracking editing vs creating mode
 * - Form state management with TanStack Form
 * - Submit handling with loading state
 *
 * TypeScript Note: The return type is inferred rather than explicitly typed.
 * This follows TanStack Form's guidance: "You should never need to pass
 * a generic or use an internal type when leveraging TanStack Form."
 *
 * @param initialData - Default form data for create mode
 * @param onSubmit - Async function called on save (receives form data)
 *
 * @example
 * ```typescript
 * const vehicleForm = useResourceForm({
 *   initialData: { make: '', model: '', year: 2024 },
 *   onSubmit: async (data) => {
 *     await createVehicle(data)
 *   }
 * })
 *
 * // Access form instance for Field components
 * <vehicleForm.formInstance.Field name="make">
 *   {(field) => <Input value={field.state.value} ... />}
 * </vehicleForm.formInstance.Field>
 * ```
 */
export function useResourceForm<T>({
    initialData,
    onSubmit,
}: UseResourceFormOptions<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<T | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // TanStack Form instance - TypeScript infers types from defaultValues
    // The generic T flows through: initialData: T -> defaultValues: T -> value: T
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
        // Always reset form to proper defaults when opening
        // Merge any provided defaults with initialData
        const mergedDefaults = defaults
            ? { ...initialData, ...defaults }
            : initialData
        formInstance.update({
            defaultValues: mergedDefaults,
        })
        formInstance.reset()
        setIsOpen(true)
    }

    const closeDialog = () => {
        setIsOpen(false)
        setEditing(null)
        formInstance.reset()
    }

    const handleEdit = (item: T) => {
        setEditing(item)
        // Update defaultValues then reset - TanStack Form recommended approach
        // See: https://github.com/TanStack/form/discussions/613
        formInstance.update({ defaultValues: item })
        formInstance.reset()
        setIsOpen(true)
    }

    const handleAdd = () => {
        setEditing(null)
        // Reset to initial defaults (not any previously merged defaults)
        formInstance.update({ defaultValues: initialData })
        formInstance.reset()
        setIsOpen(true)
    }

    const handleSave = () => {
        formInstance.handleSubmit()
    }

    // Return type is inferred - no explicit interface needed
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

// Export the inferred return type for consumers who need it
export type UseResourceFormReturn<T> = ReturnType<typeof useResourceForm<T>>
