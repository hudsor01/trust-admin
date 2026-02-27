'use client'

import { useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BankAccount, InvestmentAccount } from '@/db/schema'
import { useNeonList, useNeonMutations } from '@/hooks/use-neon-data'
import { useResourceForm } from '@/hooks/use-resource-form'
import {
    bankAccountFormDefaults,
    investmentAccountFormDefaults,
    toDateInput,
} from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { asRecordStatus, asTransferStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { BankAccountDialog } from './_components/BankAccountDialog'
import { BankAccountTable } from './_components/BankAccountTable'
import type { BankFormData, InvestmentFormData } from './_components/constants'
import { InvestmentAccountDialog } from './_components/InvestmentAccountDialog'
import { InvestmentAccountTable } from './_components/InvestmentAccountTable'

const log = logger.create('Accounts')

export default function AccountsPage() {
    const entityId = 1
    const [activeTab, setActiveTab] = useState('bank')

    const { data: bankAccounts = [] } = useNeonList<BankAccount>(
        'bank_account',
        { entity_id: entityId },
    )
    const {
        create: createBankAccountMutation,
        update: updateBankAccountMutation,
        delete: deleteBankAccountMutation,
    } = useNeonMutations<BankAccount>('bank_account')

    const { data: investmentAccounts = [] } = useNeonList<InvestmentAccount>(
        'investment_account',
        { entity_id: entityId },
    )
    const {
        create: createInvestmentAccountMutation,
        update: updateInvestmentAccountMutation,
        delete: deleteInvestmentAccountMutation,
    } = useNeonMutations<InvestmentAccount>('investment_account')

    const updateBankAccount = async (
        id: number,
        data: Partial<BankAccount>,
    ) => {
        await updateBankAccountMutation.mutateAsync({
            id,
            entityId,
            data,
        })
    }

    const updateInvestmentAccount = async (
        id: number,
        data: Partial<InvestmentAccount>,
    ) => {
        await updateInvestmentAccountMutation.mutateAsync({
            id,
            entityId,
            data,
        })
    }

    const [editingBankId, setEditingBankId] = useState<number | null>(null)

    const bankForm = useResourceForm<BankFormData>({
        initialData: bankAccountFormDefaults(),
        onSubmit: async (data) => {
            const payload = {
                entityId,
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
                    entityId,
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
        onSubmit: async (data) => {
            const payload = {
                entityId,
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
                    entityId,
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
                if (pendingDeleteBankId === null) return
                try {
                    await deleteBankAccountMutation.mutateAsync({
                        id: pendingDeleteBankId,
                        entityId,
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
                    entityId,
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Accounts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage financial accounts
                    </p>
                </div>
            </div>

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
