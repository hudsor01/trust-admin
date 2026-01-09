"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { formatCurrency } from "../utils/formatters"
import {
  EditableTextCell,
  EditableCurrencyCell,
  EditableSelectCell,
} from "@/components/editable-cells"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// Import types and hooks from centralized location
import {
  useEntities,
  useBankAccounts,
  useInvestmentAccounts,
  type BankAccount,
  type InvestmentAccount,
} from "@/hooks"
import {
  bankAccountFormDefaults,
  investmentAccountFormDefaults,
  toDateInput,
} from "@/lib/form-factory"
import { TRANSFER_STATUS, STATUS_VARIANTS } from "@/lib/constants"

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

export function Accounts() {
  // Use centralized hooks for data fetching
  const { data: entities, loading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("bank")

  // Bank account hook
  const {
    data: bankAccounts,
    loading: bankLoading,
    create: createBankAccount,
    update: updateBankAccount,
    remove: deleteBankAccount,
  } = useBankAccounts(selectedEntity || undefined)
  const [showBankForm, setShowBankForm] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)

  // Investment account hook
  const {
    data: investmentAccounts,
    loading: investmentLoading,
    create: createInvestmentAccount,
    update: updateInvestmentAccount,
    remove: deleteInvestmentAccount,
  } = useInvestmentAccounts(selectedEntity || undefined)
  const [showInvestmentForm, setShowInvestmentForm] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<InvestmentAccount | null>(null)

  // Form data - use form factory defaults
  const [bankForm, setBankForm] = useState(bankAccountFormDefaults())
  const [investmentForm, setInvestmentForm] = useState(investmentAccountFormDefaults())

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const handleAddBank = () => {
    setBankForm(bankAccountFormDefaults())
    setEditingBank(null)
    setShowBankForm(true)
  }

  const handleEditBank = (b: BankAccount) => {
    setEditingBank(b)
    setBankForm({
      institution: b.institution,
      accountType: b.accountType,
      accountName: b.accountName || "",
      accountNumber: b.accountNumber || "",
      routingNumber: b.routingNumber || "",
      dodValue: b.dodValue || "",
      dodValueDate: toDateInput(b.dodValueDate),
      status: b.status,
      transferStatus: b.transferStatus,
      notes: b.notes || "",
    })
    setShowBankForm(true)
  }

  const handleAddInvestment = () => {
    setInvestmentForm(investmentAccountFormDefaults())
    setEditingInvestment(null)
    setShowInvestmentForm(true)
  }

  const handleEditInvestment = (i: InvestmentAccount) => {
    setEditingInvestment(i)
    setInvestmentForm({
      institution: i.institution,
      accountType: i.accountType,
      accountName: i.accountName || "",
      accountNumber: i.accountNumber || "",
      dodValue: i.dodValue || "",
      dodValueDate: toDateInput(i.dodValueDate),
      costBasis: i.costBasis || "",
      status: i.status,
      transferStatus: i.transferStatus,
      notes: i.notes || "",
    })
    setShowInvestmentForm(true)
  }

  const handleSaveBank = async () => {
    if (!selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      institution: bankForm.institution,
      accountType: bankForm.accountType,
      accountName: bankForm.accountName || null,
      accountNumber: bankForm.accountNumber,
      routingNumber: bankForm.routingNumber || null,
      dodValue: bankForm.dodValue || null,
      dodValueDate: bankForm.dodValueDate || null,
      status: bankForm.status,
      transferStatus: bankForm.transferStatus,
      notes: bankForm.notes || null,
    }

    try {
      if (editingBank) {
        await updateBankAccount(editingBank.id, payload)
      } else {
        await createBankAccount(payload)
      }
      setShowBankForm(false)
    } catch (err) {
      console.error("Failed to save bank account:", err)
    }
  }

  const handleSaveInvestment = async () => {
    if (!selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      institution: investmentForm.institution,
      accountType: investmentForm.accountType,
      accountName: investmentForm.accountName || null,
      accountNumber: investmentForm.accountNumber,
      dodValue: investmentForm.dodValue || null,
      dodValueDate: investmentForm.dodValueDate || null,
      costBasis: investmentForm.costBasis || null,
      status: investmentForm.status,
      transferStatus: investmentForm.transferStatus,
      notes: investmentForm.notes || null,
    }

    try {
      if (editingInvestment) {
        await updateInvestmentAccount(editingInvestment.id, payload)
      } else {
        await createInvestmentAccount(payload)
      }
      setShowInvestmentForm(false)
    } catch (err) {
      console.error("Failed to save investment account:", err)
    }
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return
    try {
      await deleteBankAccount(id)
    } catch (err) {
      console.error("Failed to delete bank account:", err)
    }
  }

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment account?")) return
    try {
      await deleteInvestmentAccount(id)
    } catch (err) {
      console.error("Failed to delete investment account:", err)
    }
  }

  // Inline update handlers for editable cells
  const handleUpdateBank = async (id: string, updates: Partial<BankAccount>) => {
    await updateBankAccount(id, updates)
  }

  const handleUpdateInvestment = async (id: string, updates: Partial<InvestmentAccount>) => {
    await updateInvestmentAccount(id, updates)
  }

  const loading = entitiesLoading || bankLoading || investmentLoading

  if (entitiesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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

            {bankAccounts.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    No bank accounts. Click Add to create one.
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
                          <TableHead>Institution</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Account #</TableHead>
                          <TableHead>DOD Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Transfer</TableHead>
                          <TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAccounts.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <EditableTextCell
                                value={a.institution}
                                onSave={async (val) => {
                                  await updateBankAccount(a.id, { institution: val as string })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableTextCell
                                value={a.accountName}
                                onSave={async (val) => {
                                  await updateBankAccount(a.id, { accountName: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {BANK_ACCOUNT_TYPES.find((t) => t.value === a.accountType)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{maskAccountNumber(a.accountNumber || "")}</code>
                            </TableCell>
                            <TableCell>
                              <EditableCurrencyCell
                                value={a.dodValue}
                                onSave={async (val) => {
                                  await updateBankAccount(a.id, { dodValue: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableSelectCell
                                value={a.status}
                                options={ACCOUNT_STATUS}
                                variants={STATUS_VARIANTS}
                                onSave={async (val) => {
                                  await updateBankAccount(a.id, { status: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableSelectCell
                                value={a.transferStatus}
                                options={TRANSFER_STATUS}
                                variants={STATUS_VARIANTS}
                                onSave={async (val) => {
                                  await updateBankAccount(a.id, { transferStatus: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteBank(a.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="investment" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddInvestment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Investment Account
              </Button>
            </div>

            {investmentAccounts.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    No investment accounts. Click Add to create one.
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
                          <TableHead>Institution</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Account #</TableHead>
                          <TableHead>DOD Value</TableHead>
                          <TableHead>Cost Basis</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Transfer</TableHead>
                          <TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investmentAccounts.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <EditableTextCell
                                value={a.institution}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { institution: val as string })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableTextCell
                                value={a.accountName}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { accountName: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {INVESTMENT_ACCOUNT_TYPES.find((t) => t.value === a.accountType)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{maskAccountNumber(a.accountNumber || "")}</code>
                            </TableCell>
                            <TableCell>
                              <EditableCurrencyCell
                                value={a.dodValue}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { dodValue: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableCurrencyCell
                                value={a.costBasis}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { costBasis: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableSelectCell
                                value={a.status}
                                options={ACCOUNT_STATUS}
                                variants={STATUS_VARIANTS}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { status: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <EditableSelectCell
                                value={a.transferStatus}
                                options={TRANSFER_STATUS}
                                variants={STATUS_VARIANTS}
                                onSave={async (val) => {
                                  await updateInvestmentAccount(a.id, { transferStatus: val })
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteInvestment(a.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Bank Account Form Dialog */}
      <Dialog open={showBankForm} onOpenChange={setShowBankForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBank ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Account Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-institution">Institution *</Label>
                  <Input
                    id="bank-institution"
                    placeholder="e.g., Chase, Wells Fargo"
                    value={bankForm.institution}
                    onChange={(e) => setBankForm({ ...bankForm, institution: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-type">Account Type *</Label>
                  <Select
                    value={bankForm.accountType}
                    onValueChange={(v) => setBankForm({ ...bankForm, accountType: v })}
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
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-number">Account Number *</Label>
                  <Input
                    id="bank-number"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-routing">Routing Number</Label>
                  <Input
                    id="bank-routing"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value })}
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
                    value={bankForm.dodValue}
                    onChange={(e) => setBankForm({ ...bankForm, dodValue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-dod-date">DOD Value Date</Label>
                  <Input
                    id="bank-dod-date"
                    type="date"
                    value={bankForm.dodValueDate || ""}
                    onChange={(e) => setBankForm({ ...bankForm, dodValueDate: e.target.value || null })}
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
                    value={bankForm.status}
                    onValueChange={(v) => setBankForm({ ...bankForm, status: v })}
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
                    value={bankForm.transferStatus}
                    onValueChange={(v) => setBankForm({ ...bankForm, transferStatus: v })}
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
                value={bankForm.notes}
                onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowBankForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBank}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investment Account Form Dialog */}
      <Dialog open={showInvestmentForm} onOpenChange={setShowInvestmentForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvestment ? "Edit Investment Account" : "Add Investment Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Account Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-institution">Institution *</Label>
                  <Input
                    id="inv-institution"
                    placeholder="e.g., Fidelity, Schwab"
                    value={investmentForm.institution}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, institution: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-type">Account Type *</Label>
                  <Select
                    value={investmentForm.accountType}
                    onValueChange={(v) => setInvestmentForm({ ...investmentForm, accountType: v })}
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
                    value={investmentForm.accountName}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-number">Account Number *</Label>
                  <Input
                    id="inv-number"
                    value={investmentForm.accountNumber}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, accountNumber: e.target.value })}
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
                    value={investmentForm.dodValue}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, dodValue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-dod-date">DOD Value Date</Label>
                  <Input
                    id="inv-dod-date"
                    type="date"
                    value={investmentForm.dodValueDate || ""}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, dodValueDate: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-cost-basis">Cost Basis</Label>
                  <Input
                    id="inv-cost-basis"
                    placeholder="$ (for step-up)"
                    value={investmentForm.costBasis}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, costBasis: e.target.value })}
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
                    value={investmentForm.status}
                    onValueChange={(v) => setInvestmentForm({ ...investmentForm, status: v })}
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
                    value={investmentForm.transferStatus}
                    onValueChange={(v) => setInvestmentForm({ ...investmentForm, transferStatus: v })}
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
                value={investmentForm.notes}
                onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInvestmentForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInvestment}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
