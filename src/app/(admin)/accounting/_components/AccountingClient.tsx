'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import type {
    AccountingEntryTypeEnum,
    ExpenseTypeEnum,
    IncomeTypeEnum,
    TrustAccounting,
} from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { logger } from '@/lib/logger'
import { subtractMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { AccountingDialog } from './AccountingDialog'
import { AccountingHeader } from './AccountingHeader'
import {
    AccountingCompliancePanel,
    AccountingSummaryStats,
} from './AccountingSummaryCards'
import { AccountingTable } from './AccountingTable'
import type { AccountingFormData } from './accounting-constants'

const log = logger.create('Accounting')
const PAGE_SIZE = 50

export function AccountingClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: bankAccounts = [] } = trpc.bankAccount.list.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )

    const { data: allTotals = [] } = trpc.trustAccounting.totals.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )

    // Server-side pagination state
    const [offset, setOffset] = useState(0)
    const [activeTab, setActiveTab] = useState('all')

    // Derive entryType filter from active tab
    const entryTypeFilter =
        activeTab === 'income'
            ? ('INCOME' as const)
            : activeTab === 'expense'
              ? ('EXPENSE' as const)
              : undefined

    // Paginated query -- server filters by entryType and paginates
    const { data: paginatedResult, isLoading: entriesLoading } =
        trpc.trustAccounting.listPaginated.useQuery(
            {
                entityId: entityId!,
                limit: PAGE_SIZE,
                offset,
                entryType: entryTypeFilter,
            },
            { enabled: !!entityId },
        )
    const entries = paginatedResult?.data ?? []
    const totalCount = paginatedResult?.totalCount ?? 0

    const invalidateAccounting = useCallback(() => {
        utils.trustAccounting.listPaginated.invalidate()
        utils.trustAccounting.totals.invalidate()
        utils.trustAccounting.unconvertedIncomeSummary.invalidate()
    }, [utils])

    const createEntryMutation = trpc.trustAccounting.createEntry.useMutation({
        onSuccess: invalidateAccounting,
    })
    const updateEntryMutation = trpc.trustAccounting.update.useMutation({
        onSuccess: invalidateAccounting,
    })
    const deleteEntryMutation = trpc.trustAccounting.delete.useMutation({
        onSuccess: invalidateAccounting,
    })

    const { data: unconvertedSummary = [] } =
        trpc.trustAccounting.unconvertedIncomeSummary.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const convertIncomeMutation =
        trpc.trustAccounting.convertIncomeToPrincipal.useMutation({
            onSuccess: invalidateAccounting,
        })

    const [generatingReport, setGeneratingReport] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [convertingYear, setConvertingYear] = useState<number | null>(null)
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
    const loading = entriesLoading

    // Tab badge counts from totals query (accurate across all pages)
    const { incomeCount, expenseCount } = useMemo(() => {
        let inc = 0
        let exp = 0
        for (const row of allTotals) {
            if (row.entryType === 'INCOME') inc += row.entryCount
            else if (row.entryType === 'EXPENSE') exp += row.entryCount
        }
        return { incomeCount: inc, expenseCount: exp }
    }, [allTotals])

    // Pagination derived state
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1

    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab)
        setOffset(0)
    }, [])

    const handlePageChange = useCallback((page: number) => {
        setOffset((page - 1) * PAGE_SIZE)
    }, [])

    const handleConvertYear = async (fiscalYear: number) => {
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
                entityId: entityId!,
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
                entityId: entityId!,
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
                    entityId: entityId!,
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
                        entityId: entityId!,
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

    // Sequential (NOT Promise.all) bulk delete: a mid-batch failure leaves a
    // known committed set and an exact failure count to report.
    const onBulkDelete = async (rows: TrustAccounting[]) => {
        let failed = 0
        for (const row of rows) {
            try {
                await deleteEntryMutation.mutateAsync({
                    id: row.id,
                    entityId: entityId!,
                })
            } catch (error) {
                failed++
                log.error('Bulk delete failed', { id: row.id, error })
            }
        }
        // This table is server-paginated by `offset`. Deleting every row on
        // the last page leaves `offset` past the new row count, so the
        // refetched query returns an empty page. Clamp `offset` back into
        // range before the invalidation refetch lands. (The other 5
        // bulk-delete tables are client-paginated and self-correct.)
        const deleted = rows.length - failed
        if (deleted > 0) {
            const newCount = Math.max(0, totalCount - deleted)
            const maxOffset =
                newCount === 0
                    ? 0
                    : Math.floor((newCount - 1) / PAGE_SIZE) * PAGE_SIZE
            if (offset > maxOffset) setOffset(maxOffset)
        }
        if (failed > 0) {
            toast.error(`Failed to delete ${failed} of ${rows.length} entries`)
        } else {
            toast.success(`Deleted ${rows.length} entries`)
        }
    }

    const updateEntry = async (
        id: number,
        updates: Partial<TrustAccounting>,
    ) => {
        await updateEntryMutation.mutateAsync({
            id,
            entityId: entityId!,
            data: updates,
        })
    }

    // Texas Property Code 113.152(2): categorize by principal vs income
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

    const generateReport = useCallback(async () => {
        setGeneratingReport(true)

        try {
            const [
                bankAccountsData,
                investmentAccounts,
                homesteads,
                rentalProperties,
                vehicles,
                personalPropertyData,
                insurancePolicies,
                liabilities,
                entityData,
            ] = await Promise.all([
                utils.bankAccount.list.fetch({ entityId }),
                utils.investmentAccount.list.fetch({ entityId }),
                utils.homestead.list.fetch({ entityId }),
                utils.rentalProperty.list.fetch({ entityId }),
                utils.vehicle.list.fetch({ entityId }),
                utils.personalProperty.list.fetch({ entityId }),
                utils.insurancePolicy.list.fetch({ entityId }),
                utils.liability.list.fetch({ entityId }),
                utils.entity.byId.fetch(entityId),
            ])

            const entity = entityData
            const reportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })

            // Build report HTML and open as Blob URL in new window
            const html = buildReportHtml({
                entityName: entity?.name || 'Trust',
                reportDate,
                incomeTotal,
                expenseTotal,
                netIncome,
                bankAccountCount: bankAccountsData.length,
                investmentAccountCount: investmentAccounts.length,
                propertyCount: homesteads.length + rentalProperties.length,
                vehicleCount: vehicles.length,
                personalPropertyCount: personalPropertyData.length,
                insurancePolicyCount: insurancePolicies.length,
                liabilityCount: liabilities.length,
            })
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } catch (error) {
            log.error('Failed to generate report', { error })
            toast.error('Failed to generate report')
        } finally {
            setGeneratingReport(false)
        }
    }, [incomeTotal, expenseTotal, netIncome, utils, entityId])

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

            <AccountingSummaryStats
                incomeTotal={incomeTotal}
                expenseTotal={expenseTotal}
                netIncome={netIncome}
                deductibleExpenses={deductibleExpenses}
            />

            <AccountingTable
                data={entries}
                totalCount={totalCount}
                incomeCount={incomeCount}
                expenseCount={expenseCount}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                activeTab={activeTab}
                isLoading={loading}
                onTabChange={handleTabChange}
                onEditEntry={openEditForm}
                onDeleteEntry={deleteEntry}
                onBulkDelete={onBulkDelete}
                onUpdateEntry={updateEntry}
            />

            <AccountingCompliancePanel
                principalReceipts={principalReceipts}
                incomeReceipts={incomeReceipts}
                principalDisbursements={principalDisbursements}
                incomeDisbursements={incomeDisbursements}
                unconvertedSummary={unconvertedSummary}
                convertingYear={convertingYear}
                onConvertYear={handleConvertYear}
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

