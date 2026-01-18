'use client'

/**
 * FormField Wrapper Component
 *
 * Consolidates the Label + Input + error pattern used with TanStack Form.
 * Reduces ~15 lines per field to ~1 line.
 *
 * @example
 * // Before (15+ lines)
 * <form.Field name="email">
 *   {(field) => (
 *     <div className="space-y-2">
 *       <Label htmlFor="email">Email *</Label>
 *       <Input
 *         id="email"
 *         value={field.state.value || ''}
 *         onChange={(e) => field.handleChange(e.target.value)}
 *         onBlur={field.handleBlur}
 *       />
 *       {field.state.meta.errors?.length > 0 && (
 *         <p className="text-sm text-red-500">{getFieldError(field)}</p>
 *       )}
 *     </div>
 *   )}
 * </form.Field>
 *
 * // After (1 line)
 * <FormField form={form} name="email" label="Email" required />
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getFieldError } from '@/lib/form-helpers'

// =============================================================================
// TYPES
// =============================================================================

interface FormFieldBaseProps {
    /** The TanStack Form instance */
    // biome-ignore lint/suspicious/noExplicitAny: FormApi has complex generics
    form: any
    /** Field name (must match form's field names) */
    name: string
    /** Display label */
    label: string
    /** Show asterisk indicator */
    required?: boolean
    /** Input placeholder */
    placeholder?: string
    /** Additional CSS class */
    className?: string
}

interface TextFieldProps extends FormFieldBaseProps {
    type?: 'text' | 'email' | 'password'
    options?: never
}

interface NumberFieldProps extends FormFieldBaseProps {
    type: 'number'
    min?: number
    max?: number
    options?: never
}

interface DateFieldProps extends FormFieldBaseProps {
    type: 'date'
    options?: never
}

interface TextareaFieldProps extends FormFieldBaseProps {
    type: 'textarea'
    rows?: number
    options?: never
}

interface SelectFieldProps extends FormFieldBaseProps {
    type: 'select'
    options: readonly { value: string; label: string }[]
}

type FormFieldProps =
    | TextFieldProps
    | NumberFieldProps
    | DateFieldProps
    | TextareaFieldProps
    | SelectFieldProps

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Generic form field wrapper that handles Label + Input + error display.
 *
 * Supports: text, email, password, number, date, textarea, select
 *
 * For complex fields (grids, conditional visibility, custom components),
 * use the raw form.Field pattern instead.
 */
export function FormField({
    form,
    name,
    label,
    required,
    type = 'text',
    placeholder,
    className,
    ...props
}: FormFieldProps) {
    return (
        <form.Field name={name}>
            {(field: {
                state: {
                    value: unknown
                    meta: { errors?: unknown[] }
                }
                handleChange: (value: unknown) => void
                handleBlur: () => void
            }) => (
                <div className={className ?? 'space-y-2'}>
                    <Label htmlFor={name}>
                        {label}
                        {required && ' *'}
                    </Label>

                    {type === 'select' &&
                    'options' in props &&
                    props.options ? (
                        <Select
                            value={(field.state.value as string) || ''}
                            onValueChange={field.handleChange}
                        >
                            <SelectTrigger id={name} onBlur={field.handleBlur}>
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {props.options.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : type === 'textarea' ? (
                        <Textarea
                            id={name}
                            value={(field.state.value as string) || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder={placeholder}
                            rows={'rows' in props ? props.rows : 3}
                        />
                    ) : type === 'number' ? (
                        <Input
                            id={name}
                            type="number"
                            min={'min' in props ? props.min : undefined}
                            max={'max' in props ? props.max : undefined}
                            value={
                                field.state.value != null
                                    ? String(field.state.value)
                                    : ''
                            }
                            onChange={(e) => {
                                const val = e.target.value
                                if (val === '') {
                                    field.handleChange(null)
                                } else {
                                    const num = Number.parseInt(val, 10)
                                    field.handleChange(
                                        Number.isNaN(num) ? null : num,
                                    )
                                }
                            }}
                            onBlur={field.handleBlur}
                            placeholder={placeholder}
                        />
                    ) : type === 'date' ? (
                        <Input
                            id={name}
                            type="date"
                            value={(field.state.value as string) || ''}
                            onChange={(e) =>
                                field.handleChange(e.target.value || null)
                            }
                            onBlur={field.handleBlur}
                        />
                    ) : (
                        <Input
                            id={name}
                            type={type}
                            value={(field.state.value as string) || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder={placeholder}
                        />
                    )}

                    {field.state.meta.errors &&
                        field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-red-500">
                                {getFieldError(field)}
                            </p>
                        )}
                </div>
            )}
        </form.Field>
    )
}

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

interface CurrencyFieldProps extends FormFieldBaseProps {
    options?: never
}

/**
 * Currency input field - displays $ placeholder and handles string values
 */
export function CurrencyField({
    form,
    name,
    label,
    required,
    placeholder = '$',
    className,
}: CurrencyFieldProps) {
    return (
        <form.Field name={name}>
            {(field: {
                state: {
                    value: unknown
                    meta: { errors?: unknown[] }
                }
                handleChange: (value: unknown) => void
                handleBlur: () => void
            }) => (
                <div className={className ?? 'space-y-2'}>
                    <Label htmlFor={name}>
                        {label}
                        {required && ' *'}
                    </Label>
                    <Input
                        id={name}
                        value={(field.state.value as string) || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={placeholder}
                    />
                    {field.state.meta.errors &&
                        field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-red-500">
                                {getFieldError(field)}
                            </p>
                        )}
                </div>
            )}
        </form.Field>
    )
}
