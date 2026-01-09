import { useForm as useTanStackForm, type FieldApi } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import type { ZodSchema } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/**
 * Create a form with TanStack Form and Zod validation
 *
 * @param options.defaultValues - Initial form values
 * @param options.onSubmit - Submit handler receives validated form data
 * @param options.schema - Optional Zod schema for form-level validation
 *
 * @example
 * ```typescript
 * import { useZodForm } from "@/lib/tanstack-form"
 * import { insertContactSchema } from "@/db/validation"
 *
 * const form = useZodForm({
 *   defaultValues: { name: '', email: '' },
 *   onSubmit: async (data) => {
 *     await createContact(data)
 *   },
 *   schema: insertContactSchema,
 * })
 * ```
 */
export function useZodForm<TData>(options: {
  defaultValues: TData
  onSubmit: (data: TData) => Promise<void>
  schema?: ZodSchema<TData>
}) {
  return useTanStackForm({
    defaultValues: options.defaultValues,
    validatorAdapter: zodValidator(),
    validators: options.schema
      ? {
          onBlur: options.schema, // Use onBlur validation strategy
        }
      : undefined,
    onSubmit: async ({ value }) => {
      await options.onSubmit(value)
    },
  })
}

/**
 * Form field wrapper for text inputs with TanStack Form + Zod validation
 *
 * @param form - TanStack Form instance
 * @param name - Field name (must match form defaultValues key)
 * @param label - Field label displayed above input
 * @param validators - Optional field-level Zod validators
 * @param placeholder - Optional input placeholder
 *
 * @example
 * ```typescript
 * <FormField
 *   form={form}
 *   name="email"
 *   label="Email"
 *   validators={{
 *     onBlur: z.string().email("Invalid email"),
 *   }}
 * />
 * ```
 */
export function FormField<TData>({
  form,
  name,
  label,
  validators,
  placeholder,
}: {
  form: ReturnType<typeof useTanStackForm<TData>>
  name: keyof TData & string
  label: string
  validators?: {
    onBlur?: ZodSchema
  }
  placeholder?: string
}) {
  return (
    <form.Field name={name} validators={validators}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            value={(field.state.value as string) || ""}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
          />
          {field.state.meta.errors && field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </form.Field>
  )
}

/**
 * Form field wrapper for select dropdowns with TanStack Form + Zod validation
 *
 * @param form - TanStack Form instance
 * @param name - Field name (must match form defaultValues key)
 * @param label - Field label displayed above select
 * @param options - Array of { value, label } for select options
 * @param validators - Optional field-level Zod validators
 * @param placeholder - Optional placeholder text
 *
 * @example
 * ```typescript
 * <FormSelectField
 *   form={form}
 *   name="status"
 *   label="Status"
 *   options={[
 *     { value: "ACTIVE", label: "Active" },
 *     { value: "INACTIVE", label: "Inactive" },
 *   ]}
 *   validators={{
 *     onBlur: z.enum(["ACTIVE", "INACTIVE"]),
 *   }}
 * />
 * ```
 */
export function FormSelectField<TData>({
  form,
  name,
  label,
  options,
  validators,
  placeholder,
}: {
  form: ReturnType<typeof useTanStackForm<TData>>
  name: keyof TData & string
  label: string
  options: Array<{ value: string; label: string }>
  validators?: {
    onBlur?: ZodSchema
  }
  placeholder?: string
}) {
  return (
    <form.Field name={name} validators={validators}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Select
            value={(field.state.value as string) || ""}
            onValueChange={(value) => field.handleChange(value)}
          >
            <SelectTrigger id={name} onBlur={field.handleBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.state.meta.errors && field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </form.Field>
  )
}

/**
 * Form field wrapper for textarea inputs with TanStack Form + Zod validation
 *
 * @param form - TanStack Form instance
 * @param name - Field name (must match form defaultValues key)
 * @param label - Field label displayed above textarea
 * @param validators - Optional field-level Zod validators
 * @param placeholder - Optional textarea placeholder
 * @param rows - Optional number of textarea rows (default: 3)
 *
 * @example
 * ```typescript
 * <FormTextareaField
 *   form={form}
 *   name="notes"
 *   label="Notes"
 *   rows={5}
 *   validators={{
 *     onBlur: z.string().max(500, "Notes too long"),
 *   }}
 * />
 * ```
 */
export function FormTextareaField<TData>({
  form,
  name,
  label,
  validators,
  placeholder,
  rows = 3,
}: {
  form: ReturnType<typeof useTanStackForm<TData>>
  name: keyof TData & string
  label: string
  validators?: {
    onBlur?: ZodSchema
  }
  placeholder?: string
  rows?: number
}) {
  return (
    <form.Field name={name} validators={validators}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Textarea
            id={name}
            value={(field.state.value as string) || ""}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            rows={rows}
          />
          {field.state.meta.errors && field.state.meta.errors.length > 0 && (
            <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
          )}
        </div>
      )}
    </form.Field>
  )
}
