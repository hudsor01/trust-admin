'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getFieldError } from '@/lib/form-helpers'

type FieldState = {
    state: {
        value: string
        meta: { errors?: unknown[] }
    }
    handleChange: (value: string) => void
    handleBlur: () => void
}

type FieldValidators = {
    onChange?: (ctx: { value: string }) => string | undefined
    onBlur?: (ctx: { value: string }) => string | undefined
    onSubmit?: (ctx: { value: string }) => string | undefined
}

type FieldComponent = (props: {
    name: 'name' | 'description'
    validators?: FieldValidators
    children: (field: FieldState) => React.ReactNode
}) => React.ReactNode

interface NameDescriptionFieldsProps {
    /** Pass `formInstance.Field` from useResourceForm. The component is
     *  intentionally schema-agnostic — every asset form has `name` (NOT
     *  NULL) + `description` (nullable) at the form-defaults level, so
     *  the same render block works across vehicle / homestead / rental /
     *  bank / investment / insurance / personal-property forms. */
    Field: FieldComponent
    idPrefix?: string
    namePlaceholder?: string
    descriptionPlaceholder?: string
}

/** Domain invariant: every asset's name must be non-empty. Validated on
 *  every keystroke (so the error appears as you type) and on submit (so
 *  the form refuses to send a blank). The server's Zod refinement is the
 *  ultimate gate — this is just inline UX. */
const requiredName = ({ value }: { value: string }): string | undefined =>
    value.trim().length === 0 ? 'Name is required' : undefined

export function NameDescriptionFields({
    Field,
    idPrefix = 'asset',
    namePlaceholder = 'Short, identifiable label',
    descriptionPlaceholder = 'Optional details (condition, location, history, etc.)',
}: NameDescriptionFieldsProps) {
    const nameId = `${idPrefix}-name`
    const nameErrorId = `${nameId}-error`
    const descriptionId = `${idPrefix}-description`
    const descriptionErrorId = `${descriptionId}-error`
    return (
        <div className="space-y-4">
            <Field
                name="name"
                validators={{
                    onChange: requiredName,
                    onSubmit: requiredName,
                }}
            >
                {(field) => {
                    const hasError = Boolean(
                        field.state.meta.errors &&
                            field.state.meta.errors.length > 0,
                    )
                    return (
                        <div className="space-y-2">
                            <Label htmlFor={nameId}>Name *</Label>
                            <Input
                                id={nameId}
                                placeholder={namePlaceholder}
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                aria-invalid={hasError ? true : undefined}
                                aria-describedby={
                                    hasError ? nameErrorId : undefined
                                }
                            />
                            {hasError && (
                                <p
                                    id={nameErrorId}
                                    className="text-sm text-red-500"
                                >
                                    {getFieldError(field)}
                                </p>
                            )}
                        </div>
                    )
                }}
            </Field>
            <Field name="description">
                {(field) => {
                    const hasError = Boolean(
                        field.state.meta.errors &&
                            field.state.meta.errors.length > 0,
                    )
                    return (
                        <div className="space-y-2">
                            <Label htmlFor={descriptionId}>Description</Label>
                            <Textarea
                                id={descriptionId}
                                placeholder={descriptionPlaceholder}
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                rows={3}
                                aria-invalid={hasError ? true : undefined}
                                aria-describedby={
                                    hasError ? descriptionErrorId : undefined
                                }
                            />
                            {hasError && (
                                <p
                                    id={descriptionErrorId}
                                    className="text-sm text-red-500"
                                >
                                    {getFieldError(field)}
                                </p>
                            )}
                        </div>
                    )
                }}
            </Field>
        </div>
    )
}
