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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import {
    ALLOCATION_CLASS,
    NOTE_TYPES,
    RECEIVABLE_STATUS,
    RECEIVABLE_TYPES,
    type ReceivableFormData,
} from './ReceivableConstants'

/** Minimal beneficiary shape for the optional debtor-link Select. */
interface LinkableBeneficiary {
    id: number
    name: string
}

interface ReceivableDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<ReceivableFormData>['formInstance']
    beneficiaries: LinkableBeneficiary[]
}

export function ReceivableDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    beneficiaries,
}: ReceivableDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Receivable' : 'Add Receivable'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6 pt-4">
                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Receivable Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="receivableType">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="receivable-type">
                                        Receivable Type *
                                    </Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="receivable-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RECEIVABLE_TYPES.map((t) => (
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
                            name="debtor"
                            validators={{
                                onBlur: ({ value }: { value: string }) =>
                                    !value?.trim()
                                        ? 'Debtor is required'
                                        : undefined,
                            }}
                        >
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="debtor">Debtor *</Label>
                                    <Input
                                        id="debtor"
                                        placeholder="e.g., John Smith"
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
                    <formInstance.Field name="debtorAddress">
                        {(field) => (
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="debtor-address">
                                    Debtor Address
                                </Label>
                                <Input
                                    id="debtor-address"
                                    placeholder="Required for the List of Claims, if known"
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
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <formInstance.Field name="noteType">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="note-type">Note Type</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger id="note-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NOTE_TYPES.map((t) => (
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
                        {/* Optional beneficiary link — debtor is also a
                            beneficiary. The "__none__" sentinel maps to ''. */}
                        <formInstance.Field name="beneficiaryId">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="beneficiary">
                                        Linked beneficiary
                                    </Label>
                                    <Select
                                        value={field.state.value || '__none__'}
                                        onValueChange={(v) =>
                                            field.handleChange(
                                                v === '__none__' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="beneficiary">
                                            <SelectValue placeholder="— None —" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                — None —
                                            </SelectItem>
                                            {beneficiaries.map((b) => (
                                                <SelectItem
                                                    key={b.id}
                                                    value={String(b.id)}
                                                >
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    placeholder="e.g., Loan for home down payment"
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

                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Financial Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field
                            name="originalPrincipal"
                            validators={{
                                onBlur: ({ value }: { value: string }) => {
                                    if (!value?.trim())
                                        return 'Original principal is required'
                                    const num = parseFloat(
                                        value.replace(/[,$]/g, ''),
                                    )
                                    if (Number.isNaN(num))
                                        return 'Enter a valid amount'
                                    if (num <= 0)
                                        return 'Principal must be positive'
                                    return undefined
                                },
                            }}
                        >
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="original-principal">
                                        Original Principal *
                                    </Label>
                                    <Input
                                        id="original-principal"
                                        placeholder="$"
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
                        <formInstance.Field
                            name="currentBalance"
                            validators={{
                                onBlur: ({ value }: { value: string }) => {
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
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <formInstance.Field
                            name="interestRate"
                            validators={{
                                onBlur: ({ value }: { value: string }) => {
                                    if (!value?.trim()) return undefined
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
                                        Interest Rate (%)
                                    </Label>
                                    <Input
                                        id="interest-rate"
                                        placeholder="e.g., 4.5"
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
                        <formInstance.Field name="monthlyPayment">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="monthly-payment">
                                        Monthly Payment
                                    </Label>
                                    <Input
                                        id="monthly-payment"
                                        placeholder="$"
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
                        <formInstance.Field name="loanTermMonths">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="loan-term">
                                        Loan Term (months)
                                    </Label>
                                    <Input
                                        id="loan-term"
                                        type="number"
                                        placeholder="e.g., 60"
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
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <formInstance.Field name="originationDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="origination-date">
                                        Origination Date
                                    </Label>
                                    <Input
                                        id="origination-date"
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
                        <formInstance.Field name="dueDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="due-date">
                                        Due Date (maturity)
                                    </Label>
                                    <Input
                                        id="due-date"
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

                <div>
                    <h4 className="text-sm font-medium mb-3">Collateral</h4>
                    <formInstance.Field name="secured">
                        {(field) => (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <Label htmlFor="secured">
                                        Secured claim
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Backed by collateral
                                    </p>
                                </div>
                                <Switch
                                    id="secured"
                                    checked={field.state.value}
                                    onCheckedChange={(checked) =>
                                        field.handleChange(checked)
                                    }
                                />
                            </div>
                        )}
                    </formInstance.Field>
                    <formInstance.Field name="collateralDescription">
                        {(field) => (
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="collateral-description">
                                    Collateral Description
                                </Label>
                                <Input
                                    id="collateral-description"
                                    placeholder="e.g., Second lien on 123 Main St"
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

                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Date-of-Death Valuation
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="dodValue">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="dod-value">DOD Value</Label>
                                    <Input
                                        id="dod-value"
                                        placeholder="$"
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
                        <formInstance.Field name="dodValueDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="dod-value-date">
                                        DOD Value Date
                                    </Label>
                                    <Input
                                        id="dod-value-date"
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

                <div className="grid grid-cols-2 gap-4">
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
                                        {RECEIVABLE_STATUS.map((s) => (
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
                    <formInstance.Field name="allocationClass">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="allocation-class">
                                    Allocation Class
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
                            </div>
                        )}
                    </formInstance.Field>
                </div>

                <formInstance.Field name="collectionNotes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="collection-notes">
                                Collection Notes
                            </Label>
                            <Textarea
                                id="collection-notes"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                rows={3}
                                placeholder="Trustee's duty-to-collect diligence trail"
                            />
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
