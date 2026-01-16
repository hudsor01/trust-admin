'use client'

import { DollarSign, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef, DataTable } from '@/components/data-table'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Liability } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { STATUS_VARIANTS } from '@/lib/constants'
import { toDateInput } from '@/lib/form-factory'
import { trpc } from '@/lib/trpc'
import {
    ALLOCATION_CLASS_VALUES,
    asAllocationClass,
    asLiabilityType,
    asRecordStatus,
    enumToOptions,
    LIABILITY_TYPE_VALUES,
    PAYMENT_METHOD_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'

// Derive options from schema enums (single source of truth)
const LIABILITY_TYPES = enumToOptions(LIABILITY_TYPE_VALUES)
const LIABILITY_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    [
        'ACTIVE',
        'PAST_DUE',
        'COLLECTIONS',
        'PAID_OFF',
        'DISPUTED',
        'WRITTEN_OFF',
    ].includes(v),
)
const ALLOCATION_CLASS = enumToOptions(ALLOCATION_CLASS_VALUES)
const PAYMENT_METHODS = enumToOptions(PAYMENT_METHOD_VALUES)

interface LiabilityFormData {
    liabilityType: string
    creditor: string
    description: string
    originalAmount: string
    currentBalance: string
    currentBalanceDate: string | null
    interestRate: string
    monthlyPayment: string
    dueDate: string | null
    paymentDueDay: string
    allocationClass: string
    status: string
    notes: string
}

const defaultFormData = (): LiabilityFormData => ({
    liabilityType: 'MORTGAGE',
    creditor: '',
    description: '',
    originalAmount: '',
    currentBalance: '',
    currentBalanceDate: null,
    interestRate: '',
    monthlyPayment: '',
    dueDate: null,
    paymentDueDay: '',
    allocationClass: 'PRINCIPAL',
    status: 'ACTIVE',
    notes: '',
})

interface PaymentFormData {
    paymentDate: string
    amount: string
    paymentMethod: string
    checkNumber: string
    confirmationNumber: string
    notes: string
}

const defaultPaymentForm = (): PaymentFormData => {
    const today = new Date().toISOString().split('T')[0]
    return {
        paymentDate: today ?? '',
        amount: '',
        paymentMethod: 'CHECK',
        checkNumber: '',
        confirmationNumber: '',
        notes: '',
    }
}

