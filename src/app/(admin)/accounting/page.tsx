'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import type {
    AccountingEntryTypeEnum,
    BankAccount,
    ExpenseTypeEnum,
    Homestead,
    IncomeTypeEnum,
    InvestmentAccount,
    RentalProperty,
    TrustAccounting,
    Vehicle,
} from '@/db/schema'
import { useNeonList } from '@/hooks/use-neon-data'
import { useResourceForm } from '@/hooks/use-resource-form'
import { logger } from '@/lib/logger'
import { subtractMoney, sumStrings } from '@/lib/money'
import { neonFetch } from '@/lib/neon-data-api'
import { trpc } from '@/lib/trpc'
import { AccountingDialog } from './_components/AccountingDialog'
import { AccountingHeader } from './_components/AccountingHeader'
import { AccountingSummaryCards } from './_components/AccountingSummaryCards'
import { AccountingTable } from './_components/AccountingTable'
import type { AccountingFormData } from './_components/accounting-constants'

const log = logger.create('Accounting')

export default function AccountingPage() {
    const utils = trpc.useUtils()
    const entityId = 1

    // Fetch bank accounts for the current entity
    const { data: bankAccounts = [] } = useNeonList<BankAccount>(
        'bank_account',
        { entity_id: entityId },
    )

    // Server-side aggregate totals across ALL entries (not just the current page)
    const { data: allTotals = [] } = trpc.trustAccounting.totals.useQuery({
        entityId,
    })

    // Fetch all entries — DataTable handles client-side pagination.
    // listPaginated was broken: currentPage never updated so only the first
    // 20 server rows were ever fetched, making entries 21+ unreachable.
    const { data: entries = [], isLoading: entriesLoading } =
        trpc.trustAccounting.list.useQuery({ entityId })

    const createEntryMutation = trpc.trustAccounting.create.useMutation({
        onSuccess: () => utils.trustAccounting.list.invalidate(),
    })
    const updateEntryMutation = trpc.trustAccounting.update.useMutation({
        onSuccess: () => utils.trustAccounting.list.invalidate(),
    })
    const deleteEntryMutation = trpc.trustAccounting.delete.useMutation({
        onSuccess: () => utils.trustAccounting.list.invalidate(),
    })

    // Year-end income-to-principal conversion
    const { data: unconvertedSummary = [] } =
        trpc.trustAccounting.unconvertedIncomeSummary.useQuery({ entityId })

    const convertIncomeMutation =
        trpc.trustAccounting.convertIncomeToPrincipal.useMutation({
            onSuccess: () => {
                utils.trustAccounting.list.invalidate()
                utils.trustAccounting.unconvertedIncomeSummary.invalidate()
            },
        })

    const [activeTab, setActiveTab] = useState('all')
    const [generatingReport, setGeneratingReport] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [convertingYear, setConvertingYear] = useState<number | null>(null)
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
    const loading = entriesLoading

    const handleConvertYear = async (fiscalYear: number) => {
        // Use the first bank account for the conversion entry
        const defaultBankAccount = bankAccounts[0]
        if (!defaultBankAccount) {
            toast.error(
                'No bank account available for income-to-principal conversion',
            )
            return
        }
        setConvertingYear(fiscalYear)
        try {
            await convertIncomeMutation.mutateAsync({
                entityId,
                fiscalYear,
                bankAccountId: defaultBankAccount.id,
            })
        } catch (error) {
            log.error('Failed to convert income', { error })
            toast.error('Failed to convert income to principal')
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
            if (!data.bankAccountId) return // bankAccountId is required
            const bankAccountIdNum = Number.parseInt(data.bankAccountId, 10)
            const payload = {
                entityId,
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
                    ? Number.parseInt(data.accountingDate.slice(0, 4), 10)
                    : new Date().getFullYear(),
            }
            if (isEditing && editingId) {
                await updateEntryMutation.mutateAsync({
                    id: editingId,
                    entityId,
                    data: payload,
                })
            } else {
                await createEntryMutation.mutateAsync(payload)
            }
            setEditingId(null)
        },
    })

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Entry',
            description:
                'Are you sure you want to delete this entry? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteId === null) return
                try {
                    await deleteEntryMutation.mutateAsync({
                        id: pendingDeleteId,
                        entityId,
                    })
                } catch (error) {
                    log.error('Failed to delete entry', { error })
                } finally {
                    setPendingDeleteId(null)
                }
            },
        })

    const deleteEntry = (id: number) => {
        setPendingDeleteId(id)
        confirmDelete()
    }

    const updateEntry = async (
        id: number,
        updates: Partial<TrustAccounting>,
    ) => {
        await updateEntryMutation.mutateAsync({
            id,
            entityId,
            data: updates,
        })
    }

    // Page-local entry splits (for table tabs only — not for summary totals)
    const { incomeEntries, expenseEntries } = useMemo(() => {
        return {
            incomeEntries: entries.filter((e) => e.entryType === 'INCOME'),
            expenseEntries: entries.filter((e) => e.entryType === 'EXPENSE'),
        }
    }, [entries])

    // Summary card totals — computed server-side from ALL entries, not just the current page.
    // Texas 113.152(2) requires categorization by principal and income.
    const {
        incomeTotal,
        expenseTotal,
        netIncome,
        deductibleExpenses,
        principalReceipts,
        incomeReceipts,
        principalDisbursements,
        incomeDisbursements,
    } = useMemo(() => {
        const pick = (type: string, isPrincipal?: boolean, taxDed?: boolean) =>
            sumStrings(
                allTotals
                    .filter(
                        (r) =>
                            r.entryType === type &&
                            (isPrincipal === undefined ||
                                r.isPrincipal === isPrincipal) &&
                            (taxDed === undefined ||
                                r.taxDeductible === taxDed),
                    )
                    .map((r) => r.total),
            )

        const incTotal = pick('INCOME')
        const expTotal = pick('EXPENSE')
        return {
            incomeTotal: incTotal,
            expenseTotal: expTotal,
            netIncome: subtractMoney(incTotal, expTotal),
            deductibleExpenses: pick('EXPENSE', undefined, true),
            principalReceipts: pick('INCOME', true),
            incomeReceipts: pick('INCOME', false),
            principalDisbursements: pick('EXPENSE', true),
            incomeDisbursements: pick('EXPENSE', false),
        }
    }, [allTotals])

    // Filter based on active tab
    const filteredEntries = useMemo(() => {
        if (activeTab === 'income') return incomeEntries
        if (activeTab === 'expense') return expenseEntries
        return entries
    }, [activeTab, entries, incomeEntries, expenseEntries])

    // Generate Texas 113.152 compliant accounting report
    const generateReport = useCallback(async () => {
        setGeneratingReport(true)

        try {
            // Fetch all required data for the report using tRPC
            const entityFilter = { entity_id: `eq.${entityId}` }
            const [
                bankAccountsData,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                liabilities,
                entityData,
            ] = await Promise.all([
                neonFetch<BankAccount[]>('bank_account', 'GET', {
                    params: entityFilter,
                }),
                neonFetch<InvestmentAccount[]>('investment_account', 'GET', {
                    params: entityFilter,
                }),
                neonFetch<Homestead[]>('homestead', 'GET', {
                    params: entityFilter,
                }),
                neonFetch<RentalProperty[]>('rental_property', 'GET', {
                    params: entityFilter,
                }),
                neonFetch<Vehicle[]>('vehicle', 'GET', {
                    params: entityFilter,
                }),
                utils.liability.list.fetch({ entityId }),
                utils.entity.byId.fetch(entityId),
            ])

            const entity = entityData
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
  <p>Total Receipts: ${incomeTotal}</p>
  <p>Total Disbursements: ${expenseTotal}</p>
  <p><strong>Net Change: ${netIncome}</strong></p>
  <h2>Section 2: Trust Property Summary</h2>
  <p>Bank Accounts: ${bankAccountsData.length} accounts</p>
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
            log.error('Failed to generate report', { error })
        } finally {
            setGeneratingReport(false)
        }
    }, [incomeTotal, expenseTotal, netIncome, utils])

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

    return (
        <div className="space-y-6">
            <AccountingHeader
                generatingReport={generatingReport}
                onGenerateReport={generateReport}
                onAddEntry={handleAddEntry}
            />

            <AccountingSummaryCards
                incomeTotal={incomeTotal}
                expenseTotal={expenseTotal}
                netIncome={netIncome}
                deductibleExpenses={deductibleExpenses}
                principalReceipts={principalReceipts}
                incomeReceipts={incomeReceipts}
                principalDisbursements={principalDisbursements}
                incomeDisbursements={incomeDisbursements}
                unconvertedSummary={unconvertedSummary}
                convertingYear={convertingYear}
                onConvertYear={handleConvertYear}
            />

            <AccountingTable
                entries={entries}
                incomeEntries={incomeEntries}
                expenseEntries={expenseEntries}
                filteredEntries={filteredEntries}
                activeTab={activeTab}
                isLoading={loading}
                onTabChange={setActiveTab}
                onEditEntry={openEditForm}
                onDeleteEntry={deleteEntry}
                onUpdateEntry={updateEntry}
            />

            <AccountingDialog
                open={isDialogOpen}
                isEditing={isEditing}
                isLoading={isEntrySaving}
                bankAccounts={bankAccounts}
                formInstance={formInstance}
                onOpenChange={closeDialog}
                onSubmit={handleSaveEntry}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
