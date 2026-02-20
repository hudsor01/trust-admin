'use client'

import { AlertCircle } from 'lucide-react'
import { ResourceDialog } from '@/components/resource-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import type { WithdrawalRecord } from '@/db/schema'
import { formatDate } from '@/utils/formatters'
import { PAYMENT_METHODS } from './HemsDialog'

interface WithdrawalDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    selectedWithdrawal: WithdrawalRecord | null
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
}

export function WithdrawalDialog({
    isOpen,
    isSubmitting,
    selectedWithdrawal,
    onOpenChange,
    onSubmit,
    formInstance,
}: WithdrawalDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={
                selectedWithdrawal
                    ? `Process ${selectedWithdrawal.withdrawalType === 'AGE_25' ? 'Age 25' : 'Age 30'} Withdrawal`
                    : 'Process Withdrawal'
            }
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            {selectedWithdrawal && (
                <div className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Processing{' '}
                            {selectedWithdrawal.withdrawalType === 'AGE_25'
                                ? '50%'
                                : '50%'}{' '}
                            withdrawal for beneficiary. Eligible since:{' '}
                            {formatDate(selectedWithdrawal.eligibleDate)}
                        </AlertDescription>
                    </Alert>

                    <formInstance.Field name="amount">
                        {(field: any) => (
                            <div className="space-y-2">
                                <Label>Withdrawal Amount *</Label>
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

                    <formInstance.Field name="paymentMethod">
                        {(field: any) => (
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) =>
                                        field.handleChange(v)
                                    }
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
                        {(field: any) => (
                            <div className="space-y-2">
                                <Label>Notes</Label>
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
            )}
        </ResourceDialog>
    )
}