export default function LiabilitiesPage() {
    const utils = trpc.useUtils()

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId || entities[0]?.id

    const queryEnabled = !!selectedEntity

    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const createLiabilityMutation = trpc.liability.create.useMutation({
        onSuccess: () => {
            utils.liability.list.invalidate()
            toast.success('Liability created')
        },
        onError: (error) => toast.error(error.message),
    })
    const updateLiabilityMutation = trpc.liability.update.useMutation({
        onSuccess: () => {
            utils.liability.list.invalidate()
            toast.success('Liability updated')
        },
        onError: (error) => toast.error(error.message),
    })
    const deleteLiabilityMutation = trpc.liability.delete.useMutation({
        onSuccess: () => {
            utils.liability.list.invalidate()
            toast.success('Liability deleted')
        },
        onError: (error) => toast.error(error.message),
    })
    const recordPaymentMutation = trpc.liability.recordPayment.useMutation({
        onSuccess: () => {
            utils.liability.list.invalidate()
            utils.trustAccounting.listPaginated.invalidate()
            toast.success('Payment recorded')
        },
        onError: (error) => toast.error(error.message),
    })

    // Wrapper function to match inline cell API
    const updateLiability = async (id: string, data: Partial<Liability>) => {
        await updateLiabilityMutation.mutateAsync({ id, data })
    }

    const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(
        null,
    )

    const liabilityForm = useResourceForm<LiabilityFormData>({
        initialData: defaultFormData(),
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity,
                liabilityType: asLiabilityType(data.liabilityType),
                creditor: data.creditor,
                description: data.description || null,
                originalAmount: data.originalAmount || '0',
                currentBalance: data.currentBalance || '0',
                currentBalanceDate: data.currentBalanceDate || null,
                interestRate: data.interestRate || null,
                monthlyPayment: data.monthlyPayment || null,
                dueDate: data.dueDate || null,
                paymentDueDay: parseInt(data.paymentDueDay, 10) || null,
                allocationClass: asAllocationClass(data.allocationClass),
                status: asRecordStatus(data.status),
                notes: data.notes || null,
            }
            if (liabilityForm.isEditing && editingLiabilityId) {
                await updateLiabilityMutation.mutateAsync({
                    id: editingLiabilityId,
                    data: payload,
                })
            } else {
                await createLiabilityMutation.mutateAsync(payload)
            }
            setEditingLiabilityId(null)
        },
    })

    const { formInstance: liabilityFormInstance } = liabilityForm

    const [payingLiabilityId, setPayingLiabilityId] = useState<string | null>(
        null,
    )

    const paymentForm = useResourceForm<PaymentFormData>({
        initialData: defaultPaymentForm(),
        onSubmit: async (data) => {
            if (!payingLiabilityId) return

            // Map CREDIT_CARD to OTHER since tRPC schema doesn't include it
            const paymentMethod =
                data.paymentMethod === 'CREDIT_CARD'
                    ? 'OTHER'
                    : (data.paymentMethod as
                          | 'CHECK'
                          | 'ACH'
                          | 'WIRE'
                          | 'CASH'
                          | 'OTHER')

            await recordPaymentMutation.mutateAsync({
                liabilityId: payingLiabilityId,
                paymentDate: data.paymentDate,
                amount: data.amount,
                paymentMethod,
                checkNumber: data.checkNumber || undefined,
                notes: data.notes || undefined,
            })

            setPayingLiabilityId(null)
        },
    })

    const { formInstance: paymentFormInstance } = paymentForm

    const handleEditLiability = (l: Liability) => {
        setEditingLiabilityId(l.id)
        liabilityForm.handleEdit({
            liabilityType: l.liabilityType,
            creditor: l.creditor,
            description: l.description || '',
            originalAmount: l.originalAmount?.toString() || '',
            currentBalance: l.currentBalance?.toString() || '',
            currentBalanceDate: toDateInput(l.currentBalanceDate) || null,
            interestRate: l.interestRate?.toString() || '',
            monthlyPayment: l.monthlyPayment?.toString() || '',
            dueDate: toDateInput(l.dueDate) || null,
            paymentDueDay: l.paymentDueDay?.toString() || '',
            allocationClass: l.allocationClass || 'PRINCIPAL',
            status: l.status,
            notes: l.notes || '',
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this liability?')) return
        try {
            await deleteLiabilityMutation.mutateAsync(id)
        } catch (err) {
            console.error('Failed to delete liability:', err)
        }
    }

    const openPaymentDialog = (l: Liability) => {
        setPayingLiabilityId(l.id)
        paymentForm.handleEdit({
            paymentDate: new Date().toISOString().split('T')[0] ?? '',
            amount: l.monthlyPayment?.toString() || '',
            paymentMethod: 'CHECK',
            checkNumber: '',
            confirmationNumber: '',
            notes: '',
        })
    }

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalLiabilities = liabilities.reduce(
        (sum, l) => sum + (parseFloat(l.currentBalance || '0') || 0),
        0,
    )

    const activeLiabilities = liabilities.filter((l) => l.status === 'ACTIVE')
    const totalActive = activeLiabilities.reduce(
        (sum, l) => sum + (parseFloat(l.currentBalance || '0') || 0),
        0,
    )

    const liabilityColumns: ColumnDef<Liability>[] = [
        {
            key: 'creditor',
            header: 'Creditor',
            render: (liability) => (
                <EditableTextCell
                    value={liability.creditor}
                    onSave={async (v) =>
                        updateLiability(liability.id, { creditor: v || '' })
                    }
                />
            ),
        },
        {
            key: 'liabilityType',
            header: 'Type',
            align: 'center',
            render: (liability) => {
                const typeLabel =
                    LIABILITY_TYPES.find(
                        (t) => t.value === liability.liabilityType,
                    )?.label || liability.liabilityType
                return (
                    <Badge variant="outline" className="text-xs">
                        {typeLabel}
                    </Badge>
                )
            },
        },
        {
            key: 'originalAmount',
            header: 'Original Amount',
            align: 'right',
            render: (liability) => (
                <EditableCurrencyCell
                    value={liability.originalAmount}
                    onSave={async (v) =>
                        updateLiability(liability.id, {
                            originalAmount: v || '0',
                        })
                    }
                />
            ),
        },
        {
            key: 'currentBalance',
            header: 'Current Balance',
            align: 'right',
            render: (liability) => (
                <EditableCurrencyCell
                    value={liability.currentBalance}
                    onSave={async (v) =>
                        updateLiability(liability.id, {
                            currentBalance: v || '0',
                        })
                    }
                />
            ),
        },
        {
            key: 'monthlyPayment',
            header: 'Monthly Payment',
            align: 'right',
            render: (liability) => (
                <EditableCurrencyCell
                    value={liability.monthlyPayment}
                    onSave={async (v) =>
                        updateLiability(liability.id, { monthlyPayment: v })
                    }
                />
            ),
        },
        {
            key: 'status',
            header: 'Status',
            align: 'center',
            render: (liability) => (
                <EditableSelectCell
                    value={liability.status}
                    options={LIABILITY_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={async (v) =>
                        updateLiability(liability.id, {
                            status: asRecordStatus(v),
                        })
                    }
                />
            ),
        },
        {
            key: 'allocationClass',
            header: 'Allocation',
            align: 'center',
            render: (liability) => (
                <EditableSelectCell
                    value={liability.allocationClass || 'PRINCIPAL'}
                    options={ALLOCATION_CLASS}
                    onSave={async (v) =>
                        updateLiability(liability.id, {
                            allocationClass: asAllocationClass(v),
                        })
                    }
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'center',
            render: (liability) => (
                <div className="flex items-center justify-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openPaymentDialog(liability)}
                                >
                                    <DollarSign className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Record Payment</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        handleEditLiability(liability)
                                    }
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(liability.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Liabilities
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Texas Property Code 113.152(5) - Track trust debts and
                        obligations
                    </p>
                </div>
                <Select
                    value={selectedEntity || undefined}
                    onValueChange={(val) => setEntityId(val || null)}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedEntity && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <DollarSign className="h-4 w-4" />
                                    Total Liabilities
                                </div>
                                <div className="text-2xl font-bold text-destructive">
                                    {formatCurrency(
                                        totalLiabilities.toString(),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">
                                    Active Debts
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(totalActive.toString())}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {activeLiabilities.length} active{' '}
                                    {activeLiabilities.length === 1
                                        ? 'liability'
                                        : 'liabilities'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">
                                    Total Records
                                </div>
                                <div className="text-2xl font-bold">
                                    {liabilities.length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                        <Button onClick={() => liabilityForm.open()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Liability
                        </Button>
                    </div>

                    {/* Table */}
                    {liabilitiesLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : liabilities.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    No liabilities recorded. Click Add to create
                                    one.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DataTable
                            columns={liabilityColumns}
                            data={liabilities}
                        />
                    )}
                </>
            )}

            {/* Form Dialog */}
            <ResourceDialog
                open={liabilityForm.isOpen}
                onOpenChange={liabilityForm.close}
                title={
                    liabilityForm.isEditing ? 'Edit Liability' : 'Add Liability'
                }
                onSubmit={liabilityForm.handleSave}
                isLoading={liabilityForm.isSubmitting}
            >
                <div className="space-y-6 pt-4">
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Liability Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <liabilityFormInstance.Field name="liabilityType">
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
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="creditor">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="creditor">
                                            Creditor *
                                        </Label>
                                        <Input
                                            id="creditor"
                                            placeholder="e.g., Bank of America"
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
                            </liabilityFormInstance.Field>
                        </div>
                        <liabilityFormInstance.Field name="description">
                            {(field) => (
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
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
                        </liabilityFormInstance.Field>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Financial Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <liabilityFormInstance.Field name="originalAmount">
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
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">
                                                {field.state.meta.errors[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="currentBalance">
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
                            </liabilityFormInstance.Field>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <liabilityFormInstance.Field name="interestRate">
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
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="monthlyPayment">
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
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="paymentDueDay">
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
                            </liabilityFormInstance.Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <liabilityFormInstance.Field name="dueDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="due-date">
                                            Maturity/Due Date
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
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">
                                                {field.state.meta.errors[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="currentBalanceDate">
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
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">
                                                {field.state.meta.errors[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </liabilityFormInstance.Field>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Status & Classification
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <liabilityFormInstance.Field name="status">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status *</Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
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
                            </liabilityFormInstance.Field>
                            <liabilityFormInstance.Field name="allocationClass">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="allocation">
                                            Allocation Class (Texas 116.152)
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="allocation">
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
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">
                                                {field.state.meta.errors[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </liabilityFormInstance.Field>
                        </div>
                    </div>

                    <liabilityFormInstance.Field name="notes">
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
                    </liabilityFormInstance.Field>
                </div>
            </ResourceDialog>

            {/* Payment Dialog */}
            <ResourceDialog
                open={paymentForm.isOpen}
                onOpenChange={paymentForm.close}
                title="Record Payment"
                onSubmit={paymentForm.handleSave}
                isLoading={paymentForm.isSubmitting}
            >
                {payingLiabilityId &&
                    (() => {
                        const payingLiability = liabilities.find(
                            (l) => l.id === payingLiabilityId,
                        )
                        if (!payingLiability) return null
                        return (
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
                                            {formatCurrency(
                                                payingLiability.currentBalance,
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
                                        <paymentFormInstance.Field name="paymentDate">
                                            {(field) => (
                                                <div className="space-y-2">
                                                    <Label htmlFor="payment-date">
                                                        Payment Date *
                                                    </Label>
                                                    <Input
                                                        id="payment-date"
                                                        type="date"
                                                        value={
                                                            field.state.value
                                                        }
                                                        onBlur={
                                                            field.handleBlur
                                                        }
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
                                        </paymentFormInstance.Field>
                                        <paymentFormInstance.Field name="amount">
                                            {(field) => (
                                                <div className="space-y-2">
                                                    <Label htmlFor="payment-amount">
                                                        Amount *
                                                    </Label>
                                                    <Input
                                                        id="payment-amount"
                                                        placeholder="$0.00"
                                                        value={
                                                            field.state.value
                                                        }
                                                        onBlur={
                                                            field.handleBlur
                                                        }
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
                                        </paymentFormInstance.Field>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="grid grid-cols-2 gap-4">
                                    <paymentFormInstance.Field name="paymentMethod">
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
                                                        {PAYMENT_METHODS.map(
                                                            (m) => (
                                                                <SelectItem
                                                                    key={
                                                                        m.value
                                                                    }
                                                                    value={
                                                                        m.value
                                                                    }
                                                                >
                                                                    {m.label}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
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
                                    </paymentFormInstance.Field>
                                    <paymentFormInstance.Subscribe<string>
                                        selector={(state) =>
                                            state.values.paymentMethod
                                        }
                                    >
                                        {(paymentMethod) =>
                                            paymentMethod === 'CHECK' ? (
                                                <paymentFormInstance.Field name="checkNumber">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="check-number">
                                                                Check #
                                                            </Label>
                                                            <Input
                                                                id="check-number"
                                                                placeholder="Check number"
                                                                value={
                                                                    field.state
                                                                        .value
                                                                }
                                                                onBlur={
                                                                    field.handleBlur
                                                                }
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            {field.state.meta
                                                                .errors?.[0] && (
                                                                <p className="text-sm text-destructive">
                                                                    {
                                                                        field
                                                                            .state
                                                                            .meta
                                                                            .errors[0]
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </paymentFormInstance.Field>
                                            ) : (
                                                <paymentFormInstance.Field name="confirmationNumber">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="confirmation-number">
                                                                Confirmation #
                                                            </Label>
                                                            <Input
                                                                id="confirmation-number"
                                                                placeholder="Confirmation"
                                                                value={
                                                                    field.state
                                                                        .value
                                                                }
                                                                onBlur={
                                                                    field.handleBlur
                                                                }
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            {field.state.meta
                                                                .errors?.[0] && (
                                                                <p className="text-sm text-destructive">
                                                                    {
                                                                        field
                                                                            .state
                                                                            .meta
                                                                            .errors[0]
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </paymentFormInstance.Field>
                                            )
                                        }
                                    </paymentFormInstance.Subscribe>
                                </div>

                                {/* Notes */}
                                <paymentFormInstance.Field name="notes">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="payment-notes">
                                                Notes
                                            </Label>
                                            <Textarea
                                                id="payment-notes"
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
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
                                </paymentFormInstance.Field>
                            </div>
                        )
                    })()}
            </ResourceDialog>
        </div>
    )
}
