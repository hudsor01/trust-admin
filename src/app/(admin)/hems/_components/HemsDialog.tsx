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
import type { Beneficiary } from '@/db/schema'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { enumToOptions, PAYMENT_METHOD_VALUES } from '@/lib/type-utils'
import { HEMS_CATEGORIES } from './HemsTable'
import type { HemsFormData } from './types'

// Derive from schema - filter to common payment methods
export const PAYMENT_METHODS = enumToOptions(PAYMENT_METHOD_VALUES, (v) =>
    ['CHECK', 'ACH', 'WIRE'].includes(v),
)

interface HemsDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    hemsBeneficiaries: Beneficiary[]
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<HemsFormData>['formInstance']
}

export function HemsDialog({
    isOpen,
    isSubmitting,
    hemsBeneficiaries,
    onOpenChange,
    onSubmit,
    formInstance,
}: HemsDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title="New HEMS Distribution Request"
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-4">
                <formInstance.Field name="beneficiaryId">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Beneficiary *</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger onBlur={field.handleBlur}>
                                    <SelectValue placeholder="Select beneficiary" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hemsBeneficiaries.map((b) => (
                                        <SelectItem
                                            key={b.id}
                                            value={b.id.toString()}
                                        >
                                            {b.firstName} {b.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {field.state.meta.errors?.[0] && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="hemsCategory">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>HEMS Category</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger onBlur={field.handleBlur}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {HEMS_CATEGORIES.map((cat) => (
                                        <SelectItem
                                            key={cat.value}
                                            value={cat.value}
                                        >
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="amount">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input
                                type="text"
                                placeholder="$0.00"
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

                <formInstance.Field name="hemsJustification">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Justification *</Label>
                            <Textarea
                                placeholder="Explain why this distribution qualifies under HEMS..."
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                rows={3}
                            />
                            {field.state.meta.errors?.[0] && (
                                <p className="text-sm text-destructive">
                                    {field.state.meta.errors[0]}
                                </p>
                            )}
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="paymentMethod">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger onBlur={field.handleBlur}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((pm) => (
                                        <SelectItem
                                            key={pm.value}
                                            value={pm.value}
                                        >
                                            {pm.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                <formInstance.Field name="notes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                                placeholder="Optional notes..."
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
