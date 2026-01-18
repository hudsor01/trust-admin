import type { ChangeEvent } from 'react'
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
import type { AssetTypeConfig, FormField } from '@/lib/public-form-config'

interface DynamicFormFieldsProps {
    config: AssetTypeConfig
    values: Record<string, string>
    onChange: (name: string, value: string) => void
}

export function DynamicFormFields({
    config,
    values,
    onChange,
}: DynamicFormFieldsProps) {
    const renderField = (field: FormField) => {
        const value = values[field.name] || ''

        const commonProps = {
            id: field.name,
            value,
            onChange: (
                e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => onChange(field.name, e.target.value),
            placeholder: field.placeholder,
        }

        return (
            <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                    {field.label}{' '}
                    {field.required && (
                        <span className="text-destructive">*</span>
                    )}
                </Label>

                {field.type === 'textarea' && (
                    <Textarea {...commonProps} rows={3} />
                )}

                {field.type === 'text' && (
                    <Input {...commonProps} type="text" />
                )}

                {field.type === 'number' && (
                    <Input {...commonProps} type="number" step="0.01" />
                )}

                {field.type === 'date' && (
                    <Input {...commonProps} type="date" />
                )}

                {field.type === 'select' && field.options && (
                    <Select
                        value={value}
                        onValueChange={(val) => onChange(field.name, val)}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={field.placeholder || 'Select...'}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {field.description && (
                    <p className="text-xs text-muted-foreground">
                        {field.description}
                    </p>
                )}
            </div>
        )
    }

    return <div className="space-y-4">{config.fields.map(renderField)}</div>
}
