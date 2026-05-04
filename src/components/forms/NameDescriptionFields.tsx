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

type FieldComponent = (props: {
    name: 'name' | 'description'
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

export function NameDescriptionFields({
    Field,
    idPrefix = 'asset',
    namePlaceholder = 'Short, identifiable label',
    descriptionPlaceholder = 'Optional details (condition, location, history, etc.)',
}: NameDescriptionFieldsProps) {
    const nameId = `${idPrefix}-name`
    const descriptionId = `${idPrefix}-description`
    return (
        <div className="space-y-4">
            <Field name="name">
                {(field) => (
                    <div className="space-y-2">
                        <Label htmlFor={nameId}>Name *</Label>
                        <Input
                            id={nameId}
                            placeholder={namePlaceholder}
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors &&
                            field.state.meta.errors.length > 0 && (
                                <p className="text-sm text-red-500">
                                    {getFieldError(field)}
                                </p>
                            )}
                    </div>
                )}
            </Field>
            <Field name="description">
                {(field) => (
                    <div className="space-y-2">
                        <Label htmlFor={descriptionId}>Description</Label>
                        <Textarea
                            id={descriptionId}
                            placeholder={descriptionPlaceholder}
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            rows={3}
                        />
                        {field.state.meta.errors &&
                            field.state.meta.errors.length > 0 && (
                                <p className="text-sm text-red-500">
                                    {getFieldError(field)}
                                </p>
                            )}
                    </div>
                )}
            </Field>
        </div>
    )
}
