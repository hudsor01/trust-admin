'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { BankAccount, InvestmentAccount } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import {
    bankAccountFormDefaults,
    investmentAccountFormDefaults,
    toDateInput,
} from '@/lib/form-factory'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asRecordStatus, asTransferStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'

const BANK_ACCOUNT_TYPES = [
    { value: 'CHECKING', label: 'Checking' },
    { value: 'SAVINGS', label: 'Savings' },
    { value: 'CD', label: 'Certificate of Deposit' },
    { value: 'MONEY_MARKET', label: 'Money Market' },
    { value: 'BUSINESS_CHECKING', label: 'Business Checking' },
    { value: 'BUSINESS_SAVINGS', label: 'Business Savings' },
]

const INVESTMENT_ACCOUNT_TYPES = [
    { value: 'BROKERAGE', label: 'Brokerage' },
    { value: 'IRA_TRADITIONAL', label: 'Traditional IRA' },
    { value: 'IRA_ROTH', label: 'Roth IRA' },
    { value: 'K401', label: '401(k)' },
    { value: 'ANNUITY', label: 'Annuity' },
    { value: 'HSA', label: 'HSA' },
    { value: 'FIVE29', label: '529 Plan' },
    { value: 'OTHER', label: 'Other' },
]

const ACCOUNT_STATUS = [
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'FROZEN', label: 'Frozen' },
]

interface BankFormData {
    institution: string
    accountType: string
    accountName: string
    accountNumber: string
    routingNumber: string
    dodValue: string
    dodValueDate: string | null
    status: string
    transferStatus: string
    notes: string
}

interface InvestmentFormData {
    institution: string
    accountType: string
    accountName: string
    accountNumber: string
    dodValue: string
    dodValueDate: string | null
    costBasis: string
    status: string
    transferStatus: string
    notes: string
}

function maskAccountNumber(num: string | null): string {
    if (!num) return '—'
    if (num.length <= 4) return num
    return `****${num.slice(-4)}`
}

// Bank Accounts column configuration
const createBankAccountColumns = (
    updateBankAccount: (
        id: number,
        data: Partial<BankAccount>,
    ) => Promise<void>,
    handleEditBank: (account: BankAccount) => void,
    handleDeleteBank: (id: number) => void,
): ColumnDef<BankAccount>[] => [
    {
        accessorKey: 'institution',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Institution" />
        ),
        cell: ({ row }) => (
            <EditableTextCell
                value={row.original.institution}
                onSave={async (val) => {
                    await updateBankAccount(row.original.id, {
                        institution: val as string,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'accountName',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Account Name" />
        ),
        cell: ({ row }) => (
            <EditableTextCell
                value={row.original.accountName}
                onSave={async (val) => {
                    await updateBankAccount(row.original.id, {
                        accountName: val,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'accountType',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
            <Badge variant="secondary" className="font-normal">
                {
                    BANK_ACCOUNT_TYPES.find(
                        (t) => t.value === row.original.accountType,
                    )?.label
                }
            </Badge>
        ),
    },
    {
        accessorKey: 'accountNumber',
        header: 'Account #',
        cell: ({ row }) => (
            <code className="text-xs">
                {maskAccountNumber(row.original.accountNumber || '')}
            </code>
        ),
    },
    {
        accessorKey: 'dodValue',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="DOD Balance" />
        ),
        cell: ({ row }) => (
            <EditableCurrencyCell
                value={row.original.dodValue}
                onSave={async (val) => {
                    await updateBankAccount(row.original.id, { dodValue: val })
                }}
            />
        ),
    },
    {
        accessorKey: 'status',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
            <EditableSelectCell
                value={row.original.status}
                options={ACCOUNT_STATUS}
                variants={STATUS_VARIANTS}
                onSave={async (val) => {
                    await updateBankAccount(row.original.id, {
                        status: asRecordStatus(val),
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'transferStatus',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Transfer" />
        ),
        cell: ({ row }) => (
            <EditableSelectCell
                value={row.original.transferStatus}
                options={TRANSFER_STATUS}
                variants={STATUS_VARIANTS}
                onSave={async (val) => {
                    await updateBankAccount(row.original.id, {
                        transferStatus: asTransferStatus(val),
                    })
                }}
            />
        ),
    },
    {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditBank(row.original)}
                    title="Edit account"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteBank(row.original.id)}
                    title="Delete account"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        ),
    },
]

// Investment Accounts column configuration
const createInvestmentAccountColumns = (
    updateInvestmentAccount: (
        id: number,
        data: Partial<InvestmentAccount>,
    ) => Promise<void>,
    handleEditInvestment: (account: InvestmentAccount) => void,
    handleDeleteInvestment: (id: number) => void,
): ColumnDef<InvestmentAccount>[] => [
    {
        accessorKey: 'institution',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Institution" />
        ),
        cell: ({ row }) => (
            <EditableTextCell
                value={row.original.institution}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        institution: val as string,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'accountName',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Account Name" />
        ),
        cell: ({ row }) => (
            <EditableTextCell
                value={row.original.accountName}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        accountName: val,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'accountType',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
            <Badge variant="secondary" className="font-normal">
                {
                    INVESTMENT_ACCOUNT_TYPES.find(
                        (t) => t.value === row.original.accountType,
                    )?.label
                }
            </Badge>
        ),
    },
    {
        accessorKey: 'accountNumber',
        header: 'Account #',
        cell: ({ row }) => (
            <code className="text-xs">
                {maskAccountNumber(row.original.accountNumber || '')}
            </code>
        ),
    },
    {
        accessorKey: 'dodValue',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="DOD Value" />
        ),
        cell: ({ row }) => (
            <EditableCurrencyCell
                value={row.original.dodValue}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        dodValue: val,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'costBasis',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Cost Basis" />
        ),
        cell: ({ row }) => (
            <EditableCurrencyCell
                value={row.original.costBasis}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        costBasis: val,
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'status',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
            <EditableSelectCell
                value={row.original.status}
                options={ACCOUNT_STATUS}
                variants={STATUS_VARIANTS}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        status: asRecordStatus(val),
                    })
                }}
            />
        ),
    },
    {
        accessorKey: 'transferStatus',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Transfer" />
        ),
        cell: ({ row }) => (
            <EditableSelectCell
                value={row.original.transferStatus}
                options={TRANSFER_STATUS}
                variants={STATUS_VARIANTS}
                onSave={async (val) => {
                    await updateInvestmentAccount(row.original.id, {
                        transferStatus: asTransferStatus(val),
                    })
                }}
            />
        ),
    },
    {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditInvestment(row.original)}
                    title="Edit account"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteInvestment(row.original.id)}
                    title="Delete account"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        ),
    },
]

