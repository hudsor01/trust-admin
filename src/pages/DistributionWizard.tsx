"use client"

/**
 * Distribution Wizard
 *
 * Step-by-step workflow for distributing income to beneficiaries
 * based on their share percentages after deducting expenses and fees.
 */

import { useState, useEffect, useMemo } from "react"
import {
  Loader2,
  Calculator,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEntities, useBeneficiaries } from "@/hooks"
import { formatCurrency, formatPercent } from "@/utils/formatters"
import {
  calculateDistribution,
  type DistributionCalculation,
  type Beneficiary,
} from "@/lib/distribution-calculator"

type Step = "setup" | "review" | "confirm" | "complete"

interface PeriodData {
  grossIncome: number
  totalExpenses: number
  trustAssetValue: number
}

export function DistributionWizard() {
  const { data: entities, loading: entitiesLoading } = useEntities()

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const { data: beneficiariesRaw } = useBeneficiaries(selectedEntity ?? undefined)

  // Map to distribution calculator format
  const beneficiaries: Beneficiary[] = useMemo(() => {
    return (beneficiariesRaw || []).map((b) => ({
      id: b.id,
      firstName: b.firstName,
      lastName: b.lastName,
      sharePercent: parseFloat(b.sharePercent || "0"),
    }))
  }, [beneficiariesRaw])

  const [step, setStep] = useState<Step>("setup")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Setup inputs
  const [grossIncome, setGrossIncome] = useState("")
  const [totalExpenses, setTotalExpenses] = useState("")
  const [trustAssetValue, setTrustAssetValue] = useState("")

  // Auto-calculated values
  const [autoGrossIncome, setAutoGrossIncome] = useState<number | null>(null)
  const [autoTotalExpenses, setAutoTotalExpenses] = useState<number | null>(null)
  const [autoTrustAssetValue, setAutoTrustAssetValue] = useState<number | null>(null)
  const [loadingAutoValues, setLoadingAutoValues] = useState(false)
  const [periodMonths, setPeriodMonths] = useState("12")
  const [distributionDate, setDistributionDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0] || ""
  })

  // Calculation result
  const [calculation, setCalculation] = useState<DistributionCalculation | null>(null)

  // Function to calculate auto-values from accounting records
  const calculateAutoValues = async () => {
    if (!selectedEntity) return

    setLoadingAutoValues(true)

    try {
      // Fetch trust accounting entries for the selected entity
      const response = await fetch(`/api/trust-accounting?entityId=${selectedEntity}`)
      if (!response.ok) {
        throw new Error("Failed to fetch accounting records")
      }

      const entries = await response.json()

      // Calculate gross income (sum of all income entries)
      const incomeEntries = entries.filter((entry: any) => entry.entryType === "INCOME")
      const grossIncomeSum = incomeEntries.reduce((sum: number, entry: any) => {
        return sum + parseFloat(entry.amount || "0")
      }, 0)

      // Calculate total expenses (sum of all expense entries)
      const expenseEntries = entries.filter((entry: any) => entry.entryType === "EXPENSE")
      const expenseSum = expenseEntries.reduce((sum: number, entry: any) => {
        return sum + parseFloat(entry.amount || "0")
      }, 0)

      // Calculate trust asset value (sum of all assets)
      let totalAssets = 0

      // Process each asset type
      const assetTypes = [
        { endpoint: `/api/bank-accounts?entityId=${selectedEntity}`, valueField: 'currentBalance' },
        { endpoint: `/api/investment-accounts?entityId=${selectedEntity}`, valueField: 'currentBalance' },
        { endpoint: `/api/homesteads?entityId=${selectedEntity}`, valueField: 'dodValue' },
        { endpoint: `/api/rental-properties?entityId=${selectedEntity}`, valueField: 'dodValue' },
        { endpoint: `/api/vehicles?entityId=${selectedEntity}`, valueField: 'dodValue' },
        { endpoint: `/api/artwork?entityId=${selectedEntity}`, valueField: 'dodValue' },
        { endpoint: `/api/personal-property?entityId=${selectedEntity}`, valueField: 'dodValue' },
      ]

      for (const assetType of assetTypes) {
        try {
          const response = await fetch(assetType.endpoint)
          if (response.ok) {
            const data = await response.json()
            for (const asset of data) {
              const value = parseFloat(asset[assetType.valueField] || "0")
              if (!isNaN(value)) {
                totalAssets += value
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching ${assetType.endpoint}:`, error)
        }
      }

      setAutoGrossIncome(grossIncomeSum)
      setAutoTotalExpenses(expenseSum)
      setAutoTrustAssetValue(totalAssets)

      // If user hasn't manually entered values, use auto-calculated ones
      if (!grossIncome) {
        setGrossIncome(grossIncomeSum.toString())
      }
      if (!totalExpenses) {
        setTotalExpenses(expenseSum.toString())
      }
      if (!trustAssetValue) {
        setTrustAssetValue(totalAssets.toString())
      }
    } catch (error) {
      console.error("Error calculating auto values:", error)
    } finally {
      setLoadingAutoValues(false)
    }
  }

  // Calculate when inputs change in review step
  useEffect(() => {
    if (step === "review" && beneficiaries.length > 0) {
      const gross = parseFloat(grossIncome) || 0
      const expenses = parseFloat(totalExpenses) || 0
      const assets = parseFloat(trustAssetValue) || 0
      const months = parseInt(periodMonths) || 12

      const result = calculateDistribution({
        grossIncome: gross,
        totalExpenses: expenses,
        trustAssetValue: assets,
        periodMonths: months,
        beneficiaries,
      })

      setCalculation(result)
    }
  }, [step, grossIncome, totalExpenses, trustAssetValue, periodMonths, beneficiaries])

  // Calculate auto-values when entity is selected
  useEffect(() => {
    if (selectedEntity) {
      calculateAutoValues()
    }
  }, [selectedEntity])

  const handleNext = () => {
    if (step === "setup") {
      if (!selectedEntity) {
        setError("Please select an entity")
        return
      }
      if (!grossIncome || parseFloat(grossIncome) <= 0) {
        setError("Please enter gross income")
        return
      }
      setError(null)
      setStep("review")
    } else if (step === "review") {
      setStep("confirm")
    }
  }

  const handleBack = () => {
    if (step === "review") setStep("setup")
    if (step === "confirm") setStep("review")
  }

  const handleConfirm = async () => {
    if (!calculation || !selectedEntity) return

    setLoading(true)
    setError(null)

    try {
      // Create distributions for each beneficiary
      const distributions = calculation.beneficiaryShares
        .filter((s) => s.amount > 0)
        .map((share) => ({
          beneficiaryId: share.beneficiaryId,
          entityId: selectedEntity,
          distributionDate: new Date(distributionDate).toISOString(),
          amount: share.amount.toFixed(2),
          distributionType: "INCOME",
          paymentMethod: "CHECK",
          isShareDistribution: true,
          notes: `Share distribution (${share.sharePercent}%)`,
        }))

      // Post each distribution
      for (const dist of distributions) {
        const res = await fetch("/api/distributions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dist),
        })

        if (!res.ok) {
          throw new Error(`Failed to create distribution for ${dist.beneficiaryId}`)
        }
      }

      setStep("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create distributions")
    } finally {
      setLoading(false)
    }
  }

  const resetWizard = () => {
    setStep("setup")
    setGrossIncome("")
    setTotalExpenses("")
    setTrustAssetValue("")
    setPeriodMonths("12")
    setCalculation(null)
    setError(null)
  }

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Distribution Wizard</h2>
        <p className="text-sm text-muted-foreground">
          Calculate and distribute income to beneficiaries based on their shares
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {(["setup", "review", "confirm", "complete"] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : s === "complete" && step === "complete"
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s === "complete" && step === "complete" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div className="w-12 h-0.5 bg-muted mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {step === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Setup Distribution
            </CardTitle>
            <CardDescription>
              Enter the income, expenses, and period for this distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entity Selection */}
            <div className="space-y-2">
              <Label>Trust Entity *</Label>
              <Select value={selectedEntity || ""} onValueChange={setSelectedEntity}>
                <SelectTrigger>
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

            {/* Period */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Period Length</Label>
                <Select value={periodMonths} onValueChange={setPeriodMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monthly</SelectItem>
                    <SelectItem value="3">Quarterly</SelectItem>
                    <SelectItem value="6">Semi-Annual</SelectItem>
                    <SelectItem value="12">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Distribution Date</Label>
                <Input
                  type="date"
                  value={distributionDate}
                  onChange={(e) => setDistributionDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Financial Inputs */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Gross Income *</Label>
                  {autoGrossIncome !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGrossIncome(autoGrossIncome.toString())}
                      disabled={loadingAutoValues}
                      className="h-6 px-2 text-xs"
                    >
                      {loadingAutoValues ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Use Auto
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    value={grossIncome}
                    onChange={(e) => {
                      // Allow only numbers and decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setGrossIncome(value);
                      }
                    }}
                    placeholder="0.00"
                    className={`pl-7 ${autoGrossIncome !== null ? 'bg-blue-50' : ''}`} // Visual indicator when auto-value exists
                    onWheel={(e) => e.currentTarget.blur()} // Prevents value change when scrolling
                    readOnly // Make the field readonly to prevent direct editing
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Total income for the period (rent, dividends, etc.)
                </p>
                {autoGrossIncome !== null && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {formatCurrency(autoGrossIncome.toString())}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Total Expenses</Label>
                  {autoTotalExpenses !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTotalExpenses(autoTotalExpenses.toString())}
                      disabled={loadingAutoValues}
                      className="h-6 px-2 text-xs"
                    >
                      {loadingAutoValues ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Use Auto
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    value={totalExpenses}
                    onChange={(e) => {
                      // Allow only numbers and decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setTotalExpenses(value);
                      }
                    }}
                    placeholder="0.00"
                    className={`pl-7 ${autoTotalExpenses !== null ? 'bg-blue-50' : ''}`} // Visual indicator when auto-value exists
                    onWheel={(e) => e.currentTarget.blur()} // Prevents value change when scrolling
                    readOnly // Make the field readonly to prevent direct editing
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Operating expenses for the period
                </p>
                {autoTotalExpenses !== null && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {formatCurrency(autoTotalExpenses.toString())}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Trust Asset Value</Label>
                  {autoTrustAssetValue !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrustAssetValue(autoTrustAssetValue.toString())}
                      disabled={loadingAutoValues}
                      className="h-6 px-2 text-xs"
                    >
                      {loadingAutoValues ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Use Auto
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    value={trustAssetValue}
                    onChange={(e) => {
                      // Allow only numbers and decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setTrustAssetValue(value);
                      }
                    }}
                    placeholder="0.00"
                    className={`pl-7 ${autoTrustAssetValue !== null ? 'bg-blue-50' : ''}`} // Visual indicator when auto-value exists
                    onWheel={(e) => e.currentTarget.blur()} // Prevents value change when scrolling
                    readOnly // Make the field readonly to prevent direct editing
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  For trustee fee calculation
                </p>
                {autoTrustAssetValue !== null && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {formatCurrency(autoTrustAssetValue.toString())}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Review Distribution
            </CardTitle>
            <CardDescription>
              Review the calculated distribution before confirming
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Gross Income</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(calculation.grossIncome)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    -{formatCurrency(calculation.expenses)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Trustee Fee</p>
                  <p className="text-xl font-bold text-amber-600">
                    -{formatCurrency(calculation.trusteeFee)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Net Distributable</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(calculation.netDistributable)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Validation Warning */}
            {!calculation.isValid && (
              <Alert variant="destructive">
                <AlertTitle>Validation Warning</AlertTitle>
                <AlertDescription>{calculation.validationMessage}</AlertDescription>
              </Alert>
            )}

            {/* Beneficiary Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                Distribution by Beneficiary ({beneficiaries.length} beneficiaries)
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculation.beneficiaryShares.map((share) => (
                    <TableRow key={share.beneficiaryId}>
                      <TableCell className="font-medium">{share.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{share.sharePercent}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(share.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirm Distribution
            </CardTitle>
            <CardDescription>
              This will create distribution records for all beneficiaries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total to Distribute</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(calculation.netDistributable)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beneficiaries</span>
                <span className="font-medium">
                  {calculation.beneficiaryShares.filter((s) => s.amount > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distribution Date</span>
                <span className="font-medium">{distributionDate}</span>
              </div>
            </div>

            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                This action will create{" "}
                {calculation.beneficiaryShares.filter((s) => s.amount > 0).length} distribution
                records. Make sure the amounts are correct before confirming.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold">Distribution Complete</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {calculation?.beneficiaryShares.filter((s) => s.amount > 0).length} distribution
                records have been created successfully.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={resetWizard}>
                  Start Another
                </Button>
                <Button onClick={() => (window.location.hash = "#/hems")}>
                  View Distributions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {step !== "complete" && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === "setup"}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step === "confirm" ? (
            <Button onClick={handleConfirm} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Distribution
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
