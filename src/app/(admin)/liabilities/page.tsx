'use client'

import { Loader2 } from 'lucide-react'
import { useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import type { BulkLiabilityRow } from '@/components/bulk-entry-table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Liability } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asLiabilityType, asRecordStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import {
    defaultFormData,
    defaultPaymentForm,
    hasLoanTermFields,
    isRevolvingType,
    type LiabilityFormData,
    type PaymentFormData,
} from './_components/LiabilityConstants'
import { LiabilityDialog } from './_components/LiabilityDialog'
import { LiabilitySummaryCards } from './_components/LiabilitySummaryCards'
import { LiabilityTable } from './_components/LiabilityTable'
import { PaymentDialog } from './_components/PaymentDialog'

const log = logger.create('Liabilities')

export default function LiabilitiesPage() {
    const utils = trpc.useUtils()

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityIdStr, setEntityIdStr] = useEntityFilter()
    // Convert string entityId from URL to number for API calls
    const selectedEntity = entityIdStr ? Number(entityIdStr) : entities[0]?.id

    const queryEnabled = !!selectedEntity

    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )

    // Optimistic state for instant UI updates on payment recording
    const [optimisticLiabilities, setOptimisticLiability] = useOptimistic(
        liabilities,
        (current, update: { id: number; newBalance: string }) =>
            current.map((l) =>
                l.id === update.id
                    ? { ...l, currentBalance: update.newBalance }
                    : l,
            ),
    )

    // Fetch bank accounts for payment form
    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        { entityId: selectedEntity! },
        { enabled: !!selectedEntity },
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
        onSuccess: (result) => {
            utils.liability.list.invalidate()
            utils.trustAccounting.listPaginated.invalidate()
            toast.success(
                `Payment recorded. Balance: ${formatCurrency(result.liability.currentBalance)}`,
            )
        },
        onError: (error) => toast.error(error.message),
    })
    const bulkCreateMutation = trpc.liability.bulkCreate.useMutation({
        onSuccess: (results) => {
            utils.liability.list.invalidate()
            toast.success(`Created ${results.length} liabilities`)
            setBulkMode(false)
        },
        onError: (error) => toast.error(error.message),
    })

    // Wrapper function to match inline cell API
    const updateLiability = async (id: number, data: Partial<Liability>) => {
        await updateLiabilityMutation.mutateAsync({
            id,
            entityId: selectedEntity!,
            data,
        })
    }

    const [editingLiabilityId, setEditingLiabilityId] = useState<number | null>(
        null,
    )
    const [bulkMode, setBulkMode] = useState(false)

    const liabilityForm = useResourceForm<LiabilityFormData>({
        initialData: defaultFormData(),
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const liabilityType = asLiabilityType(data.liabilityType)
            const payload = {
                entityId: selectedEntity,
                liabilityType,
                creditor: data.creditor,
                description: data.description || null,
                // For revolving credit, original amount isn't meaningful
                originalAmount: isRevolvingType(data.liabilityType)
                    ? data.currentBalance || '0'
                    : data.originalAmount || '0',
                currentBalance: data.currentBalance || '0',
                currentBalanceDate: data.currentBalanceDate || null,
                interestRate: data.interestRate || null,
                monthlyPayment: data.monthlyPayment || null,
                dueDate: isRevolvingType(data.liabilityType)
                    ? null
                    : data.dueDate || null,
                paymentDueDay: parseInt(data.paymentDueDay, 10) || null,
                // Loan term fields (only for mortgages/loans)
                loanTermMonths: hasLoanTermFields(data.liabilityType)
                    ? parseInt(data.loanTermMonths, 10) || null
                    : null,
                loanStartDate: hasLoanTermFields(data.liabilityType)
                    ? data.loanStartDate || null
                    : null,
                escrowMonthly: hasLoanTermFields(data.liabilityType)
                    ? data.escrowMonthly || null
                    : null,
                // Auto-set based on type
                isRevolvingCredit: isRevolvingType(data.liabilityType),
                // allocationClass moved to payment level (per-payment allocation)
                status: asRecordStatus(data.status),
                notes: data.notes || null,
            }
            if (liabilityForm.isEditing && editingLiabilityId) {
                await updateLiabilityMutation.mutateAsync({
                    id: editingLiabilityId,
                    entityId: selectedEntity!,
                    data: payload,
                })
            } else {
                await createLiabilityMutation.mutateAsync(payload)
            }
            setEditingLiabilityId(null)
        },
    })

    const { formInstance: liabilityFormInstance } = liabilityForm

    const [payingLiabilityId, setPayingLiabilityId] = useState<number | null>(
        null,
    )

    const paymentForm = useResourceForm<PaymentFormData>({
        initialData: defaultPaymentForm(),
        onSubmit: async (data) => {
            if (!payingLiabilityId) return

            // Calculate optimistic new balance
            const liability = optimisticLiabilities.find(
                (l) => l.id === payingLiabilityId,
            )
            if (liability) {
                const currentBalance = parseFloat(
                    liability.currentBalance ?? '0',
                )
                const paymentAmount = parseFloat(data.amount)
                const newBalance = Math.max(
                    0,
                    currentBalance - paymentAmount,
                ).toFixed(2)
                // Optimistic update - shows instantly
                setOptimisticLiability({ id: payingLiabilityId, newBalance })
            }

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
                entityId: selectedEntity!,
                liabilityId: payingLiabilityId,
                paymentDate: data.paymentDate,
                amount: data.amount,
                bankAccountId: data.bankAccountId,
                paymentMethod,
                checkNumber: data.checkNumber || undefined,
                allocationClass: data.allocationClass as 'PRINCIPAL' | 'INCOME',
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
            // Loan term fields
            loanTermMonths: l.loanTermMonths?.toString() || '',
            loanStartDate: toDateInput(l.loanStartDate) || null,
            escrowMonthly: l.escrowMonthly?.toString() || '',
            status: l.status,
            notes: l.notes || '',
        })
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this liability?')) return
        try {
            await deleteLiabilityMutation.mutateAsync({
                id,
                entityId: selectedEntity!,
            })
        } catch (err) {
            log.error('Failed to delete liability', { error: err })
        }
    }

    const openPaymentDialog = (l: Liability) => {
        setPayingLiabilityId(l.id)
        // Default to first bank account if available
        const defaultBankAccountId = bankAccounts[0]?.id?.toString() || ''
        paymentForm.handleEdit({
            paymentDate: new Date().toISOString().split('T')[0] ?? '',
            amount: l.monthlyPayment?.toString() || '',
            bankAccountId: defaultBankAccountId,
            paymentMethod: 'CHECK',
            checkNumber: '',
            confirmationNumber: '',
            allocationClass: l.allocationClass || 'PRINCIPAL',
            notes: '',
        })
    }

    const handleBulkSave = async (rows: BulkLiabilityRow[]) => {
        if (!selectedEntity) return
        await bulkCreateMutation.mutateAsync({
            entityId: selectedEntity,
            liabilities: rows,
        })
    }

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalLiabilities = sumStrings(
        optimisticLiabilities.map((l) => l.currentBalance),
    )

    const activeLiabilities = optimisticLiabilities.filter(
        (l) => l.status === 'ACTIVE',
    )
    const totalActive = sumStrings(
        activeLiabilities.map((l) => l.currentBalance),
    )

    const payingLiability = optimisticLiabilities.find(
        (l) => l.id === payingLiabilityId,
    )

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
                    value={selectedEntity?.toString() ?? ''}
                    onValueChange={(val) => setEntityIdStr(val || null)}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedEntity && (
                <>
                    {/* Summary Cards */}
                    <LiabilitySummaryCards
                        totalLiabilities={totalLiabilities}
                        totalActive={totalActive}
                        activeLiabilitiesCount={activeLiabilities.length}
                        totalRecords={optimisticLiabilities.length}
                    />

                    {/* Table + Bulk Entry */}
                    <LiabilityTable
                        liabilities={optimisticLiabilities}
                        isLoading={liabilitiesLoading}
                        bulkMode={bulkMode}
                        bulkCreatePending={bulkCreateMutation.isPending}
                        onBulkModeToggle={() => setBulkMode(!bulkMode)}
                        onAdd={() => liabilityForm.open()}
                        onEdit={handleEditLiability}
                        onDelete={handleDelete}
                        onRecordPayment={openPaymentDialog}
                        onBulkSave={handleBulkSave}
                        onBulkCancel={() => setBulkMode(false)}
                        onUpdateLiability={updateLiability}
                        selectedEntity={selectedEntity}
                    />
                </>
            )}

            {/* Form Dialog */}
            <LiabilityDialog
                isOpen={liabilityForm.isOpen}
                isEditing={liabilityForm.isEditing}
                isSubmitting={liabilityForm.isSubmitting}
                onOpenChange={liabilityForm.close}
                onSubmit={liabilityForm.handleSave}
                formInstance={liabilityFormInstance}
            />

            {/* Payment Dialog */}
            <PaymentDialog
                isOpen={paymentForm.isOpen}
                isSubmitting={paymentForm.isSubmitting}
                payingLiability={payingLiability}
                bankAccounts={bankAccounts}
                onOpenChange={paymentForm.close}
                onSubmit={paymentForm.handleSave}
                formInstance={paymentFormInstance}
            />
        </div>
    )
}
