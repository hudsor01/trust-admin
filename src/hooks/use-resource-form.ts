import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import type { ZodSchema } from "zod"

export interface UseResourceFormOptions<T> {
  initialData: T
  onSubmit: (data: T) => Promise<void>
  schema?: ZodSchema<T> // Optional Zod schema for validation
}

export interface UseResourceFormReturn<T> {
  isOpen: boolean
  open: () => void
  close: () => void
  form: T
  setForm: (form: T) => void
  isEditing: boolean
  editing: T | null // The item being edited (null if creating)
  handleEdit: (item: T) => void
  handleAdd: () => void
  handleSave: () => Promise<void>
  isSubmitting: boolean
  formInstance: any // TanStack Form instance (type too complex for generic wrapper)
}

/**
 * Hook for managing form state in resource dialogs
 *
 * Encapsulates the common pattern of:
 * - Opening/closing dialog
 * - Tracking editing vs creating mode
 * - Form state management
 * - Submit handling with loading state
 *
 * @param initialData - Default form data for create mode
 * @param onSubmit - Async function called on save (receives form data)
 *
 * @example
 * ```typescript
 * const { isOpen, form, setForm, handleEdit, handleAdd, handleSave } =
 *   useResourceForm<Liability>({
 *     initialData: { creditor: "", amount: "0" },
 *     onSubmit: async (data) => {
 *       if (isEditing) {
 *         await updateLiability(editingId, data)
 *       } else {
 *         await createLiability(data)
 *       }
 *     }
 *   })
 * ```
 */
export function useResourceForm<T>({
  initialData,
  onSubmit,
  schema,
}: UseResourceFormOptions<T>): UseResourceFormReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<T>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // TanStack Form instance
  // Type cast required: TanStack Form's generic constraints are too complex for wrapper hooks
  const formInstance = useForm({
    defaultValues: initialData,
    validators: schema
      ? ({
          onBlur: schema, // onBlur validation strategy
        } as any)
      : undefined,
    onSubmit: async ({ value }: { value: T }) => {
      setIsSubmitting(true)
      try {
        await onSubmit(value)
        close()
      } catch (error) {
        // Error handling delegated to onSubmit (should use toast notifications)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
  }) as any

  const open = () => setIsOpen(true)
  const close = () => {
    setIsOpen(false)
    setEditing(null)
    setForm(initialData)
    formInstance.reset() // Reset TanStack Form
  }

  const handleEdit = (item: T) => {
    setEditing(item)
    setForm(item)
    // Update form instance with item data
    Object.entries(item as Record<string, unknown>).forEach(([key, value]) => {
      formInstance.setFieldValue(key, value)
    })
    setIsOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    setForm(initialData)
    formInstance.reset() // Reset to initialData
    setIsOpen(true)
  }

  const handleSave = async () => {
    // Trigger form submission (validates and calls onSubmit)
    formInstance.handleSubmit()
  }

  return {
    isOpen,
    open,
    close,
    form,
    setForm,
    isEditing: editing !== null,
    editing,
    handleEdit,
    handleAdd,
    handleSave,
    isSubmitting,
    formInstance,
  }
}