interface ReportHtmlParams {
    entityName: string
    reportDate: string
    incomeTotal: string
    expenseTotal: string
    netIncome: string
    bankAccountCount: number
    investmentAccountCount: number
    propertyCount: number
    vehicleCount: number
    personalPropertyCount: number
    insurancePolicyCount: number
    liabilityCount: number
}

function buildReportHtml(p: ReportHtmlParams): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Trust Accounting Report - ${p.entityName}</title>
  <style>
    @media print { body { margin: 0.5in; } .no-print { display: none; } }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; max-width: 8.5in; margin: 0 auto; padding: 1in; }
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
    <p><strong>${p.entityName}</strong></p>
    <p>Report Date: ${p.reportDate}</p>
    <p style="font-style: italic; font-size: 10pt;">Prepared pursuant to Texas Property Code § 113.152</p>
  </div>
  <h2>Section 1: Receipts and Disbursements</h2>
  <p>Total Receipts: ${p.incomeTotal}</p>
  <p>Total Disbursements: ${p.expenseTotal}</p>
  <p><strong>Net Change: ${p.netIncome}</strong></p>
  <h2>Section 2: Trust Property Summary</h2>
  <p>Bank Accounts: ${p.bankAccountCount} accounts</p>
  <p>Investment Accounts: ${p.investmentAccountCount} accounts</p>
  <p>Real Property: ${p.propertyCount} properties</p>
  <p>Vehicles: ${p.vehicleCount} vehicles</p>
  <p>Personal Property: ${p.personalPropertyCount} items</p>
  <p>Insurance Policies: ${p.insurancePolicyCount} policies</p>
  <h2>Section 3: Liabilities</h2>
  <p>Total Liabilities: ${p.liabilityCount} records</p>
</body>
</html>`
}
