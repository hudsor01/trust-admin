'use client'

import { useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import type { BulkLiabilityRow } from '@/components/bulk-entry-table'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import type { Liability } from '@/db/schema'
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
} from './LiabilityConstants'
import { LiabilityDialog } from './LiabilityDialog'
import { LiabilitySummaryCards } from './LiabilitySummaryCards'
import { LiabilityTable } from './LiabilityTable'
import { PaymentDialog } from './PaymentDialog'

const log = logger.create('Liabilities')

export function LiabilitiesClient() {
    const utils = trpc.useUtils()
    const entityId = 1

    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery({ entityId })

    const [optimisticLiabilities, setOptimisticLiability] = useOptimistic(
        liabilities,
        (current, update: { id: number; newBalance: string }) =>
            current.map((l) =>
                l.id === update.id
                    ? { ...l, currentBalance: update.newBalance }
                    : l,
            ),
    )

    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery({
        entityId,
    })

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
            utils.trustAccounting.list.invalidate()
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

    const updateLiability = async (id: number, data: Partial<Liability>) => {
        await updateLiabilityMutation.mutateAsync({
            id,
            entityId,
            data,
        })
    }

    const [editingLiabilityId, setEditingLiabilityId] = useState<number | null>(
        null,
    )
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
    const [bulkMode, setBulkMode] = useState(false)

    const liabilityForm = useResourceForm<LiabilityFormData>({
        initialData: defaultFormData(),
        onSubmit: async (data) => {
            const liabilityType = asLiabilityType(data.liabilityType)
            const payload = {
                entityId,
                liabilityType,
                creditor: data.creditor,
                description: data.description || null,
                // For revolving credit, original amount is not meaningful
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
                loanTermMonths: hasLoanTermFields(data.liabilityType)
                    ? parseInt(data.loanTermMonths, 10) || null
                    : null,
                loanStartDate: hasLoanTermFields(data.liabilityType)
                    ? data.loanStartDate || null
                    : null,
                escrowMonthly: hasLoanTermFields(data.liabilityType)
                    ? data.escrowMonthly || null
                    : null,
                isRevolvingCredit: isRevolvingType(data.liabilityType),
                status: asRecordStatus(data.status),
                notes: data.notes || null,
            }
            if (liabilityForm.isEditing && editingLiabilityId) {
                await updateLiabilityMutation.mutateAsync({
                    id: editingLiabilityId,
                    entityId,
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
                setOptimisticLiability({ id: payingLiabilityId, newBalance })
            }

            // Map CREDIT_CARD to OTHER since tRPC schema does not include it
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
                entityId,
                liabilityId: payingLiabilityId,
                paymentDate: data.paymentDate,
                amount: data.amount,
                bankAccountId: data.bankAccountId,
                paymentMethod,
                checkNumber: data.checkNumber || undefined,
                confirmationNumber: data.confirmationNumber || undefined,
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
            loanTermMonths: l.loanTermMonths?.toString() || '',
            loanStartDate: toDateInput(l.loanStartDate) || null,
            escrowMonthly: l.escrowMonthly?.toString() || '',
            status: l.status,
            notes: l.notes || '',
        })
    }

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Liability',
            description:
                'Are you sure you want to delete this liability? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteId === null) return
                try {
                    await deleteLiabilityMutation.mutateAsync({
                        id: pendingDeleteId,
                        entityId,
                    })
                } catch (err) {
                    log.error('Failed to delete liability', { error: err })
                } finally {
                    setPendingDeleteId(null)
                }
            },
        })

    const handleDelete = (id: number) => {
        setPendingDeleteId(id)
        confirmDelete()
    }

    const openPaymentDialog = (l: Liability) => {
        setPayingLiabilityId(l.id)
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
        await bulkCreateMutation.mutateAsync({
            entityId,
            liabilities: rows,
        })
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
            </div>

            <LiabilitySummaryCards
                totalLiabilities={totalLiabilities}
                totalActive={totalActive}
                activeLiabilitiesCount={activeLiabilities.length}
                totalRecords={optimisticLiabilities.length}
            />

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
            />

            <LiabilityDialog
                isOpen={liabilityForm.isOpen}
                isEditing={liabilityForm.isEditing}
                isSubmitting={liabilityForm.isSubmitting}
                onOpenChange={liabilityForm.close}
                onSubmit={liabilityForm.handleSave}
                formInstance={liabilityFormInstance}
            />

            <PaymentDialog
                isOpen={paymentForm.isOpen}
                isSubmitting={paymentForm.isSubmitting}
                payingLiability={payingLiability}
                bankAccounts={bankAccounts}
                onOpenChange={paymentForm.close}
                onSubmit={paymentForm.handleSave}
                formInstance={paymentFormInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
