"use client"

import { FileText, Loader2, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { type ColumnDef, DataTable } from "@/components/data-table"
import { EditableCurrencyCell, EditableTextCell } from "@/components/editable-cells"
import { ResourceDialog } from "@/components/resource-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { TrustAccounting } from "@/db/schema"
import { useResourceForm } from "@/hooks/use-resource-form"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/utils/formatters"

const INCOME_TYPES = [
  { value: "DIVIDEND", label: "Dividend" },
  { value: "INTEREST", label: "Interest" },
  { value: "RENT", label: "Rental Income" },
  { value: "ROYALTY", label: "Royalty" },
  { value: "CAPITAL_GAIN", label: "Capital Gain" },
  { value: "SALE_PROCEEDS", label: "Sale Proceeds" },
  { value: "DISTRIBUTION", label: "Distribution Received" },
  { value: "OTHER", label: "Other Income" },
]

const EXPENSE_TYPES = [
  { value: "TAX", label: "Tax Payment" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "REPAIR", label: "Repair" },
  { value: "PROFESSIONAL_FEE", label: "Professional Fee" },
  { value: "TRUSTEE_FEE", label: "Trustee Fee" },
  { value: "FILING_FEE", label: "Filing Fee" },
  { value: "UTILITY", label: "Utility" },
  { value: "OTHER", label: "Other Expense" },
]

interface AccountingFormData {
  accountingDate: string
  entryType: string
  incomeType: string
  expenseType: string
  amount: string
  description: string
  isPrincipal: boolean
  taxDeductible: boolean
  checkNumber: string
}

export default function AccountingPage() {
  const utils = trpc.useUtils()

  const { data: entities = [], isLoading: entitiesLoading } = trpc.entity.list.useQuery()
  const [selectedEntity, setSelectedEntity] = useState<string>("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Use paginated query
  const { data: paginatedResult, isLoading: entriesLoading } =
    trpc.trustAccounting.listPaginated.useQuery(
      { entityId: selectedEntity, limit: pageSize, offset: (currentPage - 1) * pageSize },
      { enabled: !!selectedEntity },
    )

  const entries = paginatedResult?.data || []
  const totalCount = paginatedResult?.totalCount || 0

  const createEntryMutation = trpc.trustAccounting.create.useMutation({
    onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
  })
  const updateEntryMutation = trpc.trustAccounting.update.useMutation({
    onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
  })
  const deleteEntryMutation = trpc.trustAccounting.delete.useMutation({
    onSuccess: () => utils.trustAccounting.listPaginated.invalidate(),
  })

  const [activeTab, setActiveTab] = useState("all")
  const [generatingReport, setGeneratingReport] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const loading = entitiesLoading || entriesLoading

  const defaultFormData: AccountingFormData = {
    accountingDate: new Date().toISOString().split("T")[0] || "",
    entryType: "INCOME",
    incomeType: "INTEREST",
    expenseType: "PROFESSIONAL_FEE",
    amount: "",
    description: "",
    isPrincipal: false,
    taxDeductible: false,
    checkNumber: "",
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
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        accountingDate: data.accountingDate,
        entryType: data.entryType,
        incomeType: data.entryType === "INCOME" ? data.incomeType : undefined,
        expenseType: data.entryType === "EXPENSE" ? data.expenseType : undefined,
        amount: data.amount,
        description: data.description || "",
        isPrincipal: data.isPrincipal,
        taxDeductible: data.taxDeductible,
        checkNumber: data.checkNumber || undefined,
        fiscalYear: data.accountingDate
          ? new Date(data.accountingDate).getFullYear()
          : new Date().getFullYear(),
      }
      if (isEditing && editingId) {
        await updateEntryMutation.mutateAsync({ id: editingId, data: payload })
      } else {
        await createEntryMutation.mutateAsync(payload)
      }
      setEditingId(null)
    },
  })

  // Handle entity change - updates entity and resets pagination
  const handleEntityChange = useCallback((entityId: string) => {
    setSelectedEntity(entityId)
    setCurrentPage(1)
  }, [])

  // Auto-select first entity when entities load
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      handleEntityChange(entities[0].id)
    }
  }, [entities, selectedEntity, handleEntityChange])

  const deleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return
    try {
      await deleteEntryMutation.mutateAsync(id)
    } catch (error) {
      console.error("Failed to delete entry:", error)
    }
  }

  const updateEntry = async (id: string, updates: Partial<TrustAccounting>) => {
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
    const income = entries.filter((e) => e.entryType === "INCOME")
    const expense = entries.filter((e) => e.entryType === "EXPENSE")
    const incTotal = income.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
    const expTotal = expense.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
    const deductible = expense
      .filter((e) => e.taxDeductible)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)

    // Texas 113.152(2) - categorize by principal and income
    const principalRec = income
      .filter((e) => e.isPrincipal)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
    const incomeRec = income
      .filter((e) => !e.isPrincipal)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
    const principalDisb = expense
      .filter((e) => e.isPrincipal)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
    const incomeDisb = expense
      .filter((e) => !e.isPrincipal)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)

    return {
      incomeEntries: income,
      expenseEntries: expense,
      incomeTotal: incTotal,
      expenseTotal: expTotal,
      netIncome: incTotal - expTotal,
      deductibleExpenses: deductible,
      principalReceipts: principalRec,
      incomeReceipts: incomeRec,
      principalDisbursements: principalDisb,
      incomeDisbursements: incomeDisb,
    }
  }, [entries])

  // Filter based on active tab
  const filteredEntries = useMemo(() => {
    if (activeTab === "income") return incomeEntries
    if (activeTab === "expense") return expenseEntries
    return entries
  }, [activeTab, entries, incomeEntries, expenseEntries])

  // Generate Texas 113.152 compliant accounting report
  const generateReport = useCallback(async () => {
    if (!selectedEntity) return
    setGeneratingReport(true)

    try {
      // Fetch all required data for the report
      const [
        bankAccountsRes,
        investmentAccountsRes,
        homesteadsRes,
        rentalPropertiesRes,
        vehiclesRes,
        liabilitiesRes,
      ] = await Promise.all([
        fetch(`/api/bank-accounts?entityId=${selectedEntity}`),
        fetch(`/api/investment-accounts?entityId=${selectedEntity}`),
        fetch(`/api/homesteads?entityId=${selectedEntity}`),
        fetch(`/api/rental-properties?entityId=${selectedEntity}`),
        fetch(`/api/vehicles?entityId=${selectedEntity}`),
        fetch(`/api/liabilities?entityId=${selectedEntity}`),
      ])

      const [
        bankAccounts,
        investmentAccounts,
        homesteads,
        rentalProperties,
        vehicles,
        liabilities,
      ] = await Promise.all([
        bankAccountsRes.json(),
        investmentAccountsRes.json(),
        homesteadsRes.json(),
        rentalPropertiesRes.json(),
        vehiclesRes.json(),
        liabilitiesRes.json(),
      ])

      const entity = entities.find((e) => e.id === selectedEntity)
      const reportDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // Build HTML report per Texas Property Code 113.152
      const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Trust Accounting Report - ${entity?.name || "Trust"}</title>
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
    <p><strong>${entity?.name || "Trust"}</strong></p>
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
      const reportWindow = window.open("", "_blank")
      if (reportWindow) {
        reportWindow.document.write(reportHtml)
        reportWindow.document.close()
      }
    } catch (error) {
      console.error("Failed to generate report:", error)
    } finally {
      setGeneratingReport(false)
    }
  }, [selectedEntity, entities, incomeTotal, expenseTotal, netIncome])

  // Handler for opening edit dialog from DataTable
  const openEditForm = (entry: TrustAccounting) => {
    setEditingId(entry.id)
    handleEditEntry({
      accountingDate: entry.accountingDate?.split("T")[0] || "",
      entryType: entry.entryType,
      incomeType: entry.incomeType || "INTEREST",
      expenseType: entry.expenseType || "PROFESSIONAL_FEE",
      amount: entry.amount,
      description: entry.description || "",
      isPrincipal: entry.isPrincipal ?? false,
      taxDeductible: entry.taxDeductible ?? false,
      checkNumber: entry.checkNumber || "",
    })
  }

  // Column configuration for DataTable
  const accountingColumns: ColumnDef<TrustAccounting>[] = [
    {
      key: "accountingDate",
      header: "Date",
      render: (entry) => <div className="text-sm">{formatDate(entry.accountingDate)}</div>,
    },
    {
      key: "entryType",
      header: "Type",
      render: (entry) => (
        <Badge
          variant={entry.entryType === "INCOME" ? "default" : "destructive"}
          className={cn(entry.entryType === "INCOME" && "bg-success hover:bg-success/90")}
        >
          {entry.entryType}
        </Badge>
      ),
    },
    {
      key: "incomeType",
      header: "Category",
      render: (entry) => (
        <div className="text-sm">
          {entry.entryType === "INCOME"
            ? INCOME_TYPES.find((t) => t.value === entry.incomeType)?.label || entry.incomeType
            : EXPENSE_TYPES.find((t) => t.value === entry.expenseType)?.label || entry.expenseType}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (entry) => (
        <EditableTextCell
          value={entry.description}
          onSave={async (v) => updateEntry(entry.id, { description: v || undefined })}
          placeholder="Add description"
        />
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (entry) => (
        <div
          className={cn(
            "text-right",
            entry.entryType === "INCOME" ? "text-success" : "text-destructive",
          )}
        >
          <EditableCurrencyCell
            value={entry.amount}
            onSave={async (v) => updateEntry(entry.id, { amount: v || "" })}
          />
        </div>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      render: (entry) => (
        <div className="flex gap-1">
          {entry.isPrincipal && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    P
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Principal (not income)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {entry.taxDeductible && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs">
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
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Trust Accounting</h2>
          <p className="text-sm text-muted-foreground">
            Texas Property Code § 113.152 compliant accounting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedEntity} onValueChange={handleEntityChange}>
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="Select Trust" />
            </SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
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
              <p className="mt-2 text-2xl font-bold text-success">{formatCurrency(incomeTotal)}</p>
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
                  "mt-2 text-2xl font-bold",
                  netIncome >= 0 ? "text-success" : "text-destructive",
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
              <p className="mt-2 text-2xl font-bold">{formatCurrency(deductibleExpenses)}</p>
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
                  <span className="text-sm text-muted-foreground">Principal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(principalReceipts)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Income</span>
                  <span className="font-medium tabular-nums">{formatCurrency(incomeReceipts)}</span>
                </div>
                <div className="flex justify-between items-center py-2 font-medium">
                  <span className="text-sm">Total</span>
                  <span className="tabular-nums text-success">{formatCurrency(incomeTotal)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Disbursements</p>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Principal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(principalDisbursements)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Income</span>
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
              <TabsTrigger value="income" className="text-success">
                Income
                <Badge className="ml-2 bg-success">{incomeEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="expense" className="text-destructive">
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
                isLoading={loading}
                emptyMessage="No entries recorded yet. Click 'Add Entry' to start tracking."
                onEdit={openEditForm}
                onDelete={(entry) => deleteEntry(entry.id)}
                pagination={{
                  currentPage,
                  pageSize,
                  totalCount,
                  onPageChange: setCurrentPage,
                }}
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Entry Form Dialog */}
      <ResourceDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        title={isEditing ? "Edit Entry" : "Add Entry"}
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
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </formInstance.Field>

          {/* Entry Type */}
          <formInstance.Field name="entryType">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="entryType">Entry Type</Label>
                <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                  <SelectTrigger id="entryType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </formInstance.Field>

          {/* Conditional Category Selection */}
          <formInstance.Subscribe<string> selector={(state) => state.values.entryType}>
            {(entryType) =>
              entryType === "INCOME" ? (
                <formInstance.Field name="incomeType">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="incomeType">Income Category</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                      >
                        <SelectTrigger id="incomeType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INCOME_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
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
                      <Label htmlFor="expenseType">Expense Category</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                      >
                        <SelectTrigger id="expenseType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="$0.00"
                />
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
            )}
          </formInstance.Field>

          {/* Reference Number */}
          <formInstance.Field name="checkNumber">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
                  <Label htmlFor="isPrincipal">Principal (not income)</Label>
                  <p className="text-xs text-muted-foreground">
                    Mark if this is a return of principal, not taxable income
                  </p>
                </div>
                <Switch
                  id="isPrincipal"
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </div>
            )}
          </formInstance.Field>

          {/* taxDeductible Switch (conditional) */}
          <formInstance.Subscribe<string> selector={(state) => state.values.entryType}>
            {(entryType) =>
              entryType === "EXPENSE" && (
                <formInstance.Field name="taxDeductible">
                  {(field) => (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="taxDeductible">Tax Deductible</Label>
                        <p className="text-xs text-muted-foreground">
                          Mark if this expense is deductible on Form 1041
                        </p>
                      </div>
                      <Switch
                        id="taxDeductible"
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked)}
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
