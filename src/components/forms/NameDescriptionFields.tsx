'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { getFieldError } from '@/lib/form-helpers'

/**
 * Any asset form that owns a string `name` and a string `description` — the
 * minimal shape `NameDescriptionFields` needs. Constraining the generic to
 * this lets the component take a properly-typed `formInstance` and use its
 * `Field` directly, so callers no longer need an `as unknown as` cast (IN-03).
 */
export interface HasNameDescription {
    name: string
    description: string
}

interface NameDescriptionFieldsProps<T extends HasNameDescription> {
    /** Pass `formInstance` from useResourceForm. The component is
     *  intentionally schema-agnostic — every asset form has `name` (NOT
     *  NULL) + `description` (nullable) at the form-defaults level, so
     *  the same render block works across vehicle / homestead / rental /
     *  bank / investment / insurance / personal-property forms. */
    formInstance: UseResourceFormReturn<T>['formInstance']
    idPrefix?: string
    namePlaceholder?: string
    descriptionPlaceholder?: string
}

/** Domain invariant: every asset's name must be non-empty. Validated on
 *  every keystroke (so the error appears as you type) and on submit (so
 *  the form refuses to send a blank). The server's Zod refinement is the
 *  ultimate gate — this is just inline UX. `value` is typed `unknown` so
 *  the validator slots into TanStack's generic Field over any `T`. */
const requiredName = ({ value }: { value: unknown }): string | undefined =>
    String(value ?? '').trim().length === 0 ? 'Name is required' : undefined

export function NameDescriptionFields<T extends HasNameDescription>({
    formInstance,
    idPrefix = 'asset',
    namePlaceholder = 'Short, identifiable label',
    descriptionPlaceholder = 'Optional details (condition, location, history, etc.)',
}: NameDescriptionFieldsProps<T>) {
    const nameId = `${idPrefix}-name`
    const nameErrorId = `${nameId}-error`
    const descriptionId = `${idPrefix}-description`
    const descriptionErrorId = `${descriptionId}-error`
    // `Field` is TanStack's correctly-typed field component for `T`.
    const Field = formInstance.Field
    return (
        <div className="space-y-4">
            <Field
                name={'name' as never}
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
                                value={String(field.state.value ?? '')}
                                onChange={(e) =>
                                    field.handleChange(e.target.value as never)
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
                                    className="text-sm text-destructive"
                                >
                                    {getFieldError(field)}
                                </p>
                            )}
                        </div>
                    )
                }}
            </Field>
            <Field name={'description' as never}>
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
                                value={String(field.state.value ?? '')}
                                onChange={(e) =>
                                    field.handleChange(e.target.value as never)
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
                                    className="text-sm text-destructive"
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
