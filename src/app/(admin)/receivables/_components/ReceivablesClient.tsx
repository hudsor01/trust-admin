'use client'

import { useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import type { NoteReceivable } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { isNegative, subtractMoney, toCents } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asAllocationClass,
    asNoteType,
    asReceivableType,
    asRecordStatus,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import {
    defaultFormData,
    defaultPaymentForm,
    type PaymentFormData,
    type ReceivableFormData,
} from './ReceivableConstants'
import { ReceivableDialog } from './ReceivableDialog'
import { ReceivableKpiStrip } from './ReceivableKpiStrip'
import { ReceivablePaymentDialog } from './ReceivablePaymentDialog'
import { ReceivableTable } from './ReceivableTable'

const log = logger.create('Receivables')

export function ReceivablesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: receivables = [], isLoading: receivablesLoading } =
        trpc.noteReceivable.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const [optimisticReceivables, setOptimisticReceivable] = useOptimistic(
        receivables,
        (current, update: { id: number; newBalance: string }) =>
            current.map((r) =>
                r.id === update.id
                    ? { ...r, currentBalance: update.newBalance }
                    : r,
            ),
    )

    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )

    const createReceivableMutation = trpc.noteReceivable.create.useMutation({
        onSuccess: () => {
            utils.noteReceivable.list.invalidate()
            toast.success('Receivable created')
        },
        onError: (error) => toast.error(error.message),
    })
    const updateReceivableMutation = trpc.noteReceivable.update.useMutation({
        onSuccess: () => {
            utils.noteReceivable.list.invalidate()
            toast.success('Receivable updated')
        },
        onError: (error) => toast.error(error.message),
    })
    const deleteReceivableMutation = trpc.noteReceivable.delete.useMutation({
        onSuccess: () => {
            utils.noteReceivable.list.invalidate()
            toast.success('Receivable deleted')
        },
        onError: (error) => toast.error(error.message),
    })
    const recordPaymentMutation = trpc.noteReceivable.recordPayment.useMutation(
        {
            onSuccess: (result) => {
                utils.noteReceivable.list.invalidate()
                utils.trustAccounting.list.invalidate()
                toast.success(
                    `Payment recorded. Balance: ${formatCurrency(result.receivable.currentBalance)}`,
                )
            },
            onError: (error) => toast.error(error.message),
        },
    )

    const [editingReceivableId, setEditingReceivableId] = useState<
        number | null
    >(null)
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

    const receivableForm = useResourceForm<ReceivableFormData>({
        initialData: defaultFormData(),
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                receivableType: asReceivableType(data.receivableType),
                debtor: data.debtor,
                debtorAddress: data.debtorAddress || null,
                noteType: asNoteType(data.noteType),
                description: data.description || null,
                originalPrincipal: data.originalPrincipal || '0',
                currentBalance: data.currentBalance || '0',
                currentBalanceDate: data.currentBalanceDate || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                interestRate: data.interestRate || null,
                monthlyPayment: data.monthlyPayment || null,
                originationDate: data.originationDate || null,
                dueDate: data.dueDate || null,
                loanTermMonths: parseInt(data.loanTermMonths, 10) || null,
                secured: data.secured,
                collateralDescription: data.collateralDescription || null,
                status: asRecordStatus(data.status),
                allocationClass: asAllocationClass(data.allocationClass),
                collectionNotes: data.collectionNotes || null,
                notes: data.notes || null,
            }
            if (receivableForm.isEditing && editingReceivableId) {
                await updateReceivableMutation.mutateAsync({
                    id: editingReceivableId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createReceivableMutation.mutateAsync(payload)
            }
            setEditingReceivableId(null)
        },
    })

    const { formInstance: receivableFormInstance } = receivableForm

    const [payingReceivableId, setPayingReceivableId] = useState<number | null>(
        null,
    )

    const paymentForm = useResourceForm<PaymentFormData>({
        initialData: defaultPaymentForm(),
        onSubmit: async (data) => {
            if (!payingReceivableId) return

            // When both portions are entered they must reconcile to the amount
            // (mirrors the server superRefine) — fail fast with a clear message.
            if (
                data.principalPortion?.trim() &&
                data.interestPortion?.trim() &&
                toCents(data.principalPortion) +
                    toCents(data.interestPortion) !==
                    toCents(data.amount)
            ) {
                toast.error(
                    'Principal + interest must equal the payment amount',
                )
                return
            }

            const receivable = optimisticReceivables.find(
                (r) => r.id === payingReceivableId,
            )
            if (receivable) {
                // Mirror the server: only the PRINCIPAL portion reduces the
                // balance (interest is income). When a split is supplied we can
                // reproduce it; when neither portion is entered the server
                // auto-calculates, so fall back to the full amount (a transient
                // over-reduction that self-corrects on list.invalidate()).
                const principalReduction = data.principalPortion?.trim()
                    ? data.principalPortion
                    : data.interestPortion?.trim()
                      ? subtractMoney(data.amount, data.interestPortion)
                      : data.amount
                const next = subtractMoney(
                    receivable.currentBalance,
                    principalReduction,
                )
                const newBalance = isNegative(next) ? '0.00' : next
                setOptimisticReceivable({ id: payingReceivableId, newBalance })
            }

            await recordPaymentMutation.mutateAsync({
                entityId: entityId!,
                receivableId: payingReceivableId,
                paymentDate: data.paymentDate,
                amount: data.amount,
                bankAccountId: Number(data.bankAccountId),
                principalPortion: data.principalPortion || undefined,
                interestPortion: data.interestPortion || undefined,
                paymentMethod: data.paymentMethod as
                    | 'CHECK'
                    | 'ACH'
                    | 'WIRE'
                    | 'CASH'
                    | 'OTHER',
                checkNumber: data.checkNumber || undefined,
                confirmationNumber: data.confirmationNumber || undefined,
                notes: data.notes || undefined,
            })

            setPayingReceivableId(null)
        },
    })

    const { formInstance: paymentFormInstance } = paymentForm

    const handleEditReceivable = (r: NoteReceivable) => {
        setEditingReceivableId(r.id)
        receivableForm.handleEdit({
            receivableType: r.receivableType,
            debtor: r.debtor,
            debtorAddress: r.debtorAddress || '',
            noteType: r.noteType,
            description: r.description || '',
            originalPrincipal: r.originalPrincipal?.toString() || '',
            currentBalance: r.currentBalance?.toString() || '',
            currentBalanceDate: toDateInput(r.currentBalanceDate) || null,
            dodValue: r.dodValue?.toString() || '',
            dodValueDate: toDateInput(r.dodValueDate) || null,
            interestRate: r.interestRate?.toString() || '',
            monthlyPayment: r.monthlyPayment?.toString() || '',
            originationDate: toDateInput(r.originationDate) || null,
            dueDate: toDateInput(r.dueDate) || null,
            loanTermMonths: r.loanTermMonths?.toString() || '',
            secured: r.secured,
            collateralDescription: r.collateralDescription || '',
            status: r.status,
            allocationClass: r.allocationClass || 'PRINCIPAL',
            collectionNotes: r.collectionNotes || '',
            notes: r.notes || '',
        })
    }

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Receivable',
            description:
                'Are you sure you want to delete this receivable? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteId === null) return
                try {
                    await deleteReceivableMutation.mutateAsync({
                        id: pendingDeleteId,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete receivable', { error: err })
                } finally {
                    setPendingDeleteId(null)
                }
            },
        })

    const handleDelete = (id: number) => {
        setPendingDeleteId(id)
        confirmDelete()
    }

    const openPaymentDialog = (r: NoteReceivable) => {
        setPayingReceivableId(r.id)
        const defaultBankAccountId = bankAccounts[0]?.id?.toString() || ''
        paymentForm.handleEdit({
            paymentDate: new Date().toISOString().split('T')[0] ?? '',
            amount: r.monthlyPayment?.toString() || '',
            bankAccountId: defaultBankAccountId,
            paymentMethod: 'CHECK',
            principalPortion: '',
            interestPortion: '',
            checkNumber: '',
            confirmationNumber: '',
            notes: '',
        })
    }

    const payingReceivable = optimisticReceivables.find(
        (r) => r.id === payingReceivableId,
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Receivables"
                description="Loans and notes owed to the trust — claims due to the estate (Tex. Estates Code Ch. 309). A receivable's balance adds to net trust value."
            />

            <ReceivableKpiStrip
                receivables={optimisticReceivables}
                isLoading={receivablesLoading}
            />

            <ReceivableTable
                receivables={optimisticReceivables}
                isLoading={receivablesLoading}
                onAdd={() => receivableForm.open()}
                onEdit={handleEditReceivable}
                onDelete={handleDelete}
                onRecordPayment={openPaymentDialog}
            />

            <ReceivableDialog
                isOpen={receivableForm.isOpen}
                isEditing={receivableForm.isEditing}
                isSubmitting={receivableForm.isSubmitting}
                onOpenChange={receivableForm.close}
                onSubmit={receivableForm.handleSave}
                formInstance={receivableFormInstance}
            />

            <ReceivablePaymentDialog
                isOpen={paymentForm.isOpen}
                isSubmitting={paymentForm.isSubmitting}
                payingReceivable={payingReceivable}
                bankAccounts={bankAccounts}
                onOpenChange={paymentForm.close}
                onSubmit={paymentForm.handleSave}
                formInstance={paymentFormInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
