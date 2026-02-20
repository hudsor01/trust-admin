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
import { STATUS_OPTIONS } from './TrusteeTable'

interface TrusteeDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
}

export function TrusteeDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: TrusteeDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Trustee' : 'Add Trustee'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-4">
                <formInstance.Field name="name">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="Full legal name"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
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

                <formInstance.Field name="status">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={field.state.value ?? undefined}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger id="status" onBlur={field.handleBlur}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="order">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="order">Order</Label>
                            <Input
                                id="order"
                                type="number"
                                min={1}
                                max={10}
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(
                                        parseInt(e.target.value, 10) || 1,
                                    )
                                }
                                onBlur={field.handleBlur}
                            />
                            <p className="text-xs text-muted-foreground">
                                1 = Primary, 2 = First Successor, etc.
                            </p>
                            {field.state.meta.errors?.[0] && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="startDate">
                    {(field: any) => (
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
                    {(field: any) => (
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
