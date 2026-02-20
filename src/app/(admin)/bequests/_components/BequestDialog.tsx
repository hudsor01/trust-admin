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
import { Textarea } from '@/components/ui/textarea'
import { BEQUEST_CATEGORIES } from './BequestTable'

interface Beneficiary {
    id: number
    firstName: string
    lastName: string
}

interface BequestDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    beneficiaries: Beneficiary[]
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
}

export function BequestDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    beneficiaries,
    formInstance,
}: BequestDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Bequest' : 'Add Bequest'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-4">
                {/* Description - Required */}
                <formInstance.Field name="description">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the item (e.g., 'Dog named Bandit', 'Gold wedding ring')"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                rows={2}
                            />
                            {field.state.meta.errors?.[0] && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </formInstance.Field>

                {/* Category */}
                <formInstance.Field name="category">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger id="category" onBlur={field.handleBlur}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BEQUEST_CATEGORIES.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                {/* Beneficiary */}
                <formInstance.Field name="beneficiaryId">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="beneficiary">
                                Beneficiary (if applicable)
                            </Label>
                            <Select
                                value={field.state.value || '__none__'}
                                onValueChange={(v) =>
                                    field.handleChange(v === '__none__' ? '' : v)
                                }
                            >
                                <SelectTrigger id="beneficiary" onBlur={field.handleBlur}>
                                    <SelectValue placeholder="Select beneficiary" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {beneficiaries.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.firstName} {b.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                {/* Recipient Name */}
                <formInstance.Field name="recipientName">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="recipientName">
                                Recipient Name (if not a beneficiary)
                            </Label>
                            <Input
                                id="recipientName"
                                placeholder="Name of recipient"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                            />
                            <p className="text-xs text-muted-foreground">
                                Use this if the recipient is not listed as a beneficiary
                            </p>
                        </div>
                    )}
                </formInstance.Field>

                {/* Date Distributed */}
                <formInstance.Field name="dateDistributed">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="dateDistributed">Date Distributed</Label>
                            <Input
                                id="dateDistributed"
                                type="date"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank if not yet distributed
                            </p>
                        </div>
                    )}
                </formInstance.Field>

                {/* Notes */}
                <formInstance.Field name="notes">
                    {(field: any) => (
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes..."
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
