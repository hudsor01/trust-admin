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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import {
    type AccountingFormData,
    EXPENSE_TYPES,
    INCOME_TYPES,
} from './accounting-constants'

interface BankAccount {
    id: number
    institution: string
    accountName: string | null
}

interface AccountingDialogProps {
    open: boolean
    isEditing: boolean
    isLoading: boolean
    bankAccounts: BankAccount[]
    formInstance: UseResourceFormReturn<AccountingFormData>['formInstance']
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
}

export function AccountingDialog({
    open,
    isEditing,
    isLoading,
    bankAccounts,
    formInstance,
    onOpenChange,
    onSubmit,
}: AccountingDialogProps) {
    return (
        <ResourceDialog
            open={open}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Entry' : 'Add Entry'}
            onSubmit={onSubmit}
            isLoading={isLoading}
        >
            <div className="space-y-4">
                {/* Date */}
                <formInstance.Field name="accountingDate">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* Entry Type */}
                <formInstance.Field name="entryType">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="entryType">Entry Type</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(v) =>
                                    field.handleChange(
                                        v as 'INCOME' | 'EXPENSE',
                                    )
                                }
                            >
                                <SelectTrigger id="entryType">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INCOME">
                                        Income
                                    </SelectItem>
                                    <SelectItem value="EXPENSE">
                                        Expense
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                {/* Conditional Category Selection */}
                <formInstance.Subscribe<string>
                    selector={(state) => state.values.entryType}
                >
                    {(entryType) =>
                        entryType === 'INCOME' ? (
                            <formInstance.Field name="incomeType">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="incomeType">
                                            Income Category
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="incomeType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INCOME_TYPES.map((t) => (
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
                        ) : (
                            <formInstance.Field name="expenseType">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="expenseType">
                                            Expense Category
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="expenseType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EXPENSE_TYPES.map((t) => (
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
                        )
                    }
                </formInstance.Subscribe>

                {/* Amount */}
                <formInstance.Field name="amount">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                placeholder="$0.00"
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* Bank Account */}
                <formInstance.Field name="bankAccountId">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="bankAccountId">Bank Account</Label>
                            <Select
                                value={field.state.value}
                                onValueChange={(val) => field.handleChange(val)}
                            >
                                <SelectTrigger id="bankAccountId">
                                    <SelectValue placeholder="Select bank account" />
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

                {/* Description */}
                <formInstance.Field name="description">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                placeholder="Enter description..."
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* Reference Number */}
                <formInstance.Field name="checkNumber">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="reference">Reference Number</Label>
                            <Input
                                id="reference"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                placeholder="Check #, invoice #, etc."
                            />
                        </div>
                    )}
                </formInstance.Field>

                <Separator />

                {/* isPrincipal Switch */}
                <formInstance.Field name="isPrincipal">
                    {(field) => (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="isPrincipal">
                                    Principal (not income)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Mark if this is a return of principal, not
                                    taxable income
                                </p>
                            </div>
                            <Switch
                                id="isPrincipal"
                                checked={field.state.value}
                                onCheckedChange={(checked) =>
                                    field.handleChange(checked)
                                }
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* taxDeductible Switch (conditional) */}
                <formInstance.Subscribe<string>
                    selector={(state) => state.values.entryType}
                >
                    {(entryType) =>
                        entryType === 'EXPENSE' && (
                            <formInstance.Field name="taxDeductible">
                                {(field) => (
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="taxDeductible">
                                                Tax Deductible
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Mark if this expense is
                                                deductible on Form 1041
                                            </p>
                                        </div>
                                        <Switch
                                            id="taxDeductible"
                                            checked={field.state.value}
                                            onCheckedChange={(checked) =>
                                                field.handleChange(checked)
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                        )
                    }
                </formInstance.Subscribe>
            </div>
        </ResourceDialog>
    )
}
