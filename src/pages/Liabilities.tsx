"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Loader2, DollarSign, CreditCard, History } from "lucide-react"
import { formatCurrency } from "../utils/formatters"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

import { useEntities } from "@/hooks/entities/queries"
import {
  useLiabilities,
  useCreateLiability,
  useUpdateLiability,
  useDeleteLiability,
  type Liability,
} from "@/hooks/liabilities/queries"
import { toDateInput } from "@/lib/form-factory"
import {
  EditableTextCell,
  EditableCurrencyCell,
  EditableSelectCell,
} from "@/components/editable-cells"
import { STATUS_VARIANTS } from "@/lib/constants"
import { useResourceForm } from "@/hooks/use-resource-form"
import { ResourceDialog } from "@/components/resource-dialog"
import { DataTable, type ColumnDef } from "@/components/data-table"

const LIABILITY_TYPES = [
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "LOAN", label: "Loan" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "TAX_OWED", label: "Tax Owed" },
  { value: "ACCOUNTS_PAYABLE", label: "Accounts Payable" },
  { value: "LEGAL_JUDGMENT", label: "Legal Judgment" },
  { value: "OTHER", label: "Other" },
]

const LIABILITY_STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAID_OFF", label: "Paid Off" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "WRITTEN_OFF", label: "Written Off" },
]

const ALLOCATION_CLASS = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "INCOME", label: "Income" },
]