export default function AccountsPage() {
    const utils = trpc.useUtils()

    // Use tRPC for data fetching
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

    const handleDeleteBank = async (id: number) => {
        if (!confirm('Are you sure you want to delete this bank account?'))
            return
        if (!selectedEntity) return
        try {
            await deleteBankAccountMutation.mutateAsync({
                id,
                entityId: selectedEntity,
            })
        } catch (err) {
            console.error('Failed to delete bank account:', err)
        }
    }

    const handleDeleteInvestment = async (id: number) => {
        if (
            !confirm('Are you sure you want to delete this investment account?')
        )
            return
        if (!selectedEntity) return
        try {
            await deleteInvestmentAccountMutation.mutateAsync({
                id,
                entityId: selectedEntity,
            })
        } catch (err) {
            console.error('Failed to delete investment account:', err)
        }
    }

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Create column configurations
    const bankColumns = createBankAccountColumns(
        updateBankAccount,
        handleEditBank,
        handleDeleteBank,
    )
    const investmentColumns = createInvestmentAccountColumns(
        updateInvestmentAccount,
        handleEditInvestment,
        handleDeleteInvestment,
    )

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
                        <div className="flex justify-end">
                            <Button
                                onClick={() => bankForm.open()}
                                disabled={!selectedEntity}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Bank Account
                            </Button>
                        </div>

                        <DataTable
                            columns={bankColumns}
                            data={bankAccounts}
                            searchKey="institution"
                            searchPlaceholder="Filter by institution..."
                            emptyMessage="No bank accounts found."
                            enableColumnVisibility={true}
                            enablePagination={true}
                        />
                    </TabsContent>

                    <TabsContent value="investment" className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                onClick={() => investmentForm.open()}
                                disabled={!selectedEntity}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Investment Account
                            </Button>
                        </div>

                        <DataTable
                            columns={investmentColumns}
                            data={investmentAccounts}
                            searchKey="institution"
                            searchPlaceholder="Filter by institution..."
                            emptyMessage="No investment accounts found."
                            enableColumnVisibility={true}
                            enablePagination={true}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {/* Bank Account Form Dialog */}
            <ResourceDialog
                open={bankForm.isOpen}
                onOpenChange={bankForm.close}
                title={
                    bankForm.isEditing
                        ? 'Edit Bank Account'
                        : 'Add Bank Account'
                }
                onSubmit={bankForm.handleSave}
                isLoading={bankForm.isSubmitting}
            >
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Account Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Institution */}
                            <bankFormInstance.Field name="institution">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-institution">
                                            Institution *
                                        </Label>
                                        <Input
                                            id="bank-institution"
                                            placeholder="e.g., Chase, Wells Fargo"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </bankFormInstance.Field>

                            {/* Account Type */}
                            <bankFormInstance.Field name="accountType">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-type">
                                            Account Type *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="bank-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BANK_ACCOUNT_TYPES.map((t) => (
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
                            </bankFormInstance.Field>
                        </div>

                        {/* Account Name */}
                        <bankFormInstance.Field name="accountName">
                            {(field) => (
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="bank-name">
                                        Account Name
                                    </Label>
                                    <Input
                                        id="bank-name"
                                        placeholder="e.g., Primary Checking"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </bankFormInstance.Field>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* Account Number */}
                            <bankFormInstance.Field name="accountNumber">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-number">
                                            Account Number *
                                        </Label>
                                        <Input
                                            id="bank-number"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </bankFormInstance.Field>

                            {/* Routing Number */}
                            <bankFormInstance.Field name="routingNumber">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-routing">
                                            Routing Number
                                        </Label>
                                        <Input
                                            id="bank-routing"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </bankFormInstance.Field>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Date of Death Valuation
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* DOD Value */}
                            <bankFormInstance.Field name="dodValue">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-dod-value">
                                            DOD Balance
                                        </Label>
                                        <Input
                                            id="bank-dod-value"
                                            placeholder="$"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </bankFormInstance.Field>

                            {/* DOD Value Date */}
                            <bankFormInstance.Field name="dodValueDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-dod-date">
                                            DOD Value Date
                                        </Label>
                                        <Input
                                            id="bank-dod-date"
                                            type="date"
                                            value={field.state.value || ''}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value || null,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </bankFormInstance.Field>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Account Status */}
                            <bankFormInstance.Field name="status">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-status">
                                            Account Status *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="bank-status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ACCOUNT_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </bankFormInstance.Field>

                            {/* Transfer Status */}
                            <bankFormInstance.Field name="transferStatus">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-transfer">
                                            Transfer Status *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="bank-transfer">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSFER_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </bankFormInstance.Field>
                        </div>
                    </div>

                    {/* Notes */}
                    <bankFormInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="bank-notes">Notes</Label>
                                <Textarea
                                    id="bank-notes"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>
                        )}
                    </bankFormInstance.Field>
                </div>
            </ResourceDialog>

            {/* Investment Account Form Dialog */}
            <ResourceDialog
                open={investmentForm.isOpen}
                onOpenChange={investmentForm.close}
                title={
                    investmentForm.isEditing
                        ? 'Edit Investment Account'
                        : 'Add Investment Account'
                }
                onSubmit={investmentForm.handleSave}
                isLoading={investmentForm.isSubmitting}
            >
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Account Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Institution */}
                            <investmentFormInstance.Field name="institution">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-institution">
                                            Institution *
                                        </Label>
                                        <Input
                                            id="inv-institution"
                                            placeholder="e.g., Fidelity, Schwab"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>

                            {/* Account Type */}
                            <investmentFormInstance.Field name="accountType">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-type">
                                            Account Type *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="inv-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INVESTMENT_ACCOUNT_TYPES.map(
                                                    (t) => (
                                                        <SelectItem
                                                            key={t.value}
                                                            value={t.value}
                                                        >
                                                            {t.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </investmentFormInstance.Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* Account Name */}
                            <investmentFormInstance.Field name="accountName">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-name">
                                            Account Name
                                        </Label>
                                        <Input
                                            id="inv-name"
                                            placeholder="e.g., Rollover IRA"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>

                            {/* Account Number */}
                            <investmentFormInstance.Field name="accountNumber">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-number">
                                            Account Number *
                                        </Label>
                                        <Input
                                            id="inv-number"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Date of Death Valuation
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            {/* DOD Value */}
                            <investmentFormInstance.Field name="dodValue">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-dod-value">
                                            DOD Value
                                        </Label>
                                        <Input
                                            id="inv-dod-value"
                                            placeholder="$"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>

                            {/* DOD Value Date */}
                            <investmentFormInstance.Field name="dodValueDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-dod-date">
                                            DOD Value Date
                                        </Label>
                                        <Input
                                            id="inv-dod-date"
                                            type="date"
                                            value={field.state.value || ''}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value || null,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>

                            {/* Cost Basis */}
                            <investmentFormInstance.Field name="costBasis">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-cost-basis">
                                            Cost Basis
                                        </Label>
                                        <Input
                                            id="inv-cost-basis"
                                            placeholder="$ (for step-up)"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </investmentFormInstance.Field>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Account Status */}
                            <investmentFormInstance.Field name="status">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-status">
                                            Account Status *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="inv-status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ACCOUNT_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </investmentFormInstance.Field>

                            {/* Transfer Status */}
                            <investmentFormInstance.Field name="transferStatus">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="inv-transfer">
                                            Transfer Status *
                                        </Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger id="inv-transfer">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSFER_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </investmentFormInstance.Field>
                        </div>
                    </div>

                    {/* Notes */}
                    <investmentFormInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="inv-notes">Notes</Label>
                                <Textarea
                                    id="inv-notes"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>
                        )}
                    </investmentFormInstance.Field>
                </div>
            </ResourceDialog>
        </div>
    )
}
