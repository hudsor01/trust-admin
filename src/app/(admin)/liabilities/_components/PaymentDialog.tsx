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
import type { Liability } from '@/db/schema'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { formatCurrency } from '@/utils/formatters'
import {
    ALLOCATION_CLASS,
    LIABILITY_TYPES,
    PAYMENT_METHODS,
    type PaymentFormData,
} from './LiabilityConstants'
import { PaymentImpactPreview } from './PaymentImpactPreview'

interface BankAccount {
    id: number
    institution: string
    accountName: string | null
}

interface PaymentDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    payingLiability: Liability | undefined
    bankAccounts: BankAccount[]
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<PaymentFormData>['formInstance']
}

export function PaymentDialog({
    isOpen,
    isSubmitting,
    payingLiability,
    bankAccounts,
    onOpenChange,
    onSubmit,
    formInstance,
}: PaymentDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title="Record Payment"
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            {payingLiability && (
                <div className="space-y-6 pt-4">
                    {/* Liability Info */}
                    <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-sm text-muted-foreground">
                            Paying
                        </div>
                        <div className="font-medium">
                            {payingLiability.creditor}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {
                                LIABILITY_TYPES.find(
                                    (t) =>
                                        t.value ===
                                        payingLiability.liabilityType,
                                )?.label
                            }
                        </div>
                        <div className="mt-2 flex justify-between">
                            <span className="text-sm text-muted-foreground">
                                Current Balance:
                            </span>
                            <span className="font-semibold">
                                {formatCurrency(payingLiability.currentBalance)}
                            </span>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Payment Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <formInstance.Field name="paymentDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-date">
                                            Payment Date *
                                        </Label>
                                        <Input
                                            id="payment-date"
                                            type="date"
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
                            <formInstance.Field name="amount">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="payment-amount">
                                            Amount *
                                        </Label>
                                        <Input
                                            id="payment-amount"
                                            placeholder="$0.00"
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

                        {/* Bank Account */}
                        <formInstance.Field name="bankAccountId">
                            {(field) => (
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="bank-account">
                                        Bank Account *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="bank-account">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((account) => (
                                                <SelectItem
                                                    key={account.id}
                                                    value={account.id.toString()}
                                                >
                                                    {account.institution} -{' '}
                                                    {account.accountName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </formInstance.Field>

                        {/* Real-time Payment Breakdown Preview */}
                        <PaymentImpactPreview
                            formInstance={formInstance}
                            liability={payingLiability}
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="paymentMethod">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="payment-method">
                                        Payment Method
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="payment-method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map((m) => (
                                                <SelectItem
                                                    key={m.value}
                                                    value={m.value}
                                                >
                                                    {m.label}
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
                        <formInstance.Subscribe<string>
                            selector={(state) => state.values.paymentMethod}
                        >
                            {(paymentMethod: string) =>
                                paymentMethod === 'CHECK' ? (
                                    <formInstance.Field name="checkNumber">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="check-number">
                                                    Check #
                                                </Label>
                                                <Input
                                                    id="check-number"
                                                    placeholder="Check number"
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
                                ) : (
                                    <formInstance.Field name="confirmationNumber">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmation-number">
                                                    Confirmation #
                                                </Label>
                                                <Input
                                                    id="confirmation-number"
                                                    placeholder="Confirmation"
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
                                )
                            }
                        </formInstance.Subscribe>
                    </div>

                    {/* Allocation Class for Trust Accounting */}
                    <formInstance.Field name="allocationClass">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="allocation-class">
                                    Allocation (Texas 116.152)
                                </Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v)}
                                >
                                    <SelectTrigger id="allocation-class">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALLOCATION_CLASS.map((a) => (
                                            <SelectItem
                                                key={a.value}
                                                value={a.value}
                                            >
                                                {a.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Principal reduces trust corpus, Income is
                                    from earnings
                                </p>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Notes */}
                    <formInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="payment-notes">Notes</Label>
                                <Textarea
                                    id="payment-notes"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    rows={2}
                                    placeholder="Optional notes about this payment"
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
            )}
        </ResourceDialog>
    )
}
