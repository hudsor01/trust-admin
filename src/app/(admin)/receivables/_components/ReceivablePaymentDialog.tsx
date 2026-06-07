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
import type { NoteReceivable } from '@/db/schema'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { formatCurrency } from '@/utils/formatters'
import {
    PAYMENT_METHODS,
    type PaymentFormData,
    RECEIVABLE_TYPES,
} from './ReceivableConstants'

interface BankAccount {
    id: number
    institution: string
    accountName: string | null
}

interface ReceivablePaymentDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    payingReceivable: NoteReceivable | undefined
    bankAccounts: BankAccount[]
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<PaymentFormData>['formInstance']
}

export function ReceivablePaymentDialog({
    isOpen,
    isSubmitting,
    payingReceivable,
    bankAccounts,
    onOpenChange,
    onSubmit,
    formInstance,
}: ReceivablePaymentDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title="Record Payment"
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            {payingReceivable && (
                <div className="space-y-6 pt-4">
                    {/* Receivable Info */}
                    <div className="rounded-lg bg-muted/50 p-4">
                        <div className="text-sm text-muted-foreground">
                            Receiving from
                        </div>
                        <div className="font-medium">
                            {payingReceivable.debtor}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {
                                RECEIVABLE_TYPES.find(
                                    (t) =>
                                        t.value ===
                                        payingReceivable.receivableType,
                                )?.label
                            }
                        </div>
                        <div className="mt-2 flex justify-between">
                            <span className="text-sm text-muted-foreground">
                                Current Balance:
                            </span>
                            <span className="font-semibold">
                                {formatCurrency(
                                    payingReceivable.currentBalance,
                                )}
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

                        {/* Bank Account — the account that RECEIVED the funds */}
                        <formInstance.Field name="bankAccountId">
                            {(field) => (
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="bank-account">
                                        Deposit Account *
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

                        {/* Optional principal / interest split */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <formInstance.Field name="principalPortion">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="principal-portion">
                                            Principal Portion
                                        </Label>
                                        <Input
                                            id="principal-portion"
                                            placeholder="$"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                            <formInstance.Field name="interestPortion">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="interest-portion">
                                            Interest Portion
                                        </Label>
                                        <Input
                                            id="interest-portion"
                                            placeholder="$"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Interest is recorded as trust income; principal
                            reduces the outstanding balance. Leave the split
                            blank to auto-calculate.
                        </p>
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
