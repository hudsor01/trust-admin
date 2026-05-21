'use client'

import { useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import type { BulkLiabilityRow } from '@/components/bulk-entry-table'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import type { Liability } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { isNegative, subtractMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asLiabilityType, asRecordStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { DebtToEquityDonut } from './DebtToEquityDonut'
import {
    defaultFormData,
    defaultPaymentForm,
    hasLoanTermFields,
    isRevolvingType,
    type LiabilityFormData,
    type PaymentFormData,
} from './LiabilityConstants'
import { LiabilityDialog } from './LiabilityDialog'
import { LiabilityGantt } from './LiabilityGantt'
import { LiabilityKpiStrip } from './LiabilityKpiStrip'
import { LiabilityTable } from './LiabilityTable'
import { PaymentDialog } from './PaymentDialog'

const log = logger.create('Liabilities')

export function LiabilitiesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const [optimisticLiabilities, setOptimisticLiability] = useOptimistic(
        liabilities,
        (current, update: { id: number; newBalance: string }) =>
            current.map((l) =>
                l.id === update.id
                    ? { ...l, currentBalance: update.newBalance }
                    : l,
            ),
    )

    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )

    const { data: investmentAccounts = [] } =
        trpc.investmentAccount.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    // Aggregate asset values for the DebtToEquity donut (single round-trip via
    // dashboard.summary — already cached if dashboard was visited).
    const { data: dashboardSummary } = trpc.dashboard.summary.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
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
            entityId: entityId!,
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
                entityId: entityId!,
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
                bankAccountId: data.bankAccountId
                    ? Number(data.bankAccountId)
                    : null,
                investmentAccountId: data.investmentAccountId
                    ? Number(data.investmentAccountId)
                    : null,
                status: asRecordStatus(data.status),
                notes: data.notes || null,
            }
            if (liabilityForm.isEditing && editingLiabilityId) {
                await updateLiabilityMutation.mutateAsync({
                    id: editingLiabilityId,
                    entityId: entityId!,
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
                // Cent-level subtraction (see src/lib/money.ts) keeps the
                // optimistic value consistent with the server's cent math;
                // clamp to '0.00' so an overpayment never shows negative.
                const next = subtractMoney(
                    liability.currentBalance,
                    data.amount,
                )
                const newBalance = isNegative(next) ? '0.00' : next
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
                entityId: entityId!,
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
            bankAccountId: l.bankAccountId ? String(l.bankAccountId) : '',
            investmentAccountId: l.investmentAccountId
                ? String(l.investmentAccountId)
                : '',
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
                        entityId: entityId!,
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
            entityId: entityId!,
            liabilities: rows,
        })
    }

    // Sequential (NOT Promise.all) bulk delete: a mid-batch failure leaves a
    // known committed set and an exact failure count to report.
    const onBulkDelete = async (rows: Liability[]) => {
        let failed = 0
        for (const row of rows) {
            try {
                await deleteLiabilityMutation.mutateAsync({
                    id: row.id,
                    entityId: entityId!,
                })
            } catch (err) {
                failed++
                log.error('Bulk delete failed', { id: row.id, error: err })
            }
        }
        if (failed > 0) {
            toast.error(
                `Failed to delete ${failed} of ${rows.length} liabilities`,
            )
        } else {
            toast.success(`Deleted ${rows.length} liabilities`)
        }
    }

    const totalLiabilities = sumStrings(
        optimisticLiabilities.map((l) => l.currentBalance),
    )

    const payingLiability = optimisticLiabilities.find(
        (l) => l.id === payingLiabilityId,
    )

    // Total asset value across all asset types — bankAccount + investmentAccount
    // use `currentBalance`; homestead / rentalProperty / vehicle / personalProperty
    // use `dodValue`; insurancePolicy uses `coverageAmount`. Equity = assets - debt.
    const totalAssets = sumStrings([
        ...(dashboardSummary?.bankAccounts ?? []).map((a) => a.currentBalance),
        ...(dashboardSummary?.investmentAccounts ?? []).map(
            (a) => a.currentBalance,
        ),
        ...(dashboardSummary?.homesteads ?? []).map((a) => a.dodValue),
        ...(dashboardSummary?.rentalProperties ?? []).map((a) => a.dodValue),
        ...(dashboardSummary?.vehicles ?? []).map((a) => a.dodValue),
        ...(dashboardSummary?.personalProperties ?? []).map((a) => a.dodValue),
        ...(dashboardSummary?.insurancePolicies ?? []).map(
            (a) => a.coverageAmount,
        ),
    ])
    const totalEquity = subtractMoney(totalAssets, totalLiabilities)

    return (
        <div className="space-y-6">
            <PageHeader
                title="Liabilities"
                description="Loans, mortgages, and lines of credit secured by trust assets. Texas Property Code 113.152(5)."
            />

            <LiabilityKpiStrip
                liabilities={optimisticLiabilities}
                isLoading={liabilitiesLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {entityId !== undefined && (
                        <LiabilityGantt entityId={entityId} />
                    )}
                </div>
                <div className="lg:col-span-1">
                    <DebtToEquityDonut
                        totalDebt={totalLiabilities}
                        totalEquity={totalEquity}
                        isLoading={liabilitiesLoading}
                    />
                </div>
            </div>

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
                onBulkDelete={onBulkDelete}
                onUpdateLiability={updateLiability}
            />

            <LiabilityDialog
                isOpen={liabilityForm.isOpen}
                isEditing={liabilityForm.isEditing}
                isSubmitting={liabilityForm.isSubmitting}
                onOpenChange={liabilityForm.close}
                onSubmit={liabilityForm.handleSave}
                formInstance={liabilityFormInstance}
                bankAccounts={bankAccounts}
                investmentAccounts={investmentAccounts}
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
