"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { formatCurrency } from "../utils/formatters"
import {
  EditableTextCell,
  EditableCurrencyCell,
  EditableSelectCell,
} from "@/components/editable-cells"
import { DataTable, type ColumnDef } from "@/components/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Import types and hooks from centralized location
import { useEntities } from "@/hooks/entities/queries"
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  type BankAccount,
} from "@/hooks/bank-accounts/queries"
import {
  useInvestmentAccounts,
  useCreateInvestmentAccount,
  useUpdateInvestmentAccount,
  useDeleteInvestmentAccount,
  type InvestmentAccount,
} from "@/hooks/investment-accounts/queries"
import {
  bankAccountFormDefaults,
  investmentAccountFormDefaults,
  toDateInput,
} from "@/lib/form-factory"
import { TRANSFER_STATUS, STATUS_VARIANTS } from "@/lib/constants"
import { useResourceForm } from "@/hooks/use-resource-form"
import { ResourceDialog } from "@/components/resource-dialog"

const BANK_ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CD", label: "Certificate of Deposit" },
  { value: "MONEY_MARKET", label: "Money Market" },
  { value: "BUSINESS_CHECKING", label: "Business Checking" },
  { value: "BUSINESS_SAVINGS", label: "Business Savings" },
]

const INVESTMENT_ACCOUNT_TYPES = [
  { value: "BROKERAGE", label: "Brokerage" },
  { value: "IRA_TRADITIONAL", label: "Traditional IRA" },
  { value: "IRA_ROTH", label: "Roth IRA" },
  { value: "K401", label: "401(k)" },
  { value: "ANNUITY", label: "Annuity" },
  { value: "HSA", label: "HSA" },
  { value: "FIVE29", label: "529 Plan" },
  { value: "OTHER", label: "Other" },
]

const ACCOUNT_STATUS = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "FROZEN", label: "Frozen" },
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
  if (!num) return "—"
  if (num.length <= 4) return num
  return "****" + num.slice(-4)
}

