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

import {
  useEntities,
  useLiabilities,
  type Liability,
} from "@/hooks"
import { toDateInput } from "@/lib/form-factory"
import {
  EditableTextCell,
  EditableCurrencyCell,
  EditableSelectCell,
} from "@/components/editable-cells"
import { STATUS_VARIANTS } from "@/lib/constants"

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
  const { data: entities, loading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const {
    data: liabilities,
    loading: liabilitiesLoading,
    create: createLiability,
    update: updateLiability,
    remove: deleteLiability,
  } = useLiabilities(selectedEntity || undefined)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Liability | null>(null)
  const [form, setForm] = useState(defaultFormData())

  // Payment recording state
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [payingLiability, setPayingLiability] = useState<Liability | null>(null)
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm())
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const handleAdd = () => {
    setForm(defaultFormData())
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (l: Liability) => {
    setEditing(l)
    setForm({
      liabilityType: l.liabilityType,
      creditor: l.creditor,
      description: l.description || "",
      originalAmount: l.originalAmount || "0",
      currentBalance: l.currentBalance || "0",
      currentBalanceDate: toDateInput(l.currentBalanceDate),
      interestRate: l.interestRate || "",
      monthlyPayment: l.monthlyPayment || "",
      dueDate: toDateInput(l.dueDate),
      paymentDueDay: l.paymentDueDay?.toString() || "",
      allocationClass: l.allocationClass || "PRINCIPAL",
      status: l.status,
      notes: l.notes || "",
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!selectedEntity) {
      alert("Please select an entity first");
      return;
    }

    // Validate required fields before saving
    if (!form.creditor.trim()) {
      alert("Creditor is required");
      return;
    }

    if (!form.originalAmount || parseFloat(form.originalAmount) <= 0) {
      alert("Original amount must be greater than 0");
      return;
    }

    const payload = {
      entityId: selectedEntity,
      liabilityType: form.liabilityType,
      creditor: form.creditor.trim(),
      description: form.description || null,
      originalAmount: form.originalAmount ? parseFloat(form.originalAmount).toString() : "0",
      currentBalance: form.currentBalance ? parseFloat(form.currentBalance).toString() : "0",
      currentBalanceDate: form.currentBalanceDate || null,
      interestRate: form.interestRate ? parseFloat(form.interestRate).toString() : null,
      monthlyPayment: form.monthlyPayment ? parseFloat(form.monthlyPayment).toString() : null,
      dueDate: form.dueDate || null,
      paymentDueDay: form.paymentDueDay ? parseInt(form.paymentDueDay) : null,
      allocationClass: form.allocationClass,
      status: form.status,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        await updateLiability(editing.id, payload)
      } else {
        await createLiability(payload)
      }
      setShowForm(false)
    } catch (err) {
      console.error("Failed to save liability:", err)
      alert("Failed to save liability: " + (err instanceof Error ? err.message : "Unknown error"))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this liability?")) return
    try {
      await deleteLiability(id)
    } catch (err) {
      console.error("Failed to delete liability:", err)
    }
  }

  // Payment handlers
  const handleRecordPayment = (l: Liability) => {
    setPayingLiability(l)
    setPaymentForm({
      ...defaultPaymentForm(),
      amount: l.monthlyPayment || "",
    })
    setShowPaymentForm(true)
  }

  const handleSavePayment = async () => {
    if (!payingLiability || !paymentForm.amount) return

    setRecordingPayment(true)
    try {
      const res = await fetch(`/api/liabilities/${payingLiability.id}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDate: paymentForm.paymentDate,
          amount: paymentForm.amount,
          principalPortion: paymentForm.principalPortion || null,
          interestPortion: paymentForm.interestPortion || null,
          escrowPortion: paymentForm.escrowPortion || null,
          paymentMethod: paymentForm.paymentMethod || null,
          checkNumber: paymentForm.checkNumber || null,
          confirmationNumber: paymentForm.confirmationNumber || null,
          notes: paymentForm.notes || null,
          createExpenseEntry: paymentForm.createExpenseEntry,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        // Update local state with new balance
        if (result.liability) {
          await updateLiability(payingLiability.id, {
            currentBalance: result.liability.currentBalance,
            currentBalanceDate: paymentForm.paymentDate,
          })
        }
        setShowPaymentForm(false)
        setPayingLiability(null)
        setPaymentForm(defaultPaymentForm())
      } else {
        const error = await res.json()
        console.error("Failed to record payment:", error)
      }
    } catch (err) {
      console.error("Failed to record payment:", err)
    } finally {
      setRecordingPayment(false)
    }
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
            <Button onClick={handleAdd}>
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
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Creditor</TableHead>
                        <TableHead>Original Amount</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead>Monthly Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liabilities.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {LIABILITY_TYPES.find((t) => t.value === l.liabilityType)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <EditableTextCell
                              value={l.creditor}
                              onSave={async (val) => {
                                await updateLiability(l.id, { creditor: val as string })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={l.originalAmount}
                              onSave={async (val) => {
                                await updateLiability(l.id, { originalAmount: val || "0" })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={l.currentBalance}
                              onSave={async (val) => {
                                await updateLiability(l.id, { currentBalance: val || "0" })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={l.monthlyPayment}
                              onSave={async (val) => {
                                await updateLiability(l.id, { monthlyPayment: val })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableSelectCell
                              value={l.status}
                              options={LIABILITY_STATUS}
                              variants={STATUS_VARIANTS}
                              onSave={async (val) => {
                                await updateLiability(l.id, { status: val })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableSelectCell
                              value={l.allocationClass || "PRINCIPAL"}
                              options={ALLOCATION_CLASS}
                              onSave={async (val) => {
                                await updateLiability(l.id, { allocationClass: val })
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {l.status === "ACTIVE" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleRecordPayment(l)}
                                      >
                                        <CreditCard className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Record Payment</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(l.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Liability" : "Add Liability"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Liability Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="liability-type">Liability Type *</Label>
                  <Select
                    value={form.liabilityType}
                    onValueChange={(v) => setForm({ ...form, liabilityType: v })}
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
                    value={form.creditor}
                    onChange={(e) => setForm({ ...form, creditor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Primary residence mortgage"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    value={form.originalAmount}
                    onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-balance">Current Balance *</Label>
                  <Input
                    id="current-balance"
                    placeholder="$"
                    value={form.currentBalance}
                    onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    placeholder="e.g., 4.5"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-payment">Monthly Payment</Label>
                  <Input
                    id="monthly-payment"
                    placeholder="$"
                    value={form.monthlyPayment}
                    onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })}
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
                    value={form.paymentDueDay}
                    onChange={(e) => setForm({ ...form, paymentDueDay: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Maturity/Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={form.dueDate || ""}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance-date">Balance As Of</Label>
                  <Input
                    id="balance-date"
                    type="date"
                    value={form.currentBalanceDate || ""}
                    onChange={(e) => setForm({ ...form, currentBalanceDate: e.target.value || null })}
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
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
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
                    value={form.allocationClass}
                    onValueChange={(v) => setForm({ ...form, allocationClass: v })}
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
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={(open) => {
        setShowPaymentForm(open)
        if (!open) {
          setPayingLiability(null)
          setPaymentForm(defaultPaymentForm())
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          {payingLiability && (
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
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Amount *</Label>
                    <Input
                      id="payment-amount"
                      placeholder="$0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
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
                      value={paymentForm.principalPortion}
                      onChange={(e) => setPaymentForm({ ...paymentForm, principalPortion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest-portion" className="text-xs">Interest</Label>
                    <Input
                      id="interest-portion"
                      placeholder="$"
                      value={paymentForm.interestPortion}
                      onChange={(e) => setPaymentForm({ ...paymentForm, interestPortion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="escrow-portion" className="text-xs">Escrow</Label>
                    <Input
                      id="escrow-portion"
                      placeholder="$"
                      value={paymentForm.escrowPortion}
                      onChange={(e) => setPaymentForm({ ...paymentForm, escrowPortion: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
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
                    {paymentForm.paymentMethod === "CHECK" ? "Check #" : "Confirmation #"}
                  </Label>
                  <Input
                    id="check-number"
                    placeholder={paymentForm.paymentMethod === "CHECK" ? "Check number" : "Confirmation"}
                    value={paymentForm.paymentMethod === "CHECK" ? paymentForm.checkNumber : paymentForm.confirmationNumber}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      ...(paymentForm.paymentMethod === "CHECK"
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
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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
                  checked={paymentForm.createExpenseEntry}
                  onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, createExpenseEntry: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(false)
                    setPayingLiability(null)
                    setPaymentForm(defaultPaymentForm())
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePayment}
                  disabled={!paymentForm.amount || recordingPayment}
                >
                  {recordingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Record Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