const PAYMENT_METHODS = [
  { value: "CHECK", label: "Check" },
  { value: "ACH", label: "ACH Transfer" },
  { value: "WIRE", label: "Wire Transfer" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
]

interface LiabilityFormData {
  liabilityType: string
  creditor: string
  description: string
  originalAmount: string
  currentBalance: string
  currentBalanceDate: string | null
  interestRate: string
  monthlyPayment: string
  dueDate: string | null
  paymentDueDay: string
  allocationClass: string
  status: string
  notes: string
}

const defaultFormData = (): LiabilityFormData => ({
  liabilityType: "MORTGAGE",
  creditor: "",
  description: "",
  originalAmount: "",
  currentBalance: "",
  currentBalanceDate: null,
  interestRate: "",
  monthlyPayment: "",
  dueDate: null,
  paymentDueDay: "",
  allocationClass: "PRINCIPAL",
  status: "ACTIVE",
  notes: "",
})

interface PaymentFormData {
  paymentDate: string
  amount: string
  principalPortion: string
  interestPortion: string
  escrowPortion: string
  paymentMethod: string
  checkNumber: string
  confirmationNumber: string
  notes: string
  createExpenseEntry: boolean
}

const defaultPaymentForm = (): PaymentFormData => {
  const today = new Date().toISOString().split("T")[0]
  return {
    paymentDate: today ?? "",
    amount: "",
    principalPortion: "",
    interestPortion: "",
    escrowPortion: "",
    paymentMethod: "CHECK",
    checkNumber: "",
    confirmationNumber: "",
    notes: "",
    createExpenseEntry: true,
  }
}

export function Liabilities() {
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const { data: liabilities = [], isLoading: liabilitiesLoading } = useLiabilities(selectedEntity || undefined)
  const createLiabilityMutation = useCreateLiability()
  const updateLiabilityMutation = useUpdateLiability()
  const deleteLiabilityMutation = useDeleteLiability()

  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null)

  const {
    isOpen: isLiabilityOpen,
    close: closeLiability,
    form: liabilityForm,
    setForm,
    handleEdit: handleEditLiabilityForm,
    handleAdd: handleAddLiability,
    handleSave: handleSaveLiability,
    isSubmitting: isLiabilitySaving,
    isEditing: isEditingLiability,
    formInstance: liabilityFormInstance,
  } = useResourceForm<LiabilityFormData>({
    initialData: defaultFormData(),
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        liabilityType: data.liabilityType,
        creditor: data.creditor,
        description: data.description || null,
        originalAmount: parseFloat(data.originalAmount) || 0,
        currentBalance: parseFloat(data.currentBalance) || 0,
        currentBalanceDate: data.currentBalanceDate || null,
        interestRate: parseFloat(data.interestRate) || null,
        monthlyPayment: parseFloat(data.monthlyPayment) || null,
        dueDate: data.dueDate || null,
        paymentDueDay: parseInt(data.paymentDueDay) || null,
        allocationClass: data.allocationClass as "PRINCIPAL" | "INCOME",
        status: data.status,
        notes: data.notes || null,
      }
      if (isEditingLiability && editingLiabilityId) {
        await updateLiabilityMutation.mutateAsync({ id: editingLiabilityId, data: payload as any })
      } else {
        await createLiabilityMutation.mutateAsync(payload as any)
      }
      setEditingLiabilityId(null)
    },
  })

  const [payingLiabilityId, setPayingLiabilityId] = useState<string | null>(null)

  const {
    isOpen: isPaymentOpen,
    close: closePayment,
    form: paymentFormData,
    setForm: setPaymentForm,
    handleEdit: handleOpenPayment,
    handleSave: handleRecordPayment,
    isSubmitting: isRecordingPayment,
    formInstance: paymentFormInstance,
  } = useResourceForm<PaymentFormData>({
    initialData: defaultPaymentForm(),
    onSubmit: async (data) => {
      if (!payingLiabilityId) return

      const payload = {
        paymentDate: data.paymentDate,
        amount: parseFloat(data.amount) || 0,
        principalPortion: parseFloat(data.principalPortion) || null,
        interestPortion: parseFloat(data.interestPortion) || null,
        escrowPortion: parseFloat(data.escrowPortion) || null,
        paymentMethod: data.paymentMethod as "CHECK" | "ACH" | "WIRE" | "CREDIT_CARD" | "CASH" | "OTHER",
        checkNumber: data.checkNumber || null,
        confirmationNumber: data.confirmationNumber || null,
        notes: data.notes || null,
        createExpenseEntry: data.createExpenseEntry,
      }

      const res = await fetch(`/api/liabilities/${payingLiabilityId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const result = await res.json()
        // Update local state with new balance
        if (result.liability) {
          await updateLiabilityMutation.mutateAsync({ id: payingLiabilityId, data: {
            currentBalance: result.liability.currentBalance,
            currentBalanceDate: data.paymentDate,
          } })
        }
      } else {
        const error = await res.json()
        throw new Error(error.message || "Failed to record payment")
      }

      setPayingLiabilityId(null)
      if (selectedEntity) {
        // Refetch to update the list
      }
    },
  })

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const handleEditLiability = (l: Liability) => {
    setEditingLiabilityId(l.id)
    handleEditLiabilityForm({
      liabilityType: l.liabilityType,
      creditor: l.creditor,
      description: l.description || "",
      originalAmount: l.originalAmount?.toString() || "",
      currentBalance: l.currentBalance?.toString() || "",
      currentBalanceDate: toDateInput(l.currentBalanceDate) || null,
      interestRate: l.interestRate?.toString() || "",
      monthlyPayment: l.monthlyPayment?.toString() || "",
      dueDate: toDateInput(l.dueDate) || null,
      paymentDueDay: l.paymentDueDay?.toString() || "",
      allocationClass: l.allocationClass || "PRINCIPAL",
      status: l.status,
      notes: l.notes || "",
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this liability?")) return
    try {
      await deleteLiabilityMutation.mutateAsync(id)
    } catch (err) {
      console.error("Failed to delete liability:", err)
    }
  }

  const openPaymentDialog = (l: Liability) => {
    setPayingLiabilityId(l.id)
    handleOpenPayment({
      paymentDate: new Date().toISOString().split("T")[0] ?? "",
      amount: l.monthlyPayment?.toString() || "",
      principalPortion: "",
      interestPortion: "",
      escrowPortion: "",
      paymentMethod: "CHECK",
      checkNumber: "",
      confirmationNumber: "",
      notes: "",
      createExpenseEntry: true,
    })
  }

  if (entitiesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + (parseFloat(l.currentBalance || "0") || 0),
    0
  )

  const activeLiabilities = liabilities.filter(l => l.status === "ACTIVE")
  const totalActive = activeLiabilities.reduce(
    (sum, l) => sum + (parseFloat(l.currentBalance || "0") || 0),
    0
  )

  const liabilityColumns: ColumnDef<Liability>[] = [
    {
      key: "liabilityType",
      header: "Type",
      render: (liability) => {
        const typeLabel = LIABILITY_TYPES.find((t) => t.value === liability.liabilityType)?.label || liability.liabilityType
        return (
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
        )
      },
    },
    {
      key: "creditor",
      header: "Creditor",
      render: (liability) => (
        <EditableTextCell
          value={liability.creditor}
          onSave={async (v) => updateLiability(liability.id, { creditor: v || "" })}
        />
      ),
    },
    {
      key: "originalAmount",
      header: "Original Amount",
      render: (liability) => (
        <EditableCurrencyCell
          value={liability.originalAmount}
          onSave={async (v) => updateLiability(liability.id, { originalAmount: v || "0" })}
        />
      ),
    },
    {
      key: "currentBalance",
      header: "Current Balance",
      render: (liability) => (
        <EditableCurrencyCell
          value={liability.currentBalance}
          onSave={async (v) => updateLiability(liability.id, { currentBalance: v || "0" })}
        />
      ),
    },
    {
      key: "monthlyPayment",
      header: "Monthly Payment",
      render: (liability) => (
        <EditableCurrencyCell
          value={liability.monthlyPayment}
          onSave={async (v) => updateLiability(liability.id, { monthlyPayment: v })}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (liability) => (
        <EditableSelectCell
          value={liability.status}
          options={LIABILITY_STATUS}
          variants={STATUS_VARIANTS}
          onSave={async (v) => updateLiability(liability.id, { status: v })}
        />
      ),
    },
    {
      key: "allocationClass",
      header: "Allocation",
      render: (liability) => (
        <EditableSelectCell
          value={liability.allocationClass || "PRINCIPAL"}
          options={ALLOCATION_CLASS}
          onSave={async (v) => updateLiability(liability.id, { allocationClass: v })}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (liability) => (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openPaymentDialog(liability)}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Record Payment</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Liabilities</h2>
          <p className="text-sm text-muted-foreground">
            Texas Property Code 113.152(5) - Track trust debts and obligations
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
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Total Liabilities
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalLiabilities.toString())}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Active Debts</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalActive.toString())}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeLiabilities.length} active {activeLiabilities.length === 1 ? "liability" : "liabilities"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold">{liabilities.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={handleAddLiability}>
              <Plus className="h-4 w-4 mr-2" />
              Add Liability
            </Button>
          </div>

          {/* Table */}
          {liabilitiesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : liabilities.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  No liabilities recorded. Click Add to create one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={liabilityColumns}
              data={liabilities}
              onDelete={(liability) => handleDelete(liability.id)}
            />
          )}
        </>
      )}

      {/* Form Dialog */}
      <ResourceDialog
        open={isLiabilityOpen}
        onOpenChange={closeLiability}
        title={isEditingLiability ? "Edit Liability" : "Add Liability"}
        onSubmit={handleSaveLiability}
        isLoading={isLiabilitySaving}
      >
          <div className="space-y-6 pt-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Liability Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="liability-type">Liability Type *</Label>
                  <Select
                    value={liabilityForm.liabilityType}
                    onValueChange={(v) => setForm({ ...liabilityForm, liabilityType: v })}
                  >
                    <SelectTrigger id="liability-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIABILITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditor">Creditor *</Label>
                  <Input
                    id="creditor"
                    placeholder="e.g., Bank of America"
                    value={liabilityForm.creditor}
                    onChange={(e) => setForm({ ...liabilityForm, creditor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Primary residence mortgage"
                  value={liabilityForm.description}
                  onChange={(e) => setForm({ ...liabilityForm, description: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Financial Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="original-amount">Original Amount *</Label>
                  <Input
                    id="original-amount"
                    placeholder="$"
                    value={liabilityForm.originalAmount}
                    onChange={(e) => setForm({ ...liabilityForm, originalAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-balance">Current Balance *</Label>
                  <Input
                    id="current-balance"
                    placeholder="$"
                    value={liabilityForm.currentBalance}
                    onChange={(e) => setForm({ ...liabilityForm, currentBalance: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    placeholder="e.g., 4.5"
                    value={liabilityForm.interestRate}
                    onChange={(e) => setForm({ ...liabilityForm, interestRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-payment">Monthly Payment</Label>
                  <Input
                    id="monthly-payment"
                    placeholder="$"
                    value={liabilityForm.monthlyPayment}
                    onChange={(e) => setForm({ ...liabilityForm, monthlyPayment: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-due-day">Payment Due Day</Label>
                  <Input
                    id="payment-due-day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 15"
                    value={liabilityForm.paymentDueDay}
                    onChange={(e) => setForm({ ...liabilityForm, paymentDueDay: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Maturity/Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={liabilityForm.dueDate || ""}
                    onChange={(e) => setForm({ ...liabilityForm, dueDate: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance-date">Balance As Of</Label>
                  <Input
                    id="balance-date"
                    type="date"
                    value={liabilityForm.currentBalanceDate || ""}
                    onChange={(e) => setForm({ ...liabilityForm, currentBalanceDate: e.target.value || null })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Status & Classification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={liabilityForm.status}
                    onValueChange={(v) => setForm({ ...liabilityForm, status: v })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIABILITY_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allocation">Allocation Class (Texas 116.152)</Label>
                  <Select
                    value={liabilityForm.allocationClass}
                    onValueChange={(v) => setForm({ ...liabilityForm, allocationClass: v })}
                  >
                    <SelectTrigger id="allocation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOCATION_CLASS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={liabilityForm.notes}
                onChange={(e) => setForm({ ...liabilityForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
      </ResourceDialog>

      {/* Payment Dialog */}
      <ResourceDialog
        open={isPaymentOpen}
        onOpenChange={closePayment}
        title="Record Payment"
        onSubmit={handleRecordPayment}
        isLoading={isRecordingPayment}
      >
          {payingLiabilityId && (() => {
            const payingLiability = liabilities.find(l => l.id === payingLiabilityId)
            if (!payingLiability) return null
            return (
            <div className="space-y-6 pt-4">
              {/* Liability Info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">Paying</div>
                <div className="font-medium">{payingLiability.creditor}</div>
                <div className="text-sm text-muted-foreground">
                  {LIABILITY_TYPES.find(t => t.value === payingLiability.liabilityType)?.label}
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">{formatCurrency(payingLiability.currentBalance)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h4 className="text-sm font-medium mb-3">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Payment Date *</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Amount *</Label>
                    <Input
                      id="payment-amount"
                      placeholder="$0.00"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentForm({ ...paymentFormData, amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Breakdown (optional) */}
              <div>
                <h4 className="text-sm font-medium mb-3">Payment Breakdown (optional)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="principal-portion" className="text-xs">Principal</Label>
                    <Input
                      id="principal-portion"
                      placeholder="$"
                      value={paymentFormData.principalPortion}
                      onChange={(e) => setPaymentForm({ ...paymentFormData, principalPortion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest-portion" className="text-xs">Interest</Label>
                    <Input
                      id="interest-portion"
                      placeholder="$"
                      value={paymentFormData.interestPortion}
                      onChange={(e) => setPaymentForm({ ...paymentFormData, interestPortion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="escrow-portion" className="text-xs">Escrow</Label>
                    <Input
                      id="escrow-portion"
                      placeholder="$"
                      value={paymentFormData.escrowPortion}
                      onChange={(e) => setPaymentForm({ ...paymentFormData, escrowPortion: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={paymentFormData.paymentMethod}
                    onValueChange={(v) => setPaymentForm({ ...paymentFormData, paymentMethod: v })}
                  >
                    <SelectTrigger id="payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-number">
                    {paymentFormData.paymentMethod === "CHECK" ? "Check #" : "Confirmation #"}
                  </Label>
                  <Input
                    id="check-number"
                    placeholder={paymentFormData.paymentMethod === "CHECK" ? "Check number" : "Confirmation"}
                    value={paymentFormData.paymentMethod === "CHECK" ? paymentFormData.checkNumber : paymentFormData.confirmationNumber}
                    onChange={(e) => setPaymentForm({
                      ...paymentFormData,
                      ...(paymentFormData.paymentMethod === "CHECK"
                        ? { checkNumber: e.target.value }
                        : { confirmationNumber: e.target.value })
                    })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentForm({ ...paymentFormData, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes about this payment"
                />
              </div>

              {/* Auto-create expense toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="create-expense" className="font-medium">
                    Record in Trust Accounting
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create an expense entry for this payment
                  </p>
                </div>
                <Switch
                  id="create-expense"
                  checked={paymentFormData.createExpenseEntry}
                  onCheckedChange={(checked) => setPaymentForm({ ...paymentFormData, createExpenseEntry: checked })}
                />
              </div>
            </div>
            )
          })()}
      </ResourceDialog>
    </div>
  )
}
