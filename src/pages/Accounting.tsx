"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Trash2, Plus, Pencil, Loader2, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "../utils/formatters"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EditableTextCell, EditableCurrencyCell } from "@/components/editable-cells"

interface TrustAccountingEntry {
  id: string
  entityId: string
  accountingDate: string
  entryType: string
  incomeType: string | null
  expenseType: string | null
  amount: string
  description: string | null
  isPrincipal: boolean
  taxDeductible: boolean
  fiscalYear: number | null
  referenceNumber: string | null
  sourceAssetType: string | null
  sourceAssetId: string | null
}

interface Entity {
  id: string
  name: string
  dod: string | null
}

interface BankAccount {
  id: string
  bankName: string
  accountType: string
  currentBalance: string | null
}

interface InvestmentAccount {
  id: string
  firmName: string
  accountType: string
  currentBalance: string | null
}

interface Property {
  id: string
  streetAddress: string
  estimatedValue: string | null
}

interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  estimatedValue: string | null
}

interface Liability {
  id: string
  liabilityType: string
  creditor: string
  originalAmount: string
  currentBalance: string
  liabilityStatus: string
}

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

export function Accounting() {
  const [entries, setEntries] = useState<TrustAccountingEntry[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TrustAccountingEntry | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [formData, setFormData] = useState({
    accountingDate: new Date().toISOString().split("T")[0],
    entryType: "INCOME",
    incomeType: "INTEREST",
    expenseType: "PROFESSIONAL_FEE",
    amount: "",
    description: "",
    isPrincipal: false,
    taxDeductible: false,
    referenceNumber: "",
  })
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    fetchEntities()
  }, [])

  useEffect(() => {
    if (selectedEntity) {
      fetchEntries(selectedEntity)
    }
  }, [selectedEntity])

  const fetchEntities = async () => {
    try {
      const res = await fetch("/api/entities")
      if (res.ok) {
        const data = await res.json()
        const sorted = data.sort((a: Entity, b: Entity) => {
          if (a.dod && !b.dod) return -1
          if (!a.dod && b.dod) return 1
          if (a.name.includes("Hudson") && !b.name.includes("Hudson")) return -1
          if (!a.name.includes("Hudson") && b.name.includes("Hudson")) return 1
          return 0
        })
        setEntities(sorted)
        if (sorted.length > 0) {
          setSelectedEntity(sorted[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error)
    }
  }

  const fetchEntries = async (entityId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trust-accounting?entityId=${entityId}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveEntry = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0 || !selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      accountingDate: formData.accountingDate,
      entryType: formData.entryType,
      incomeType: formData.entryType === "INCOME" ? formData.incomeType : null,
      expenseType: formData.entryType === "EXPENSE" ? formData.expenseType : null,
      amount: formData.amount,
      description: formData.description || null,
      isPrincipal: formData.isPrincipal,
      taxDeductible: formData.taxDeductible,
      referenceNumber: formData.referenceNumber || null,
      fiscalYear: formData.accountingDate
        ? new Date(formData.accountingDate).getFullYear()
        : new Date().getFullYear(),
    }

    try {
      let res
      if (editingEntry) {
        res = await fetch(`/api/trust-accounting/${editingEntry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/trust-accounting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        setShowForm(false)
        resetForm()
        fetchEntries(selectedEntity)
      }
    } catch (error) {
      console.error("Failed to save entry:", error)
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const res = await fetch(`/api/trust-accounting/${id}`, { method: "DELETE" })
      if (res.ok && selectedEntity) {
        fetchEntries(selectedEntity)
      }
    } catch (error) {
      console.error("Failed to delete entry:", error)
    }
  }

  const updateEntry = async (id: string, updates: Partial<TrustAccountingEntry>) => {
    const res = await fetch(`/api/trust-accounting/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error("Failed to update")
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)))
  }

  const resetForm = () => {
    setFormData({
      accountingDate: new Date().toISOString().split("T")[0],
      entryType: "INCOME",
      incomeType: "INTEREST",
      expenseType: "PROFESSIONAL_FEE",
      amount: "",
      description: "",
      isPrincipal: false,
      taxDeductible: false,
      referenceNumber: "",
    })
    setEditingEntry(null)
  }

  const openEditForm = (entry: TrustAccountingEntry) => {
    setEditingEntry(entry)
    setFormData({
      accountingDate: entry.accountingDate?.split("T")[0] || "",
      entryType: entry.entryType,
      incomeType: entry.incomeType || "INTEREST",
      expenseType: entry.expenseType || "PROFESSIONAL_FEE",
      amount: entry.amount,
      description: entry.description || "",
      isPrincipal: entry.isPrincipal,
      taxDeductible: entry.taxDeductible,
      referenceNumber: entry.referenceNumber || "",
    })
    setShowForm(true)
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

      const [bankAccounts, investmentAccounts, homesteads, rentalProperties, vehicles, liabilities] =
        await Promise.all([
          bankAccountsRes.json() as Promise<BankAccount[]>,
          investmentAccountsRes.json() as Promise<InvestmentAccount[]>,
          homesteadsRes.json() as Promise<Property[]>,
          rentalPropertiesRes.json() as Promise<Property[]>,
          vehiclesRes.json() as Promise<Vehicle[]>,
          liabilitiesRes.json() as Promise<Liability[]>,
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
    h1 {
      text-align: center;
      font-size: 18pt;
      margin-bottom: 0.5em;
    }
    h2 {
      font-size: 14pt;
      border-bottom: 1px solid #000;
      padding-bottom: 0.25em;
      margin-top: 1.5em;
    }
    h3 { font-size: 12pt; margin-top: 1em; }
    .header-info {
      text-align: center;
      margin-bottom: 2em;
    }
    .legal-citation {
      font-style: italic;
      font-size: 10pt;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th { background: #f5f5f5; font-weight: bold; }
    .amount { text-align: right; font-family: monospace; }
    .total-row { font-weight: bold; background: #f9f9f9; }
    .subtotal-row { font-weight: bold; }
    .section-total {
      margin-top: 0.5em;
      padding: 0.5em;
      background: #f5f5f5;
      text-align: right;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #000;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Report</button>

  <h1>TRUST ACCOUNTING</h1>
  <div class="header-info">
    <p><strong>${entity?.name || "Trust"}</strong></p>
    <p>Report Date: ${reportDate}</p>
    <p class="legal-citation">Prepared pursuant to Texas Property Code § 113.152</p>
  </div>

  <!-- 113.152(2) - Receipts and Disbursements by Principal/Income -->
  <h2>Section 1: Receipts and Disbursements</h2>
  <p class="legal-citation">Per Texas Property Code § 113.152(2): An itemized list of receipts and disbursements, categorized by principal and income.</p>

  <h3>A. Receipts</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Classification</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${incomeEntries
        .sort((a, b) => new Date(a.accountingDate).getTime() - new Date(b.accountingDate).getTime())
        .map((e) => `
          <tr>
            <td>${formatDate(e.accountingDate)}</td>
            <td>${e.description || "—"}</td>
            <td>${INCOME_TYPES.find((t) => t.value === e.incomeType)?.label || e.incomeType}</td>
            <td>${e.isPrincipal ? "Principal" : "Income"}</td>
            <td class="amount">${formatCurrency(e.amount)}</td>
          </tr>
        `).join("")}
      <tr class="subtotal-row">
        <td colspan="3">Principal Receipts</td>
        <td>Principal</td>
        <td class="amount">${formatCurrency(principalReceipts)}</td>
      </tr>
      <tr class="subtotal-row">
        <td colspan="3">Income Receipts</td>
        <td>Income</td>
        <td class="amount">${formatCurrency(incomeReceipts)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="4">Total Receipts</td>
        <td class="amount">${formatCurrency(incomeTotal)}</td>
      </tr>
    </tbody>
  </table>

  <h3>B. Disbursements</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Classification</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${expenseEntries
        .sort((a, b) => new Date(a.accountingDate).getTime() - new Date(b.accountingDate).getTime())
        .map((e) => `
          <tr>
            <td>${formatDate(e.accountingDate)}</td>
            <td>${e.description || "—"}</td>
            <td>${EXPENSE_TYPES.find((t) => t.value === e.expenseType)?.label || e.expenseType}</td>
            <td>${e.isPrincipal ? "Principal" : "Income"}</td>
            <td class="amount">${formatCurrency(e.amount)}</td>
          </tr>
        `).join("")}
      <tr class="subtotal-row">
        <td colspan="3">Principal Disbursements</td>
        <td>Principal</td>
        <td class="amount">${formatCurrency(principalDisbursements)}</td>
      </tr>
      <tr class="subtotal-row">
        <td colspan="3">Income Disbursements</td>
        <td>Income</td>
        <td class="amount">${formatCurrency(incomeDisbursements)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="4">Total Disbursements</td>
        <td class="amount">${formatCurrency(expenseTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-total">
    <strong>Net Change: ${formatCurrency(netIncome)}</strong>
  </div>

  <!-- 113.152(3) - Property List with Values -->
  <h2>Section 2: Trust Property</h2>
  <p class="legal-citation">Per Texas Property Code § 113.152(3): A list and description of all property forming the trust estate, with estimated current values.</p>

  <h3>A. Real Property</h3>
  <table>
    <thead>
      <tr>
        <th>Property Type</th>
        <th>Description</th>
        <th class="amount">Estimated Value</th>
      </tr>
    </thead>
    <tbody>
      ${homesteads.map((p) => `
        <tr>
          <td>Homestead</td>
          <td>${p.streetAddress}</td>
          <td class="amount">${p.estimatedValue ? formatCurrency(p.estimatedValue) : "—"}</td>
        </tr>
      `).join("")}
      ${rentalProperties.map((p) => `
        <tr>
          <td>Rental Property</td>
          <td>${p.streetAddress}</td>
          <td class="amount">${p.estimatedValue ? formatCurrency(p.estimatedValue) : "—"}</td>
        </tr>
      `).join("")}
      ${homesteads.length === 0 && rentalProperties.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#666;">No real property recorded</td></tr>' : ''}
    </tbody>
  </table>

  <h3>B. Vehicles</h3>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount">Estimated Value</th>
      </tr>
    </thead>
    <tbody>
      ${vehicles.map((v) => `
        <tr>
          <td>${v.year} ${v.make} ${v.model}</td>
          <td class="amount">${v.estimatedValue ? formatCurrency(v.estimatedValue) : "—"}</td>
        </tr>
      `).join("")}
      ${vehicles.length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#666;">No vehicles recorded</td></tr>' : ''}
    </tbody>
  </table>

  <!-- 113.152(4) - Cash and Depositories -->
  <h2>Section 3: Cash on Hand</h2>
  <p class="legal-citation">Per Texas Property Code § 113.152(4): The amount of cash on hand and the name of the depository where the cash is kept.</p>

  <h3>A. Bank Accounts</h3>
  <table>
    <thead>
      <tr>
        <th>Depository</th>
        <th>Account Type</th>
        <th class="amount">Current Balance</th>
      </tr>
    </thead>
    <tbody>
      ${bankAccounts.map((a) => `
        <tr>
          <td>${a.bankName}</td>
          <td>${a.accountType}</td>
          <td class="amount">${a.currentBalance ? formatCurrency(a.currentBalance) : "—"}</td>
        </tr>
      `).join("")}
      ${bankAccounts.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#666;">No bank accounts recorded</td></tr>' : ''}
      ${bankAccounts.length > 0 ? `
        <tr class="total-row">
          <td colspan="2">Total Bank Accounts</td>
          <td class="amount">${formatCurrency(bankAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0))}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <h3>B. Investment Accounts</h3>
  <table>
    <thead>
      <tr>
        <th>Firm</th>
        <th>Account Type</th>
        <th class="amount">Current Balance</th>
      </tr>
    </thead>
    <tbody>
      ${investmentAccounts.map((a) => `
        <tr>
          <td>${a.firmName}</td>
          <td>${a.accountType}</td>
          <td class="amount">${a.currentBalance ? formatCurrency(a.currentBalance) : "—"}</td>
        </tr>
      `).join("")}
      ${investmentAccounts.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#666;">No investment accounts recorded</td></tr>' : ''}
      ${investmentAccounts.length > 0 ? `
        <tr class="total-row">
          <td colspan="2">Total Investment Accounts</td>
          <td class="amount">${formatCurrency(investmentAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0))}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <!-- 113.152(5) - Liabilities -->
  <h2>Section 4: Trust Liabilities</h2>
  <p class="legal-citation">Per Texas Property Code § 113.152(5): All known liabilities owed by the trust.</p>

  <table>
    <thead>
      <tr>
        <th>Creditor</th>
        <th>Type</th>
        <th>Status</th>
        <th class="amount">Original Amount</th>
        <th class="amount">Current Balance</th>
      </tr>
    </thead>
    <tbody>
      ${liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").map((l) => `
        <tr>
          <td>${l.creditor}</td>
          <td>${l.liabilityType.replace(/_/g, " ")}</td>
          <td>${l.liabilityStatus.replace(/_/g, " ")}</td>
          <td class="amount">${formatCurrency(l.originalAmount)}</td>
          <td class="amount">${formatCurrency(l.currentBalance)}</td>
        </tr>
      `).join("")}
      ${liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#666;">No outstanding liabilities</td></tr>' : ''}
      ${liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").length > 0 ? `
        <tr class="total-row">
          <td colspan="4">Total Liabilities</td>
          <td class="amount">${formatCurrency(liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").reduce((sum, l) => sum + parseFloat(l.currentBalance || "0"), 0))}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <!-- Summary -->
  <h2>Summary</h2>
  <table>
    <tbody>
      <tr>
        <td>Total Cash & Investments</td>
        <td class="amount">${formatCurrency(
          bankAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0) +
          investmentAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0)
        )}</td>
      </tr>
      <tr>
        <td>Total Liabilities</td>
        <td class="amount">(${formatCurrency(liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").reduce((sum, l) => sum + parseFloat(l.currentBalance || "0"), 0))})</td>
      </tr>
      <tr class="total-row">
        <td>Net Cash Position</td>
        <td class="amount">${formatCurrency(
          bankAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0) +
          investmentAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0) -
          liabilities.filter((l) => l.liabilityStatus !== "PAID_OFF").reduce((sum, l) => sum + parseFloat(l.currentBalance || "0"), 0)
        )}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 3em; border-top: 1px solid #000; padding-top: 1em;">
    <p>This accounting is submitted pursuant to Texas Property Code § 113.151 and includes all information required by § 113.152.</p>
    <p style="margin-top: 2em;">
      Trustee Signature: _________________________________ Date: _____________
    </p>
  </div>
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
  }, [
    selectedEntity,
    entities,
    incomeEntries,
    expenseEntries,
    incomeTotal,
    expenseTotal,
    netIncome,
    principalReceipts,
    incomeReceipts,
    principalDisbursements,
    incomeDisbursements,
  ])

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
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-[250px]">
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
          <Button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
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
                  netIncome >= 0 ? "text-success" : "text-destructive"
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
                  <span className="font-medium tabular-nums">{formatCurrency(principalReceipts)}</span>
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
                  <span className="font-medium tabular-nums">{formatCurrency(principalDisbursements)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Income</span>
                  <span className="font-medium tabular-nums">{formatCurrency(incomeDisbursements)}</span>
                </div>
                <div className="flex justify-between items-center py-2 font-medium">
                  <span className="text-sm">Total</span>
                  <span className="tabular-nums text-destructive">{formatCurrency(expenseTotal)}</span>
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
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No entries recorded yet. Click "Add Entry" to start tracking.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Flags</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {formatDate(entry.accountingDate)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.entryType === "INCOME" ? "default" : "destructive"}
                              className={cn(
                                entry.entryType === "INCOME" && "bg-success hover:bg-success/90"
                              )}
                            >
                              {entry.entryType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.entryType === "INCOME"
                              ? INCOME_TYPES.find((t) => t.value === entry.incomeType)?.label ||
                                entry.incomeType
                              : EXPENSE_TYPES.find((t) => t.value === entry.expenseType)?.label ||
                                entry.expenseType}
                          </TableCell>
                          <TableCell>
                            <EditableTextCell
                              value={entry.description}
                              onSave={async (v) =>
                                updateEntry(entry.id, { description: v || null })
                              }
                              placeholder="Add description"
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right",
                              entry.entryType === "INCOME" ? "text-success" : "text-destructive"
                            )}
                          >
                            <EditableCurrencyCell
                              value={entry.amount}
                              onSave={async (v) => updateEntry(entry.id, { amount: v || "" })}
                            />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditForm(entry)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => deleteEntry(entry.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Entry Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={() => {
          setShowForm(false)
          resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.accountingDate}
                onChange={(e) => setFormData({ ...formData, accountingDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryType">Entry Type</Label>
              <Select
                value={formData.entryType}
                onValueChange={(v) => setFormData({ ...formData, entryType: v })}
              >
                <SelectTrigger id="entryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.entryType === "INCOME" ? (
              <div className="space-y-2">
                <Label htmlFor="incomeType">Income Category</Label>
                <Select
                  value={formData.incomeType}
                  onValueChange={(v) => setFormData({ ...formData, incomeType: v })}
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="expenseType">Expense Category</Label>
                <Select
                  value={formData.expenseType}
                  onValueChange={(v) => setFormData({ ...formData, expenseType: v })}
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

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="$0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="Check #, invoice #, etc."
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPrincipal">Principal (not income)</Label>
                <p className="text-xs text-muted-foreground">
                  Mark if this is a return of principal, not taxable income
                </p>
              </div>
              <Switch
                id="isPrincipal"
                checked={formData.isPrincipal}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrincipal: checked })}
              />
            </div>

            {formData.entryType === "EXPENSE" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="taxDeductible">Tax Deductible</Label>
                  <p className="text-xs text-muted-foreground">
                    Mark if this expense is deductible on Form 1041
                  </p>
                </div>
                <Switch
                  id="taxDeductible"
                  checked={formData.taxDeductible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, taxDeductible: checked })
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveEntry}>{editingEntry ? "Update" : "Add"} Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
