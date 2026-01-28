'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
    ArrowRightLeft,
    FileText,
    Loader2,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import {
    EditableCurrencyCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
    AccountingEntryTypeEnum,
    ExpenseTypeEnum,
    IncomeTypeEnum,
    TrustAccounting,
} from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { isNegative, subtractMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'

const INCOME_TYPES = [
    { value: 'DIVIDEND', label: 'Dividend' },
    { value: 'INTEREST', label: 'Interest' },
    { value: 'RENT', label: 'Rental Income' },
    { value: 'ROYALTY', label: 'Royalty' },
    { value: 'CAPITAL_GAIN', label: 'Capital Gain' },
    { value: 'SALE_PROCEEDS', label: 'Sale Proceeds' },
    { value: 'DISTRIBUTION', label: 'Distribution Received' },
    { value: 'OTHER', label: 'Other Income' },
]

const EXPENSE_TYPES = [
    { value: 'TAX', label: 'Tax Payment' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'REPAIR', label: 'Repair' },
    { value: 'PROFESSIONAL_FEE', label: 'Professional Fee' },
    { value: 'TRUSTEE_FEE', label: 'Trustee Fee' },
    { value: 'FILING_FEE', label: 'Filing Fee' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'OTHER', label: 'Other Expense' },
]

interface AccountingFormData {
    accountingDate: string
    entryType: 'INCOME' | 'EXPENSE'
    incomeType: string
    expenseType: string
    amount: string
    description: string
    bankAccountId: string
    isPrincipal: boolean
    taxDeductible: boolean
    checkNumber: string
}

export default function AccountingPage() {
    const utils = trpc.useUtils()

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId || entities[0]?.id

    // Fetch bank accounts for the current entity
    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        { entityId: selectedEntity },
        { enabled: !!selectedEntity },
    )

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 20

    // Use paginated query
    const { data: paginatedResult, isLoading: entriesLoading } =
        trpc.trustAccounting.listPaginated.useQuery(
            {
                entityId: selectedEntity,
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
            },
            { enabled: !!selectedEntity },
        )

    const entries = paginatedResult?.data || []
    const _totalCount = paginatedResult?.totalCount || 0

    const createEntryMutation = trpc.trustAccounting.create.useMutation({
        onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
    })
    const updateEntryMutation = trpc.trustAccounting.update.useMutation({
        onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
    })
    const deleteEntryMutation = trpc.trustAccounting.delete.useMutation({
        onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
    })

    // Year-end income-to-principal conversion
    const { data: unconvertedSummary = [] } =
        trpc.trustAccounting.unconvertedIncomeSummary.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

    const convertIncomeMutation =
        trpc.trustAccounting.convertIncomeToPrincipal.useMutation({
            onSuccess: () => {
                utils.trustAccounting.listPaginated.invalidate()
                utils.trustAccounting.unconvertedIncomeSummary.invalidate()
            },
        })

    const [activeTab, setActiveTab] = useState('all')
    const [generatingReport, setGeneratingReport] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [convertingYear, setConvertingYear] = useState<number | null>(null)
    const loading = entitiesLoading || entriesLoading

    const handleConvertYear = async (fiscalYear: number) => {
        if (!selectedEntity) return
        // Use the first bank account for the conversion entry
        const defaultBankAccount = bankAccounts[0]
        if (!defaultBankAccount) {
            console.error(
                'No bank account available for income-to-principal conversion',
            )
            return
        }
        setConvertingYear(fiscalYear)
        try {
            await convertIncomeMutation.mutateAsync({
                entityId: selectedEntity,
                fiscalYear,
                bankAccountId: defaultBankAccount.id,
            })
        } catch (error) {
            console.error('Failed to convert income:', error)
        } finally {
            setConvertingYear(null)
        }
    }

    const defaultFormData: AccountingFormData = {
        accountingDate: new Date().toISOString().split('T')[0] || '',
        entryType: 'INCOME',
        incomeType: 'INTEREST',
        expenseType: 'PROFESSIONAL_FEE',
        amount: '',
        description: '',
        bankAccountId: '',
        isPrincipal: false,
        taxDeductible: false,
        checkNumber: '',
    }

    const {
        isOpen: isDialogOpen,
        close: closeDialog,
        handleEdit: handleEditEntry,
        handleAdd: handleAddEntry,
        handleSave: handleSaveEntry,
        isSubmitting: isEntrySaving,
        isEditing,
        formInstance,
    } = useResourceForm<AccountingFormData>({
        initialData: defaultFormData,
        onSubmit: async (data) => {
            if (!numericEntityId) return
            if (!data.bankAccountId) return // bankAccountId is required
            const bankAccountIdNum = Number.parseInt(data.bankAccountId, 10)
            const payload = {
                entityId: numericEntityId,
                accountingDate: data.accountingDate,
                entryType: data.entryType as AccountingEntryTypeEnum,
                incomeType:
                    data.entryType === 'INCOME'
                        ? (data.incomeType as IncomeTypeEnum)
                        : undefined,
                expenseType:
                    data.entryType === 'EXPENSE'
                        ? (data.expenseType as ExpenseTypeEnum)
                        : undefined,
                amount: data.amount,
                description: data.description || '',
                bankAccountId: bankAccountIdNum,
                isPrincipal: data.isPrincipal,
                taxDeductible: data.taxDeductible,
                checkNumber: data.checkNumber || undefined,
                fiscalYear: data.accountingDate
                    ? new Date(data.accountingDate).getFullYear()
                    : new Date().getFullYear(),
            }
            if (isEditing && editingId) {
                await updateEntryMutation.mutateAsync({
                    id: editingId,
                    data: payload,
                })
            } else {
                await createEntryMutation.mutateAsync(payload)
            }
            setEditingId(null)
        },
    })

    // Handle entity change - updates entity and resets pagination
    const handleEntityChange = useCallback(
        (newEntityId: string) => {
            setEntityId(newEntityId || null)
            setCurrentPage(1)
        },
        [setEntityId],
    )

    // Convert string entityId from URL to number for API calls
    const numericEntityId = selectedEntity
        ? typeof selectedEntity === 'string'
            ? Number.parseInt(selectedEntity, 10)
            : selectedEntity
        : undefined

    const deleteEntry = async (id: number) => {
        if (!confirm('Are you sure you want to delete this entry?')) return
        try {
            await deleteEntryMutation.mutateAsync(id)
        } catch (error) {
            console.error('Failed to delete entry:', error)
        }
    }

    const updateEntry = async (
        id: number,
        updates: Partial<TrustAccounting>,
    ) => {
        await updateEntryMutation.mutateAsync({ id, data: updates })
    }

    // Calculate totals - Texas 113.152(2) requires categorization by principal and income
    const {
        incomeEntries,
        expenseEntries,
        incomeTotal,
        expenseTotal,
        netIncome,
        deductibleExpenses,
        principalReceipts,
        incomeReceipts,
        principalDisbursements,
        incomeDisbursements,
    } = useMemo(() => {
        const income = entries.filter((e) => e.entryType === 'INCOME')
        const expense = entries.filter((e) => e.entryType === 'EXPENSE')
        const incTotal = sumStrings(income.map((e) => e.amount))
        const expTotal = sumStrings(expense.map((e) => e.amount))
        const deductible = sumStrings(
            expense.filter((e) => e.taxDeductible).map((e) => e.amount),
        )

        // Texas 113.152(2) - categorize by principal and income
        const principalRec = sumStrings(
            income.filter((e) => e.isPrincipal).map((e) => e.amount),
        )
        const incomeRec = sumStrings(
            income.filter((e) => !e.isPrincipal).map((e) => e.amount),
        )
        const principalDisb = sumStrings(
            expense.filter((e) => e.isPrincipal).map((e) => e.amount),
        )
        const incomeDisb = sumStrings(
            expense.filter((e) => !e.isPrincipal).map((e) => e.amount),
        )

        return {
            incomeEntries: income,
            expenseEntries: expense,
            incomeTotal: incTotal,
            expenseTotal: expTotal,
            netIncome: subtractMoney(incTotal, expTotal),
            deductibleExpenses: deductible,
            principalReceipts: principalRec,
            incomeReceipts: incomeRec,
            principalDisbursements: principalDisb,
            incomeDisbursements: incomeDisb,
        }
    }, [entries])

    // Filter based on active tab
    const filteredEntries = useMemo(() => {
        if (activeTab === 'income') return incomeEntries
        if (activeTab === 'expense') return expenseEntries
        return entries
    }, [activeTab, entries, incomeEntries, expenseEntries])

    // Generate Texas 113.152 compliant accounting report
    const generateReport = useCallback(async () => {
        if (!selectedEntity) return
        setGeneratingReport(true)

        try {
            // Fetch all required data for the report using tRPC
            const [
                bankAccounts,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
            ] = await Promise.all([
                utils.bankAccount.list.fetch({ entityId: selectedEntity }),
                utils.investmentAccount.list.fetch({
                    entityId: selectedEntity,
                }),
                utils.homestead.list.fetch({ entityId: selectedEntity }),
                utils.rentalProperty.list.fetch({ entityId: selectedEntity }),
                utils.vehicle.list.fetch({ entityId: selectedEntity }),
                utils.liability.list.fetch({ entityId: selectedEntity }),
            ])

            const entity = entities.find((e) => e.id === selectedEntity)
            const reportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })

            // Build HTML report per Texas Property Code 113.152
            const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Trust Accounting Report - ${entity?.name || 'Trust'}</title>
  <style>
    @media print {
      body { margin: 0.5in; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.5;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
    }
    h1 { text-align: center; font-size: 18pt; margin-bottom: 0.5em; }
    h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 0.25em; margin-top: 1.5em; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    .amount { text-align: right; font-family: monospace; }
    .total-row { font-weight: bold; background: #f9f9f9; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Report</button>
  <h1>TRUST ACCOUNTING</h1>
  <div style="text-align: center; margin-bottom: 2em;">
    <p><strong>${entity?.name || 'Trust'}</strong></p>
    <p>Report Date: ${reportDate}</p>
    <p style="font-style: italic; font-size: 10pt;">Prepared pursuant to Texas Property Code § 113.152</p>
  </div>
  <h2>Section 1: Receipts and Disbursements</h2>
  <p>Total Receipts: ${formatCurrency(incomeTotal)}</p>
  <p>Total Disbursements: ${formatCurrency(expenseTotal)}</p>
  <p><strong>Net Change: ${formatCurrency(netIncome)}</strong></p>
  <h2>Section 2: Trust Property Summary</h2>
  <p>Bank Accounts: ${bankAccounts.length} accounts</p>
  <p>Investment Accounts: ${investmentAccounts.length} accounts</p>
  <p>Real Property: ${homesteads.length + rentalProperties.length} properties</p>
  <p>Vehicles: ${vehicles.length} vehicles</p>
  <h2>Section 3: Liabilities</h2>
  <p>Total Liabilities: ${liabilities.length} records</p>
</body>
</html>
      `

            // Open report in new window
            const reportWindow = window.open('', '_blank')
            if (reportWindow) {
                reportWindow.document.write(reportHtml)
                reportWindow.document.close()
            }
        } catch (error) {
            console.error('Failed to generate report:', error)
        } finally {
            setGeneratingReport(false)
        }
    }, [selectedEntity, entities, incomeTotal, expenseTotal, netIncome, utils])

    // Handler for opening edit dialog from DataTable
    const openEditForm = (entry: TrustAccounting) => {
        setEditingId(entry.id)
        handleEditEntry({
            accountingDate: entry.accountingDate?.split('T')[0] || '',
            entryType: entry.entryType,
            incomeType: entry.incomeType || 'INTEREST',
            expenseType: entry.expenseType || 'PROFESSIONAL_FEE',
            amount: entry.amount,
            description: entry.description || '',
            bankAccountId: entry.bankAccountId?.toString() || '',
            isPrincipal: entry.isPrincipal ?? false,
            taxDeductible: entry.taxDeductible ?? false,
            checkNumber: entry.checkNumber || '',
        })
    }

    // Column configuration for DataTable
    const accountingColumns: ColumnDef<TrustAccounting>[] = [
        {
            accessorKey: 'accountingDate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => (
                <div className="text-sm">
                    {formatDate(row.original.accountingDate)}
                </div>
            ),
        },
        {
            accessorKey: 'entryType',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge
                    variant={
                        row.original.entryType === 'INCOME'
                            ? 'default'
                            : 'destructive'
                    }
                    className={cn(
                        row.original.entryType === 'INCOME' &&
                            'bg-success hover:bg-success/90',
                    )}
                >
                    {row.original.entryType}
                </Badge>
            ),
        },
        {
            id: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.entryType === 'INCOME'
                        ? INCOME_TYPES.find(
                              (t) => t.value === row.original.incomeType,
                          )?.label || row.original.incomeType
                        : EXPENSE_TYPES.find(
                              (t) => t.value === row.original.expenseType,
                          )?.label || row.original.expenseType}
                </div>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.description}
                    onSave={async (v) =>
                        updateEntry(row.original.id, {
                            description: v || undefined,
                        })
                    }
                    placeholder="Add description"
                />
            ),
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Amount" />
            ),
            cell: ({ row }) => (
                <div
                    className={cn(
                        'text-right',
                        row.original.entryType === 'INCOME'
                            ? 'text-success'
                            : 'text-destructive',
                    )}
                >
                    <EditableCurrencyCell
                        value={row.original.amount}
                        onSave={async (v) =>
                            updateEntry(row.original.id, { amount: v || '' })
                        }
                    />
                </div>
            ),
        },
        {
            id: 'flags',
            header: 'Flags',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    {row.original.isPrincipal && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        P
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Principal (not income)
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {row.original.taxDeductible && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        D
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Tax Deductible</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
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
                        onClick={() => openEditForm(row.original)}
                        title="Edit entry"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteEntry(row.original.id)}
                        title="Delete entry"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
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
                        Trust Accounting
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Texas Property Code § 113.152 compliant accounting
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedEntity?.toString() ?? ''}
                        onValueChange={handleEntityChange}
                    >
                        <SelectTrigger className="w-62.5">
                            <SelectValue placeholder="Select Trust" />
                        </SelectTrigger>
                        <SelectContent>
                            {entities.map((e) => (
                                <SelectItem key={e.id} value={e.id.toString()}>
                                    {e.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={generateReport}
                        disabled={generatingReport || !selectedEntity}
                    >
                        {generatingReport ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="mr-2 h-4 w-4" />
                        )}
                        Export Report
                    </Button>
                    <Button onClick={handleAddEntry}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Entry
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="@container">
                <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Receipts
                            </p>
                            <p className="mt-2 text-2xl font-bold text-success">
                                {formatCurrency(incomeTotal)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Disbursements
                            </p>
                            <p className="mt-2 text-2xl font-bold text-destructive">
                                {formatCurrency(expenseTotal)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Net Change
                            </p>
                            <p
                                className={cn(
                                    'mt-2 text-2xl font-bold',
                                    isNegative(netIncome)
                                        ? 'text-destructive'
                                        : 'text-success',
                                )}
                            >
                                {formatCurrency(netIncome)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Tax Deductible
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {formatCurrency(deductibleExpenses)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Texas 113.152(2) - Principal vs Income Breakdown */}
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Principal vs Income Allocation (Texas 113.152)
                        </p>
                        <div className="grid gap-6 @xs:grid-cols-2">
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Receipts</p>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">
                                        Principal
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(principalReceipts)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">
                                        Income
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(incomeReceipts)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 font-medium">
                                    <span className="text-sm">Total</span>
                                    <span className="tabular-nums text-success">
                                        {formatCurrency(incomeTotal)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-medium">
                                    Disbursements
                                </p>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">
                                        Principal
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(principalDisbursements)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">
                                        Income
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(incomeDisbursements)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 font-medium">
                                    <span className="text-sm">Total</span>
                                    <span className="tabular-nums text-destructive">
                                        {formatCurrency(expenseTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Year-End Income to Principal Conversion - Section 7.10(c) */}
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Year-End Conversion
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Section 7.10(c): Undistributed income added
                                    to principal annually
                                </p>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">
                                            Per the trust agreement, all income
                                            not distributed to beneficiaries
                                            shall be added to principal at least
                                            annually.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {unconvertedSummary.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No unconverted income entries found. All income
                                has been converted to principal.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {unconvertedSummary.map((yearData) => (
                                    <div
                                        key={yearData.fiscalYear}
                                        className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                Fiscal Year{' '}
                                                {yearData.fiscalYear}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {yearData.entryCount}{' '}
                                                {yearData.entryCount === 1
                                                    ? 'entry'
                                                    : 'entries'}{' '}
                                                •{' '}
                                                {formatCurrency(
                                                    yearData.totalAmount,
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleConvertYear(
                                                    yearData.fiscalYear,
                                                )
                                            }
                                            disabled={
                                                convertingYear ===
                                                yearData.fiscalYear
                                            }
                                            className="shrink-0"
                                        >
                                            {convertingYear ===
                                            yearData.fiscalYear ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Converting...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                    Convert to Principal
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Entries Table */}
            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-6 pt-6">
                        <TabsList>
                            <TabsTrigger value="all">
                                All Entries
                                <Badge variant="secondary" className="ml-2">
                                    {entries.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="income"
                                className="text-success"
                            >
                                Income
                                <Badge className="ml-2 bg-success">
                                    {incomeEntries.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="expense"
                                className="text-destructive"
                            >
                                Expenses
                                <Badge variant="destructive" className="ml-2">
                                    {expenseEntries.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value={activeTab} className="m-0">
                        <CardContent className="pt-4">
                            <DataTable
                                columns={accountingColumns}
                                data={filteredEntries}
                                searchKey="description"
                                searchPlaceholder="Filter by description..."
                                isLoading={loading}
                                emptyMessage="No entries recorded yet. Click 'Add Entry' to start tracking."
                                enableColumnVisibility={true}
                                enablePagination={true}
                            />
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Entry Form Dialog */}
            <ResourceDialog
                open={isDialogOpen}
                onOpenChange={closeDialog}
                title={isEditing ? 'Edit Entry' : 'Add Entry'}
                onSubmit={handleSaveEntry}
                isLoading={isEntrySaving}
            >
                <div className="space-y-4">
                    {/* Date */}
                    <formInstance.Field name="accountingDate">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Entry Type */}
                    <formInstance.Field name="entryType">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="entryType">Entry Type</Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) =>
                                        field.handleChange(
                                            v as 'INCOME' | 'EXPENSE',
                                        )
                                    }
                                >
                                    <SelectTrigger id="entryType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INCOME">
                                            Income
                                        </SelectItem>
                                        <SelectItem value="EXPENSE">
                                            Expense
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Conditional Category Selection */}
                    <formInstance.Subscribe<string>
                        selector={(state) => state.values.entryType}
                    >
                        {(entryType) =>
                            entryType === 'INCOME' ? (
                                <formInstance.Field name="incomeType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="incomeType">
                                                Income Category
                                            </Label>
                                            <Select
                                                value={field.state.value}
                                                onValueChange={(v) =>
                                                    field.handleChange(v)
                                                }
                                            >
                                                <SelectTrigger id="incomeType">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {INCOME_TYPES.map((t) => (
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
                                </formInstance.Field>
                            ) : (
                                <formInstance.Field name="expenseType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="expenseType">
                                                Expense Category
                                            </Label>
                                            <Select
                                                value={field.state.value}
                                                onValueChange={(v) =>
                                                    field.handleChange(v)
                                                }
                                            >
                                                <SelectTrigger id="expenseType">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {EXPENSE_TYPES.map((t) => (
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
                                </formInstance.Field>
                            )
                        }
                    </formInstance.Subscribe>

                    {/* Amount */}
                    <formInstance.Field name="amount">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    placeholder="$0.00"
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Bank Account */}
                    <formInstance.Field name="bankAccountId">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="bankAccountId">
                                    Bank Account
                                </Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(val) =>
                                        field.handleChange(val)
                                    }
                                >
                                    <SelectTrigger id="bankAccountId">
                                        <SelectValue placeholder="Select bank account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.map((account) => (
                                            <SelectItem
                                                key={account.id}
                                                value={account.id.toString()}
                                            >
                                                {account.institution} -{' '}
                                                {account.accountName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Description */}
                    <formInstance.Field name="description">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    placeholder="Enter description..."
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Reference Number */}
                    <formInstance.Field name="checkNumber">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="reference">
                                    Reference Number
                                </Label>
                                <Input
                                    id="reference"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    placeholder="Check #, invoice #, etc."
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    <Separator />

                    {/* isPrincipal Switch */}
                    <formInstance.Field name="isPrincipal">
                        {(field) => (
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="isPrincipal">
                                        Principal (not income)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Mark if this is a return of principal,
                                        not taxable income
                                    </p>
                                </div>
                                <Switch
                                    id="isPrincipal"
                                    checked={field.state.value}
                                    onCheckedChange={(checked) =>
                                        field.handleChange(checked)
                                    }
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    {/* taxDeductible Switch (conditional) */}
                    <formInstance.Subscribe<string>
                        selector={(state) => state.values.entryType}
                    >
                        {(entryType) =>
                            entryType === 'EXPENSE' && (
                                <formInstance.Field name="taxDeductible">
                                    {(field) => (
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="taxDeductible">
                                                    Tax Deductible
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Mark if this expense is
                                                    deductible on Form 1041
                                                </p>
                                            </div>
                                            <Switch
                                                id="taxDeductible"
                                                checked={field.state.value}
                                                onCheckedChange={(checked) =>
                                                    field.handleChange(checked)
                                                }
                                            />
                                        </div>
                                    )}
                                </formInstance.Field>
                            )
                        }
                    </formInstance.Subscribe>
                </div>
            </ResourceDialog>
        </div>
    )
}