// Bank Accounts column configuration
const createBankAccountColumns = (
  updateBankAccount: (id: string, data: any) => Promise<any>,
  handleDeleteBank: (id: string) => void
): ColumnDef<any>[] => [
  {
    key: "institution",
    header: "Institution",
    render: (account) => (
      <EditableTextCell
        value={account.institution}
        onSave={async (val) => {
          await updateBankAccountMutation.mutateAsync({ id: account.id, data: { institution: val as string })
        }}
      />
    ),
  },
  {
    key: "accountName",
    header: "Account Name",
    render: (account) => (
      <EditableTextCell
        value={account.accountName}
        onSave={async (val) => {
          await updateBankAccountMutation.mutateAsync({ id: account.id, data: { accountName: val })
        }}
      />
    ),
  },
  {
    key: "accountType",
    header: "Type",
    render: (account) => (
      <Badge variant="secondary" className="font-normal">
        {BANK_ACCOUNT_TYPES.find((t) => t.value === account.accountType)?.label}
      </Badge>
    ),
  },
  {
    key: "accountNumber",
    header: "Account #",
    render: (account) => (
      <code className="text-xs">{maskAccountNumber(account.accountNumber || "")}</code>
    ),
  },
  {
    key: "dodValue",
    header: "DOD Balance",
    render: (account) => (
      <EditableCurrencyCell
        value={account.dodValue}
        onSave={async (val) => {
          await updateBankAccountMutation.mutateAsync({ id: account.id, data: { dodValue: val })
        }}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (account) => (
      <EditableSelectCell
        value={account.status}
        options={ACCOUNT_STATUS}
        variants={STATUS_VARIANTS}
        onSave={async (val) => {
          await updateBankAccountMutation.mutateAsync({ id: account.id, data: { status: val })
        }}
      />
    ),
  },
  {
    key: "transferStatus",
    header: "Transfer",
    render: (account) => (
      <EditableSelectCell
        value={account.transferStatus}
        options={TRANSFER_STATUS}
        variants={STATUS_VARIANTS}
        onSave={async (val) => {
          await updateBankAccountMutation.mutateAsync({ id: account.id, data: { transferStatus: val })
        }}
      />
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (account) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDeleteBank(account.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
]

// Investment Accounts column configuration
const createInvestmentAccountColumns = (
  updateInvestmentAccount: (id: string, data: any) => Promise<any>,
  handleDeleteInvestment: (id: string) => void
): ColumnDef<any>[] => [
  {
    key: "institution",
    header: "Institution",
    render: (account) => (
      <EditableTextCell
        value={account.institution}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { institution: val as string })
        }}
      />
    ),
  },
  {
    key: "accountName",
    header: "Account Name",
    render: (account) => (
      <EditableTextCell
        value={account.accountName}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { accountName: val })
        }}
      />
    ),
  },
  {
    key: "accountType",
    header: "Type",
    render: (account) => (
      <Badge variant="secondary" className="font-normal">
        {INVESTMENT_ACCOUNT_TYPES.find((t) => t.value === account.accountType)?.label}
      </Badge>
    ),
  },
  {
    key: "accountNumber",
    header: "Account #",
    render: (account) => (
      <code className="text-xs">{maskAccountNumber(account.accountNumber || "")}</code>
    ),
  },
  {
    key: "dodValue",
    header: "DOD Value",
    render: (account) => (
      <EditableCurrencyCell
        value={account.dodValue}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { dodValue: val })
        }}
      />
    ),
  },
  {
    key: "costBasis",
    header: "Cost Basis",
    render: (account) => (
      <EditableCurrencyCell
        value={account.costBasis}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { costBasis: val })
        }}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (account) => (
      <EditableSelectCell
        value={account.status}
        options={ACCOUNT_STATUS}
        variants={STATUS_VARIANTS}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { status: val })
        }}
      />
    ),
  },
  {
    key: "transferStatus",
    header: "Transfer",
    render: (account) => (
      <EditableSelectCell
        value={account.transferStatus}
        options={TRANSFER_STATUS}
        variants={STATUS_VARIANTS}
        onSave={async (val) => {
          await updateInvestmentAccountMutation.mutateAsync({ id: account.id, data: { transferStatus: val })
        }}
      />
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (account) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDeleteInvestment(account.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
]

export function Accounts() {
  // Use TanStack Query hooks for data fetching
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("bank")

  // Bank account hooks
  const { data: bankAccounts = [], isLoading: bankLoading } = useBankAccounts(selectedEntity || undefined)
  const createBankAccountMutation = useCreateBankAccount()
  const updateBankAccountMutation = useUpdateBankAccount()
  const deleteBankAccountMutation = useDeleteBankAccount()

  // Investment account hooks
  const { data: investmentAccounts = [], isLoading: investmentLoading } = useInvestmentAccounts(selectedEntity || undefined)
  const createInvestmentAccountMutation = useCreateInvestmentAccount()
  const updateInvestmentAccountMutation = useUpdateInvestmentAccount()
  const deleteInvestmentAccountMutation = useDeleteInvestmentAccount()

  // Bank Account Dialog - useResourceForm hook
  const [editingBankId, setEditingBankId] = useState<string | null>(null)

  const {
    isOpen: isBankOpen,
    close: closeBankDialog,
    form: bankFormData,
    setForm: setBankFormData,
    handleEdit: handleEditBankForm,
    handleAdd: handleAddBank,
    handleSave: handleSaveBank,
    isSubmitting: isBankSaving,
    isEditing: isEditingBank,
  } = useResourceForm<BankFormData>({
    initialData: bankAccountFormDefaults(),
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        institution: data.institution,
        accountType: data.accountType,
        accountName: data.accountName,
        accountNumber: data.accountNumber || null,
        routingNumber: data.routingNumber || null,
        dodValue: parseFloat(data.dodValue) || null,
        dodValueDate: data.dodValueDate || null,
        status: data.status,
        transferStatus: data.transferStatus,
        notes: data.notes || null,
      }
      if (isEditingBank && editingBankId) {
        await updateBankAccountMutation.mutateAsync({ id: editingBankId, data: payload as any)
      } else {
        await createBankAccountMutation.mutateAsync(payload as any)
      }
      setEditingBankId(null)
    },
  })

  // Investment Account Dialog - useResourceForm hook
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null)

  const {
    isOpen: isInvestmentOpen,
    close: closeInvestmentDialog,
    form: investmentFormData,
    setForm: setInvestmentFormData,
    handleEdit: handleEditInvestmentForm,
    handleAdd: handleAddInvestment,
    handleSave: handleSaveInvestment,
    isSubmitting: isInvestmentSaving,
    isEditing: isEditingInvestment,
  } = useResourceForm<InvestmentFormData>({
    initialData: investmentAccountFormDefaults(),
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        institution: data.institution,
        accountType: data.accountType,
        accountName: data.accountName,
        accountNumber: data.accountNumber || null,
        dodValue: parseFloat(data.dodValue) || null,
        dodValueDate: data.dodValueDate || null,
        costBasis: parseFloat(data.costBasis) || null,
        taxDeferred: data.accountType.includes("IRA") || data.accountType === "K401",
        beneficiaryDesignated: false,
        status: data.status,
        transferStatus: data.transferStatus,
        notes: data.notes || null,
      }
      if (isEditingInvestment && editingInvestmentId) {
        await updateInvestmentAccountMutation.mutateAsync({ id: editingInvestmentId, data: payload as any)
      } else {
        await createInvestmentAccountMutation.mutateAsync(payload as any)
      }
      setEditingInvestmentId(null)
    },
  })

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  // Custom edit handlers that transform entity → form data
  const handleEditBank = (bank: BankAccount) => {
    setEditingBankId(bank.id)
    handleEditBankForm({
      institution: bank.institution,
      accountType: bank.accountType,
      accountName: bank.accountName || "",
      accountNumber: bank.accountNumber || "",
      routingNumber: bank.routingNumber || "",
      dodValue: bank.dodValue || "",
      dodValueDate: toDateInput(bank.dodValueDate),
      status: bank.status,
      transferStatus: bank.transferStatus,
      notes: bank.notes || "",
    })
  }

  const handleEditInvestment = (investment: InvestmentAccount) => {
    setEditingInvestmentId(investment.id)
    handleEditInvestmentForm({
      institution: investment.institution,
      accountType: investment.accountType,
      accountName: investment.accountName || "",
      accountNumber: investment.accountNumber || "",
      dodValue: investment.dodValue || "",
      dodValueDate: toDateInput(investment.dodValueDate),
      costBasis: investment.costBasis || "",
      status: investment.status,
      transferStatus: investment.transferStatus,
      notes: investment.notes || "",
    })
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return
    try {
      await deleteBankAccountMutation.mutateAsync(id)
    } catch (err) {
      console.error("Failed to delete bank account:", err)
    }
  }

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment account?")) return
    try {
      await deleteInvestmentAccountMutation.mutateAsync(id)
    } catch (err) {
      console.error("Failed to delete investment account:", err)
    }
  }

  // Inline update handlers for editable cells
  const handleUpdateBank = async (id: string, updates: Partial<BankAccount>) => {
    await updateBankAccountMutation.mutateAsync({ id, data: updates)
  }

  const handleUpdateInvestment = async (id: string, updates: Partial<InvestmentAccount>) => {
    await updateInvestmentAccountMutation.mutateAsync({ id, data: updates)
  }

  const loading = entitiesLoading || bankLoading || investmentLoading

  if (entitiesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Create column configurations
  const bankColumns = createBankAccountColumns(updateBankAccount, handleDeleteBank)
  const investmentColumns = createInvestmentAccountColumns(updateInvestmentAccount, handleDeleteInvestment)

  const totalBankValue = bankAccounts.reduce(
    (sum, a) => sum + (parseFloat(a.dodValue || "0") || 0),
    0
  )
  const totalInvestmentValue = investmentAccounts.reduce(
    (sum, a) => sum + (parseFloat(a.dodValue || "0") || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage financial accounts
          </p>
        </div>
        <Select
          value={selectedEntity || undefined}
          onValueChange={setSelectedEntity}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select entity" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
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
              Bank Accounts ({bankAccounts.length}) - {formatCurrency(totalBankValue.toString())}
            </TabsTrigger>
            <TabsTrigger value="investment">
              Investment Accounts ({investmentAccounts.length}) - {formatCurrency(totalInvestmentValue.toString())}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddBank}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </div>

            <DataTable
              columns={bankColumns}
              data={bankAccounts}
              onDelete={(account) => handleDeleteBank(account.id)}
            />
          </TabsContent>

          <TabsContent value="investment" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddInvestment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Investment Account
              </Button>
            </div>

            <DataTable
              columns={investmentColumns}
              data={investmentAccounts}
              onDelete={(account) => handleDeleteInvestment(account.id)}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Bank Account Form Dialog */}
      <ResourceDialog
        open={isBankOpen}
        onOpenChange={closeBankDialog}
        title={isEditingBank ? "Edit Bank Account" : "Add Bank Account"}
        onSubmit={handleSaveBank}
        isLoading={isBankSaving}
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Account Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-institution">Institution *</Label>
                <Input
                  id="bank-institution"
                  placeholder="e.g., Chase, Wells Fargo"
                  value={bankFormData.institution}
                  onChange={(e) => setBankFormData({ ...bankFormData, institution: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-type">Account Type *</Label>
                <Select
                  value={bankFormData.accountType}
                  onValueChange={(v) => setBankFormData({ ...bankFormData, accountType: v })}
                >
                  <SelectTrigger id="bank-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="bank-name">Account Name</Label>
              <Input
                id="bank-name"
                placeholder="e.g., Primary Checking"
                value={bankFormData.accountName}
                onChange={(e) => setBankFormData({ ...bankFormData, accountName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="bank-number">Account Number *</Label>
                <Input
                  id="bank-number"
                  value={bankFormData.accountNumber}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-routing">Routing Number</Label>
                <Input
                  id="bank-routing"
                  value={bankFormData.routingNumber}
                  onChange={(e) => setBankFormData({ ...bankFormData, routingNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Date of Death Valuation</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-dod-value">DOD Balance</Label>
                <Input
                  id="bank-dod-value"
                  placeholder="$"
                  value={bankFormData.dodValue}
                  onChange={(e) => setBankFormData({ ...bankFormData, dodValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-dod-date">DOD Value Date</Label>
                <Input
                  id="bank-dod-date"
                  type="date"
                  value={bankFormData.dodValueDate || ""}
                  onChange={(e) => setBankFormData({ ...bankFormData, dodValueDate: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-status">Account Status *</Label>
                <Select
                  value={bankFormData.status}
                  onValueChange={(v) => setBankFormData({ ...bankFormData, status: v })}
                >
                  <SelectTrigger id="bank-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-transfer">Transfer Status *</Label>
                <Select
                  value={bankFormData.transferStatus}
                  onValueChange={(v) => setBankFormData({ ...bankFormData, transferStatus: v })}
                >
                  <SelectTrigger id="bank-transfer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank-notes">Notes</Label>
            <Textarea
              id="bank-notes"
              value={bankFormData.notes}
              onChange={(e) => setBankFormData({ ...bankFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </ResourceDialog>

      {/* Investment Account Form Dialog */}
      <ResourceDialog
        open={isInvestmentOpen}
        onOpenChange={closeInvestmentDialog}
        title={isEditingInvestment ? "Edit Investment Account" : "Add Investment Account"}
        onSubmit={handleSaveInvestment}
        isLoading={isInvestmentSaving}
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Account Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-institution">Institution *</Label>
                <Input
                  id="inv-institution"
                  placeholder="e.g., Fidelity, Schwab"
                  value={investmentFormData.institution}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, institution: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-type">Account Type *</Label>
                <Select
                  value={investmentFormData.accountType}
                  onValueChange={(v) => setInvestmentFormData({ ...investmentFormData, accountType: v })}
                >
                  <SelectTrigger id="inv-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="inv-name">Account Name</Label>
                <Input
                  id="inv-name"
                  placeholder="e.g., Rollover IRA"
                  value={investmentFormData.accountName}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, accountName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-number">Account Number *</Label>
                <Input
                  id="inv-number"
                  value={investmentFormData.accountNumber}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, accountNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Date of Death Valuation</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-dod-value">DOD Value</Label>
                <Input
                  id="inv-dod-value"
                  placeholder="$"
                  value={investmentFormData.dodValue}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, dodValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-dod-date">DOD Value Date</Label>
                <Input
                  id="inv-dod-date"
                  type="date"
                  value={investmentFormData.dodValueDate || ""}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, dodValueDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-cost-basis">Cost Basis</Label>
                <Input
                  id="inv-cost-basis"
                  placeholder="$ (for step-up)"
                  value={investmentFormData.costBasis}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, costBasis: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-status">Account Status *</Label>
                <Select
                  value={investmentFormData.status}
                  onValueChange={(v) => setInvestmentFormData({ ...investmentFormData, status: v })}
                >
                  <SelectTrigger id="inv-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-transfer">Transfer Status *</Label>
                <Select
                  value={investmentFormData.transferStatus}
                  onValueChange={(v) => setInvestmentFormData({ ...investmentFormData, transferStatus: v })}
                >
                  <SelectTrigger id="inv-transfer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
              value={investmentFormData.notes}
              onChange={(e) => setInvestmentFormData({ ...investmentFormData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </ResourceDialog>
    </div>
  )
}
