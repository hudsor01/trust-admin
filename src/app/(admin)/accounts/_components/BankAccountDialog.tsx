'use client'

import { NameDescriptionFields } from '@/components/forms/NameDescriptionFields'
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
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { TRANSFER_STATUS } from '@/lib/constants'
import {
    ACCOUNT_STATUS,
    BANK_ACCOUNT_TYPES,
    type BankFormData,
} from './constants'

interface BankAccountDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<BankFormData>['formInstance']
}

export function BankAccountDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: BankAccountDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium mb-3">Identity</h4>
                    <NameDescriptionFields
                        Field={
                            formInstance.Field as unknown as Parameters<
                                typeof NameDescriptionFields
                            >[0]['Field']
                        }
                        idPrefix="bank"
                        namePlaceholder="e.g., Joint Checking"
                    />
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Account Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Institution */}
                        <formInstance.Field name="institution">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-institution">
                                        Institution *
                                    </Label>
                                    <Input
                                        id="bank-institution"
                                        placeholder="e.g., Chase, Wells Fargo"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>

                        {/* Account Type */}
                        <formInstance.Field name="accountType">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-type">
                                        Account Type *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="bank-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BANK_ACCOUNT_TYPES.map((t) => (
                                                <SelectItem
                                                    key={t.value}
                                                    value={t.value}
                                                >
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </formInstance.Field>
                    </div>

                    {/* Account Name */}
                    <formInstance.Field name="accountName">
                        {(field) => (
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="bank-account-name">
                                    Account Name
                                </Label>
                                <Input
                                    id="bank-account-name"
                                    placeholder="e.g., Primary Checking"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Account Number */}
                        <formInstance.Field name="accountNumber">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-number">
                                        Account Number *
                                    </Label>
                                    <Input
                                        id="bank-number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>

                        {/* Routing Number */}
                        <formInstance.Field name="routingNumber">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-routing">
                                        Routing Number
                                    </Label>
                                    <Input
                                        id="bank-routing"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Date of Death Valuation
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {/* DOD Value */}
                        <formInstance.Field name="dodValue">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-dod-value">
                                        DOD Balance
                                    </Label>
                                    <Input
                                        id="bank-dod-value"
                                        placeholder="$"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>

                        {/* DOD Value Date */}
                        <formInstance.Field name="dodValueDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-dod-date">
                                        DOD Value Date
                                    </Label>
                                    <Input
                                        id="bank-dod-date"
                                        type="date"
                                        value={field.state.value || ''}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(
                                                e.target.value || null,
                                            )
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-3">Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Account Status */}
                        <formInstance.Field name="status">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-status">
                                        Account Status *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="bank-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACCOUNT_STATUS.map((s) => (
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

                        {/* Transfer Status */}
                        <formInstance.Field name="transferStatus">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-transfer">
                                        Transfer Status *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="bank-transfer">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRANSFER_STATUS.map((s) => (
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
                    </div>
                </div>

                {/* Notes */}
                <formInstance.Field name="notes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="bank-notes">Notes</Label>
                            <Textarea
                                id="bank-notes"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                rows={3}
                            />
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
