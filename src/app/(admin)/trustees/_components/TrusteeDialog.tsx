'use client'

import { ResourceDialog } from '@/components/resource-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import type { trusteeFormDefaults } from '@/lib/form-factory'
import { STATUS_OPTIONS } from './TrusteeTable'

interface TrusteeDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    createMode: 'TRUSTEE' | 'ARBITER' | null
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<
        ReturnType<typeof trusteeFormDefaults>
    >['formInstance']
}

export function TrusteeDialog({
    isOpen,
    isEditing,
    isSubmitting,
    createMode,
    onOpenChange,
    onSubmit,
    formInstance,
}: TrusteeDialogProps) {
    const title = isEditing
        ? 'Edit Trustee'
        : createMode === 'ARBITER'
          ? 'Add Arbiter'
          : 'Add Trustee'
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={title}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-4">
                <formInstance.Field name="name">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="Full legal name"
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors?.[0] && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </formInstance.Field>

                {isEditing && (
                    <formInstance.Field name="status">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={field.state.value ?? undefined}
                                    onValueChange={(v) => field.handleChange(v)}
                                >
                                    <SelectTrigger
                                        id="status"
                                        onBlur={field.handleBlur}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((s) => (
                                            <SelectItem
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>
                )}

                <formInstance.Field name="startDate">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value || null)
                                }
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="endDate">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value || null)
                                }
                                onBlur={field.handleBlur}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank if currently serving
                            </p>
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
