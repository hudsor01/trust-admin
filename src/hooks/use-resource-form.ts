import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import type { ZodSchema } from "zod"

export interface UseResourceFormOptions<T> {
  initialData: T
  onSubmit: (data: T) => Promise<void>
  schema?: ZodSchema<T> // Optional - kept for backwards compatibility but not used
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
  // biome-ignore lint/suspicious/noExplicitAny: FormApi has 11+ generic parameters, using any allows proper type inference at usage site
  formInstance: any
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
export function useResourceForm<T>({ initialData, onSubmit }: UseResourceFormOptions<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<T>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // TanStack Form instance - let TypeScript infer types from defaultValues
  // This enables contextual typing for Field components
  // Note: Schema validation happens server-side; form uses initialData types
  const formInstance = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        await onSubmit(value as T)
        close()
      } finally {
        setIsSubmitting(false)
      }
    },
  })

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
      formInstance.setFieldValue(key, value as never)
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
