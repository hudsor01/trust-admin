'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BankAccount, InvestmentAccount } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
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
import { BankAccountDialog } from './_components/BankAccountDialog'
import { BankAccountTable } from './_components/BankAccountTable'
import type { BankFormData, InvestmentFormData } from './_components/constants'
import { InvestmentAccountDialog } from './_components/InvestmentAccountDialog'
import { InvestmentAccountTable } from './_components/InvestmentAccountTable'

const log = logger.create('Accounts')

export default function AccountsPage() {
    const utils = trpc.useUtils()

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityIdStr, setEntityIdStr] = useEntityFilter()
    const selectedEntity = entityIdStr ? Number(entityIdStr) : entities[0]?.id
    const [activeTab, setActiveTab] = useState('bank')

    const queryEnabled = !!selectedEntity

    // Bank account queries and mutations
    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        { entityId: selectedEntity! },
        { enabled: queryEnabled },
    )
    const createBankAccountMutation = trpc.bankAccount.create.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate(),
    })
    const updateBankAccountMutation = trpc.bankAccount.update.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate(),
    })
    const deleteBankAccountMutation = trpc.bankAccount.delete.useMutation({
        onSuccess: () => utils.bankAccount.list.invalidate(),
    })

    // Investment account queries and mutations
    const { data: investmentAccounts = [] } =
        trpc.investmentAccount.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const createInvestmentAccountMutation =
        trpc.investmentAccount.create.useMutation({
            onSuccess: () => utils.investmentAccount.list.invalidate(),
        })
    const updateInvestmentAccountMutation =
        trpc.investmentAccount.update.useMutation({
            onSuccess: () => utils.investmentAccount.list.invalidate(),
        })
    const deleteInvestmentAccountMutation =
        trpc.investmentAccount.delete.useMutation({
            onSuccess: () => utils.investmentAccount.list.invalidate(),
        })

    // Wrapper functions to match inline cell API
    const updateBankAccount = async (
        id: number,
        data: Partial<BankAccount>,
    ) => {
        if (!selectedEntity) return
        await updateBankAccountMutation.mutateAsync({
            id,
            entityId: selectedEntity,
            data,
        })
    }

    const updateInvestmentAccount = async (
        id: number,
        data: Partial<InvestmentAccount>,
    ) => {
        if (!selectedEntity) return
        await updateInvestmentAccountMutation.mutateAsync({
            id,
            entityId: selectedEntity,
            data,
        })
    }

    // Bank Account Dialog - useResourceForm hook
    const [editingBankId, setEditingBankId] = useState<number | null>(null)

    const bankForm = useResourceForm<BankFormData>({
        initialData: bankAccountFormDefaults(),
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity,
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
                    entityId: selectedEntity,
                    data: payload,
                })
            } else {
                await createBankAccountMutation.mutateAsync(payload)
            }
            setEditingBankId(null)
        },
    })

    // Investment Account Dialog - useResourceForm hook
    const [editingInvestmentId, setEditingInvestmentId] = useState<
        number | null
    >(null)

    const investmentForm = useResourceForm<InvestmentFormData>({
        initialData: investmentAccountFormDefaults(),
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity,
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
                    entityId: selectedEntity,
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

    // Custom edit handlers that transform entity -> form data
    const handleEditBank = (bank: BankAccount) => {
        setEditingBankId(bank.id)
        bankForm.handleEdit({
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
                if (pendingDeleteBankId === null || !selectedEntity) return
                try {
                    await deleteBankAccountMutation.mutateAsync({
                        id: pendingDeleteBankId,
                        entityId: selectedEntity,
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
            if (pendingDeleteInvestmentId === null || !selectedEntity) return
            try {
                await deleteInvestmentAccountMutation.mutateAsync({
                    id: pendingDeleteInvestmentId,
                    entityId: selectedEntity,
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

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalBankValue = sumStrings(bankAccounts.map((a) => a.dodValue))
    const totalInvestmentValue = sumStrings(
        investmentAccounts.map((a) => a.dodValue),
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Accounts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage financial accounts
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
                            selectedEntity={selectedEntity}
                            onAdd={() => bankForm.open()}
                            onEdit={handleEditBank}
                            onDelete={handleDeleteBank}
                            onUpdate={updateBankAccount}
                        />
                    </TabsContent>

                    <TabsContent value="investment" className="space-y-4">
                        <InvestmentAccountTable
                            investmentAccounts={investmentAccounts}
                            selectedEntity={selectedEntity}
                            onAdd={() => investmentForm.open()}
                            onEdit={handleEditInvestment}
                            onDelete={handleDeleteInvestment}
                            onUpdate={updateInvestmentAccount}
                        />
                    </TabsContent>
                </Tabs>
            )}

            <BankAccountDialog
                isOpen={bankForm.isOpen}
                isEditing={bankForm.isEditing}
                isSubmitting={bankForm.isSubmitting}
                onOpenChange={bankForm.close}
                onSubmit={bankForm.handleSave}
                formInstance={bankFormInstance}
            />

            <InvestmentAccountDialog
                isOpen={investmentForm.isOpen}
                isEditing={investmentForm.isEditing}
                isSubmitting={investmentForm.isSubmitting}
                onOpenChange={investmentForm.close}
                onSubmit={investmentForm.handleSave}
                formInstance={investmentFormInstance}
            />

            <ConfirmDialog {...deleteBankDialogProps} />
            <ConfirmDialog {...deleteInvestmentDialogProps} />
        </div>
    )
}
