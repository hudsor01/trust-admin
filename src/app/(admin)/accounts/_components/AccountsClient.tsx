'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BankAccount, InvestmentAccount } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import {
    BANK_ACCOUNT_WIZARD_STEPS,
    INVESTMENT_ACCOUNT_WIZARD_STEPS,
} from '@/lib/asset-wizard-steps'
import {
    bankAccountFormDefaults,
    investmentAccountFormDefaults,
    toDateInput,
} from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asRecordStatus, asTransferStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { BankAccountDialog } from './BankAccountDialog'
import { BankAccountTable } from './BankAccountTable'
import type { BankFormData, InvestmentFormData } from './constants'
import { InvestmentAccountDialog } from './InvestmentAccountDialog'
import { InvestmentAccountTable } from './InvestmentAccountTable'

const log = logger.create('Accounts')

export function AccountsClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id
    const [activeTab, setActiveTab] = useState('bank')

    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )

    const createBankAccountMutation = trpc.bankAccount.create.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate({ entityId }),
        onError: (error) => toast.error(error.message),
    })
    const updateBankAccountMutation = trpc.bankAccount.update.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate({ entityId }),
        onError: (error) => toast.error(error.message),
    })
    const deleteBankAccountMutation = trpc.bankAccount.delete.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate({ entityId }),
        onError: (error) => toast.error(error.message),
    })

    const { data: investmentAccounts = [] } =
        trpc.investmentAccount.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createInvestmentAccountMutation =
        trpc.investmentAccount.create.useMutation({
            onSuccess: () =>
                utils.investmentAccount.list.invalidate({ entityId }),
            onError: (error) => toast.error(error.message),
        })
    const updateInvestmentAccountMutation =
        trpc.investmentAccount.update.useMutation({
            onSuccess: () =>
                utils.investmentAccount.list.invalidate({ entityId }),
            onError: (error) => toast.error(error.message),
        })
    const deleteInvestmentAccountMutation =
        trpc.investmentAccount.delete.useMutation({
            onSuccess: () =>
                utils.investmentAccount.list.invalidate({ entityId }),
            onError: (error) => toast.error(error.message),
        })

    const updateBankAccount = async (
        id: number,
        data: Partial<BankAccount>,
    ) => {
        await updateBankAccountMutation.mutateAsync({
            id,
            entityId: entityId!,
            data,
        })
    }

    const updateInvestmentAccount = async (
        id: number,
        data: Partial<InvestmentAccount>,
    ) => {
        await updateInvestmentAccountMutation.mutateAsync({
            id,
            entityId: entityId!,
            data,
        })
    }

    const [editingBankId, setEditingBankId] = useState<number | null>(null)

    const bankForm = useResourceForm<BankFormData>({
        initialData: bankAccountFormDefaults(),
        steps: BANK_ACCOUNT_WIZARD_STEPS,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                institution: data.institution,
                accountType: data.accountType,
                accountName: data.accountName,
                accountNumber: data.accountNumber,
                routingNumber: data.routingNumber || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }
            if (bankForm.isEditing && editingBankId) {
                await updateBankAccountMutation.mutateAsync({
                    id: editingBankId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createBankAccountMutation.mutateAsync(payload)
            }
            setEditingBankId(null)
        },
    })

    const [editingInvestmentId, setEditingInvestmentId] = useState<
        number | null
    >(null)

    const investmentForm = useResourceForm<InvestmentFormData>({
        initialData: investmentAccountFormDefaults(),
        steps: INVESTMENT_ACCOUNT_WIZARD_STEPS,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                institution: data.institution,
                accountType: data.accountType,
                accountName: data.accountName,
                accountNumber: data.accountNumber,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                costBasis: data.costBasis || null,
                taxDeferred:
                    data.accountType.includes('IRA') ||
                    data.accountType === 'K401',
                beneficiaryDesignated: false,
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }
            if (investmentForm.isEditing && editingInvestmentId) {
                await updateInvestmentAccountMutation.mutateAsync({
                    id: editingInvestmentId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createInvestmentAccountMutation.mutateAsync(payload)
            }
            setEditingInvestmentId(null)
        },
    })

    const { formInstance: bankFormInstance } = bankForm
    const { formInstance: investmentFormInstance } = investmentForm

    const handleEditBank = (bank: BankAccount) => {
        setEditingBankId(bank.id)
        bankForm.handleEdit({
            name: bank.name,
            description: bank.description || '',
            institution: bank.institution,
            accountType: bank.accountType,
            accountName: bank.accountName || '',
            accountNumber: bank.accountNumber || '',
            routingNumber: bank.routingNumber || '',
            dodValue: bank.dodValue || '',
            dodValueDate: toDateInput(bank.dodValueDate),
            status: bank.status,
            transferStatus: bank.transferStatus,
            notes: bank.notes || '',
        })
    }

    const handleEditInvestment = (investment: InvestmentAccount) => {
        setEditingInvestmentId(investment.id)
        investmentForm.handleEdit({
            name: investment.name,
            description: investment.description || '',
            institution: investment.institution,
            accountType: investment.accountType,
            accountName: investment.accountName || '',
            accountNumber: investment.accountNumber || '',
            dodValue: investment.dodValue || '',
            dodValueDate: toDateInput(investment.dodValueDate),
            costBasis: investment.costBasis || '',
            status: investment.status,
            transferStatus: investment.transferStatus,
            notes: investment.notes || '',
        })
    }

    const [pendingDeleteBankId, setPendingDeleteBankId] = useState<
        number | null
    >(null)
    const [pendingDeleteInvestmentId, setPendingDeleteInvestmentId] = useState<
        number | null
    >(null)

    const { dialogProps: deleteBankDialogProps, confirm: confirmDeleteBank } =
        useConfirmDialog({
            title: 'Delete Bank Account',
            description:
                'Are you sure you want to delete this bank account? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteBankId === null) return
                try {
                    await deleteBankAccountMutation.mutateAsync({
                        id: pendingDeleteBankId,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete bank account', { error: err })
                } finally {
                    setPendingDeleteBankId(null)
                }
            },
        })

    const {
        dialogProps: deleteInvestmentDialogProps,
        confirm: confirmDeleteInvestment,
    } = useConfirmDialog({
        title: 'Delete Investment Account',
        description:
            'Are you sure you want to delete this investment account? This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
        onConfirm: async () => {
            if (pendingDeleteInvestmentId === null) return
            try {
                await deleteInvestmentAccountMutation.mutateAsync({
                    id: pendingDeleteInvestmentId,
                    entityId: entityId!,
                })
            } catch (err) {
                log.error('Failed to delete investment account', { error: err })
            } finally {
                setPendingDeleteInvestmentId(null)
            }
        },
    })

    const handleDeleteBank = (id: number) => {
        setPendingDeleteBankId(id)
        confirmDeleteBank()
    }

    const handleDeleteInvestment = (id: number) => {
        setPendingDeleteInvestmentId(id)
        confirmDeleteInvestment()
    }

    const totalBankValue = sumStrings(bankAccounts.map((a) => a.dodValue))
    const totalInvestmentValue = sumStrings(
        investmentAccounts.map((a) => a.dodValue),
    )

    const accountCount = bankAccounts.length + investmentAccounts.length
    const totalBalance = sumStrings([
        ...bankAccounts.map((a) => a.currentBalance ?? a.dodValue),
        ...investmentAccounts.map((a) => a.dodValue),
    ])
    const kpiData: KpiStripItem[] = [
        { label: 'Account count', value: accountCount },
        { label: 'Total balance', value: formatCurrency(totalBalance) },
        {
            label: 'Bank vs Investment',
            value: `${bankAccounts.length} / ${investmentAccounts.length}`,
        },
        // sparkline deferred until activityCounts query lands
        { label: '30d activity', value: '—', sparklineSeries: undefined },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Accounts"
                description="Bank and investment accounts held by the trust."
            />

            <KpiStrip data={kpiData} />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="bank">
                        Bank Accounts ({bankAccounts.length}) -{' '}
                        {formatCurrency(totalBankValue.toString())}
                    </TabsTrigger>
                    <TabsTrigger value="investment">
                        Investment Accounts ({investmentAccounts.length}) -{' '}
                        {formatCurrency(totalInvestmentValue.toString())}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="bank" className="space-y-4">
                    <BankAccountTable
                        bankAccounts={bankAccounts}
                        onAdd={() => bankForm.open()}
                        onEdit={handleEditBank}
                        onDelete={handleDeleteBank}
                        onUpdate={updateBankAccount}
                        getRowDetail={(account) => (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">
                                    Account detail
                                </p>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <dt className="text-muted-foreground">
                                        Routing number
                                    </dt>
                                    <dd className="font-mono">
                                        {account.routingNumber ?? '—'}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        DOD date
                                    </dt>
                                    <dd>
                                        {account.dodValueDate
                                            ? new Date(
                                                  account.dodValueDate,
                                              ).toLocaleDateString()
                                            : '—'}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Notes
                                    </dt>
                                    <dd>{account.notes ?? '—'}</dd>
                                </dl>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Linked liabilities are not yet wired — the
                                    schema does not currently link a liability
                                    to a bank or investment account (only to a
                                    homestead, rental property, or vehicle).
                                    Tracked as a TODO in plan 23-04 SUMMARY.
                                </p>
                            </div>
                        )}
                    />
                </TabsContent>

                <TabsContent value="investment" className="space-y-4">
                    <InvestmentAccountTable
                        investmentAccounts={investmentAccounts}
                        onAdd={() => investmentForm.open()}
                        onEdit={handleEditInvestment}
                        onDelete={handleDeleteInvestment}
                        onUpdate={updateInvestmentAccount}
                    />
                </TabsContent>
            </Tabs>

            <BankAccountDialog
                isOpen={bankForm.isOpen}
                isEditing={bankForm.isEditing}
                isSubmitting={bankForm.isSubmitting}
                onOpenChange={bankForm.close}
                onSubmit={bankForm.handleSave}
                formInstance={bankFormInstance}
                wizard={bankForm}
            />

            <InvestmentAccountDialog
                isOpen={investmentForm.isOpen}
                isEditing={investmentForm.isEditing}
                isSubmitting={investmentForm.isSubmitting}
                onOpenChange={investmentForm.close}
                onSubmit={investmentForm.handleSave}
                formInstance={investmentFormInstance}
                wizard={investmentForm}
            />

            <ConfirmDialog {...deleteBankDialogProps} />
            <ConfirmDialog {...deleteInvestmentDialogProps} />
        </div>
    )
}
