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
import { ROLE_LABELS } from '../../contacts/_components/ContactTable'
import { STATUS_OPTIONS } from './TrusteeTable'

interface TrusteeDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<
        ReturnType<typeof trusteeFormDefaults>
    >['formInstance']
    trustees: { id: number; name: string }[]
    contacts: { id: number; name: string; role: string }[]
    currentTrusteeId?: number
}

export function TrusteeDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    trustees,
    contacts,
    currentTrusteeId,
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

                <formInstance.Field name="order">
                    {(field) => (
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

                <formInstance.Field name="contactId">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="contactId">Linked Contact</Label>
                            <Select
                                value={field.state.value || 'none'}
                                onValueChange={(v) =>
                                    field.handleChange(v === 'none' ? null : v)
                                }
                            >
                                <SelectTrigger
                                    id="contactId"
                                    onBlur={field.handleBlur}
                                >
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {contacts.map((c) => (
                                        <SelectItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name} -{' '}
                                            {ROLE_LABELS[c.role] || c.role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Link to a professional contact record
                            </p>
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="coTrusteeId">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="coTrusteeId">Co-Trustee</Label>
                            <Select
                                value={field.state.value || 'none'}
                                onValueChange={(v) =>
                                    field.handleChange(v === 'none' ? null : v)
                                }
                            >
                                <SelectTrigger
                                    id="coTrusteeId"
                                    onBlur={field.handleBlur}
                                >
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {trustees
                                        .filter(
                                            (t) => t.id !== currentTrusteeId,
                                        )
                                        .map((t) => (
                                            <SelectItem
                                                key={t.id}
                                                value={String(t.id)}
                                            >
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Designate a co-trustee
                            </p>
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
