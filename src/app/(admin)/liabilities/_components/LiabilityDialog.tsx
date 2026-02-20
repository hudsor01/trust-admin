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
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import {
    hasLoanTermFields,
    isRevolvingType,
    LIABILITY_STATUS,
    LIABILITY_TYPES,
    type LiabilityFormData,
} from './LiabilityConstants'
import { PaymentPreview } from './PaymentPreview'

interface LiabilityDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<LiabilityFormData>['formInstance']
}

export function LiabilityDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: LiabilityDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Liability' : 'Add Liability'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6 pt-4">
                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Liability Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="liabilityType">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="liability-type">
                                        Liability Type *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="liability-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LIABILITY_TYPES.map((t) => (
                                                <SelectItem
                                                    key={t.value}
                                                    value={t.value}
                                                >
                                                    {t.label}
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
                        <formInstance.Field
                            name="creditor"
                            validators={{
                                onBlur: ({ value }: { value: string }) =>
                                    !value?.trim()
                                        ? 'Creditor is required'
                                        : undefined,
                            }}
                        >
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="creditor">Creditor *</Label>
                                    <Input
                                        id="creditor"
                                        placeholder="e.g., Bank of America"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                    {field.state.meta.errors?.[0] && (
                                        <p className="text-sm text-destructive">
                                            {field.state.meta.errors[0]}
                                        </p>
                                    )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                    <formInstance.Field name="description">
                        {(field) => (
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="e.g., Primary residence mortgage"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                />
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </formInstance.Field>
                </div>

                {/* Financial Details - conditionally show fields based on liability type */}
                <formInstance.Subscribe<string>
                    selector={(state) => state.values.liabilityType}
                >
                    {(liabilityType: string) => (
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Financial Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Original Amount - animated hide for credit cards */}
                                <div
                                    className={`transition-all duration-200 ease-out ${
                                        !isRevolvingType(liabilityType)
                                            ? 'opacity-100 max-h-40 overflow-visible'
                                            : 'opacity-0 max-h-0 overflow-hidden'
                                    }`}
                                >
                                    <formInstance.Field name="originalAmount">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="original-amount">
                                                    Original Amount *
                                                </Label>
                                                <Input
                                                    id="original-amount"
                                                    placeholder="$"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {field.state.meta
                                                    .errors?.[0] && (
                                                    <p className="text-sm text-destructive">
                                                        {
                                                            field.state.meta
                                                                .errors[0]
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </formInstance.Field>
                                </div>

                                <formInstance.Field
                                    name="currentBalance"
                                    validators={{
                                        onBlur: ({
                                            value,
                                        }: {
                                            value: string
                                        }) => {
                                            if (!value?.trim())
                                                return 'Current balance is required'
                                            const num = parseFloat(
                                                value.replace(/[,$]/g, ''),
                                            )
                                            if (Number.isNaN(num))
                                                return 'Enter a valid amount'
                                            if (num < 0)
                                                return 'Balance cannot be negative'
                                            return undefined
                                        },
                                    }}
                                >
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="current-balance">
                                                Current Balance *
                                            </Label>
                                            <Input
                                                id="current-balance"
                                                placeholder="$"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {field.state.meta.errors?.[0] && (
                                                <p className="text-sm text-destructive">
                                                    {field.state.meta.errors[0]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <formInstance.Field
                                    name="interestRate"
                                    validators={{
                                        onBlur: ({
                                            value,
                                        }: {
                                            value: string
                                        }) => {
                                            if (!value?.trim()) return undefined // Optional field
                                            const num = parseFloat(value)
                                            if (Number.isNaN(num))
                                                return 'Enter a valid percentage'
                                            if (num < 0)
                                                return 'Rate cannot be negative'
                                            if (num > 100)
                                                return 'Rate seems unusually high (>100%)'
                                            return undefined
                                        },
                                    }}
                                >
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="interest-rate">
                                                {isRevolvingType(liabilityType)
                                                    ? 'APR (%)'
                                                    : 'Interest Rate (%)'}
                                            </Label>
                                            <Input
                                                id="interest-rate"
                                                placeholder={
                                                    isRevolvingType(
                                                        liabilityType,
                                                    )
                                                        ? 'e.g., 24.99'
                                                        : 'e.g., 4.5'
                                                }
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {field.state.meta.errors?.[0] && (
                                                <p className="text-sm text-destructive">
                                                    {field.state.meta.errors[0]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="monthlyPayment">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="monthly-payment">
                                                {isRevolvingType(liabilityType)
                                                    ? 'Minimum Payment'
                                                    : 'Monthly Payment'}
                                            </Label>
                                            <Input
                                                id="monthly-payment"
                                                placeholder="$"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {field.state.meta.errors?.[0] && (
                                                <p className="text-sm text-destructive">
                                                    {field.state.meta.errors[0]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="paymentDueDay">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="payment-due-day">
                                                Payment Due Day
                                            </Label>
                                            <Input
                                                id="payment-due-day"
                                                type="number"
                                                min="1"
                                                max="31"
                                                placeholder="e.g., 15"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {field.state.meta.errors?.[0] && (
                                                <p className="text-sm text-destructive">
                                                    {field.state.meta.errors[0]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>

                            {/* Loan term fields - animated section for mortgages and loans */}
                            <div
                                className={`mt-4 transition-all duration-200 ease-out ${
                                    hasLoanTermFields(liabilityType)
                                        ? 'opacity-100 max-h-[500px] overflow-visible'
                                        : 'opacity-0 max-h-0 overflow-hidden'
                                }`}
                            >
                                <div className="grid grid-cols-3 gap-4">
                                    <formInstance.Field name="loanTermMonths">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="loan-term">
                                                    Loan Term (months)
                                                </Label>
                                                <Input
                                                    id="loan-term"
                                                    type="number"
                                                    placeholder="e.g., 360"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    360 = 30yr, 180 = 15yr
                                                </p>
                                            </div>
                                        )}
                                    </formInstance.Field>
                                    <formInstance.Field name="loanStartDate">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="loan-start">
                                                    Loan Start Date
                                                </Label>
                                                <Input
                                                    id="loan-start"
                                                    type="date"
                                                    value={
                                                        field.state.value || ''
                                                    }
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value ||
                                                                null,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </formInstance.Field>
                                    <formInstance.Field name="escrowMonthly">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="escrow">
                                                    Monthly Escrow
                                                </Label>
                                                <Input
                                                    id="escrow"
                                                    placeholder="$"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Taxes & insurance
                                                </p>
                                            </div>
                                        )}
                                    </formInstance.Field>
                                </div>
                                {/* Payment Preview - shows estimated monthly payment */}
                                <PaymentPreview formInstance={formInstance} />
                            </div>

                            {/* Dates row - animated maturity field for non-revolving */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                {/* Maturity Date - animated hide for revolving */}
                                <div
                                    className={`transition-all duration-200 ease-out ${
                                        !isRevolvingType(liabilityType)
                                            ? 'opacity-100 max-h-40 overflow-visible'
                                            : 'opacity-0 max-h-0 overflow-hidden'
                                    }`}
                                >
                                    <formInstance.Field name="dueDate">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="due-date">
                                                    Maturity Date
                                                </Label>
                                                <Input
                                                    id="due-date"
                                                    type="date"
                                                    value={
                                                        field.state.value || ''
                                                    }
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value ||
                                                                null,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </formInstance.Field>
                                </div>
                                <formInstance.Field name="currentBalanceDate">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="balance-date">
                                                Balance As Of
                                            </Label>
                                            <Input
                                                id="balance-date"
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
                    )}
                </formInstance.Subscribe>

                <formInstance.Field name="status">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LIABILITY_STATUS.map((s) => (
                                        <SelectItem
                                            key={s.value}
                                            value={s.value}
                                        >
                                            {s.label}
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

                <formInstance.Field name="notes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
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
            </div>
        </ResourceDialog>
    )
}
