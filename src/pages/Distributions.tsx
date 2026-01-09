"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDate, formatCurrency, calculateAge, getWithdrawalStatus } from "../utils/formatters"
import { EditableTextCell } from "@/components/editable-cells"

interface Beneficiary {
  id: string
  entityId: string
  firstName: string
  lastName: string
  relationshipType: string
  sharePercent: string
  dob: string | null
  distributionStandard: string | null
}

interface WithdrawalRecord {
  id: string
  beneficiaryId: string
  entityId: string
  withdrawalType: string
  eligibleDate: string
  eligibleAmount: string
  withdrawnAmount: string | null
  status: string
  exercisedDate: string | null
}

interface Distribution {
  id: string
  beneficiaryId: string
  entityId: string
  distributionDate: string
  amount: string
  distributionType: string
  hemsCategory: string | null
  hemsJustification: string | null
  isWithdrawal: boolean
  paymentMethod: string
  notes: string | null
}

interface Entity {
  id: string
  name: string
  dod: string | null
}

const HEMS_CATEGORIES = [
  { value: "HEALTH", label: "Health", description: "Medical expenses, insurance, treatments" },
  { value: "EDUCATION", label: "Education", description: "Tuition, books, educational programs" },
  { value: "MAINTENANCE", label: "Maintenance", description: "Living expenses, housing, utilities" },
  { value: "SUPPORT", label: "Support", description: "General support and welfare" },
]

const PAYMENT_METHODS = [
  { value: "CHECK", label: "Check" },
  { value: "ACH", label: "ACH Transfer" },
  { value: "WIRE", label: "Wire Transfer" },
]

export function Distributions() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("hems")
  const [showHemsForm, setShowHemsForm] = useState(false)
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null)

  const [hemsFormData, setHemsFormData] = useState({
    beneficiaryId: "",
    amount: "",
    hemsCategory: "HEALTH",
    hemsJustification: "",
    paymentMethod: "CHECK",
    notes: "",
  })

  const [withdrawalFormData, setWithdrawalFormData] = useState({
    amount: "",
    paymentMethod: "CHECK",
    notes: "",
  })

  useEffect(() => {
    fetchEntities()
  }, [])

  useEffect(() => {
    if (selectedEntity) {
      Promise.all([
        fetchBeneficiaries(),
        fetchWithdrawalRecords(),
        fetchDistributions(),
      ]).finally(() => setLoading(false))
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

  const fetchBeneficiaries = async () => {
    try {
      const res = await fetch("/api/beneficiaries")
      if (res.ok) {
        const data = await res.json()
        const filtered = selectedEntity
          ? data.filter((b: Beneficiary) => b.entityId === selectedEntity)
          : data
        setBeneficiaries(filtered)
      }
    } catch (error) {
      console.error("Failed to fetch beneficiaries:", error)
    }
  }

  const fetchWithdrawalRecords = async () => {
    try {
      const res = await fetch("/api/withdrawal-records")
      if (res.ok) {
        const data = await res.json()
        const filtered = selectedEntity
          ? data.filter((w: WithdrawalRecord) => w.entityId === selectedEntity)
          : data
        setWithdrawalRecords(filtered)
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal records:", error)
    }
  }

  const fetchDistributions = async () => {
    try {
      const res = await fetch("/api/distributions")
      if (res.ok) {
        const data = await res.json()
        const filtered = selectedEntity
          ? data.filter((d: Distribution) => d.entityId === selectedEntity)
          : data
        setDistributions(filtered)
      }
    } catch (error) {
      console.error("Failed to fetch distributions:", error)
    }
  }

  const submitHemsRequest = async () => {
    const amount = parseFloat(hemsFormData.amount.replace(/[,$]/g, ""))
    if (!hemsFormData.beneficiaryId || amount <= 0 || !selectedEntity) return

    try {
      const res = await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId: hemsFormData.beneficiaryId,
          entityId: selectedEntity,
          distributionDate: new Date().toISOString(),
          amount: amount.toString(),
          distributionType: "PRINCIPAL",
          hemsCategory: hemsFormData.hemsCategory,
          hemsJustification: hemsFormData.hemsJustification,
          isWithdrawal: false,
          paymentMethod: hemsFormData.paymentMethod,
          notes: hemsFormData.notes || null,
        }),
      })

      if (res.ok) {
        setShowHemsForm(false)
        setHemsFormData({
          beneficiaryId: "",
          amount: "",
          hemsCategory: "HEALTH",
          hemsJustification: "",
          paymentMethod: "CHECK",
          notes: "",
        })
        fetchDistributions()
      }
    } catch (error) {
      console.error("Failed to submit HEMS request:", error)
    }
  }

  const processWithdrawal = async () => {
    const amount = parseFloat(withdrawalFormData.amount.replace(/[,$]/g, ""))
    if (!selectedWithdrawal || amount <= 0) return

    try {
      const distRes = await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId: selectedWithdrawal.beneficiaryId,
          entityId: selectedWithdrawal.entityId,
          distributionDate: new Date().toISOString(),
          amount: amount.toString(),
          distributionType: "PRINCIPAL",
          hemsCategory: "WITHDRAWAL",
          isWithdrawal: true,
          withdrawalPercent: selectedWithdrawal.withdrawalType === "AGE_25" ? 50 : 50,
          paymentMethod: withdrawalFormData.paymentMethod,
          notes: withdrawalFormData.notes || `${selectedWithdrawal.withdrawalType} withdrawal`,
        }),
      })

      if (distRes.ok) {
        const distData = await distRes.json()

        await fetch(`/api/withdrawal-records/${selectedWithdrawal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETE",
            withdrawnAmount: amount.toString(),
            exercisedDate: new Date().toISOString(),
            distributionId: distData.id,
          }),
        })

        setShowWithdrawalForm(false)
        setSelectedWithdrawal(null)
        setWithdrawalFormData({ amount: "", paymentMethod: "CHECK", notes: "" })
        fetchWithdrawalRecords()
        fetchDistributions()
      }
    } catch (error) {
      console.error("Failed to process withdrawal:", error)
    }
  }

  const updateDistribution = async (id: string, updates: Partial<Distribution>) => {
    const res = await fetch(`/api/distributions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error("Failed to update")
    setDistributions(distributions.map(d =>
      d.id === id ? { ...d, ...updates } : d
    ))
  }

  // Get eligible withdrawals
  const eligibleWithdrawals = withdrawalRecords.filter(w => {
    const status = getWithdrawalStatus(w.eligibleDate)
    return status.isEligible && w.status !== "COMPLETE"
  })

  // Get HEMS-eligible beneficiaries
  const hemsBeneficiaries = beneficiaries.filter(b =>
    b.distributionStandard === "HEMS" || b.relationshipType !== "GRANDCHILD"
  )

  // Get grandchildren with withdrawal schedules
  const grandchildrenWithdrawals = withdrawalRecords.reduce((acc, wr) => {
    const beneficiary = beneficiaries.find(b => b.id === wr.beneficiaryId)
    if (!beneficiary) return acc

    const existing = acc.find(a => a.beneficiary.id === beneficiary.id)
    if (existing) {
      if (wr.withdrawalType === "AGE_25") existing.age25 = wr
      if (wr.withdrawalType === "AGE_30") existing.age30 = wr
    } else {
      acc.push({
        beneficiary,
        age25: wr.withdrawalType === "AGE_25" ? wr : null,
        age30: wr.withdrawalType === "AGE_30" ? wr : null,
      })
    }
    return acc
  }, [] as { beneficiary: Beneficiary; age25: WithdrawalRecord | null; age30: WithdrawalRecord | null }[])

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "ELIGIBLE":
        return "default"
      case "COMPLETE":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Distributions</h2>
          <p className="text-sm text-muted-foreground">
            HEMS requests and age-based withdrawals
          </p>
        </div>
        <Select value={selectedEntity || ""} onValueChange={setSelectedEntity}>
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
      </div>

      {/* Alerts */}
      {eligibleWithdrawals.length > 0 && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Eligible Withdrawals</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {eligibleWithdrawals.length} withdrawal{eligibleWithdrawals.length > 1 ? "s are" : " is"} eligible to be processed.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hems">HEMS Distributions</TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            Age-Based Withdrawals
            {eligibleWithdrawals.length > 0 && (
              <Badge variant="default" className="bg-green-600 text-xs">
                {eligibleWithdrawals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Distribution History</TabsTrigger>
        </TabsList>

        {/* HEMS Tab */}
        <TabsContent value="hems" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">HEMS Distribution Request</CardTitle>
                <CardDescription>
                  Health, Education, Maintenance, and Support distributions
                </CardDescription>
              </div>
              <Button onClick={() => setShowHemsForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New HEMS Request
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {HEMS_CATEGORIES.map((cat) => (
                  <Card key={cat.value} className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent HEMS Distributions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent HEMS Distributions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : distributions.filter(d => d.hemsCategory && !d.isWithdrawal).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No HEMS distributions recorded
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Justification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions
                        .filter(d => d.hemsCategory && !d.isWithdrawal)
                        .slice(0, 10)
                        .map((d) => {
                          const beneficiary = beneficiaries.find(b => b.id === d.beneficiaryId)
                          return (
                            <TableRow key={d.id}>
                              <TableCell>{formatDate(d.distributionDate)}</TableCell>
                              <TableCell>
                                {beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}` : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{d.hemsCategory}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(d.amount)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {d.hemsJustification || "—"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grandchild Age-Based Withdrawals</CardTitle>
              <CardDescription>
                Per trust terms: 50% at age 25, remaining 50% at age 30
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : grandchildrenWithdrawals.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  No grandchild withdrawal schedules found.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Share</TableHead>
                        <TableHead>Age 25 (50%)</TableHead>
                        <TableHead>Age 30 (50%)</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grandchildrenWithdrawals.map((row) => {
                        const age25Status = row.age25 ? getWithdrawalStatus(row.age25.eligibleDate) : null
                        const age30Status = row.age30 ? getWithdrawalStatus(row.age30.eligibleDate) : null

                        return (
                          <TableRow key={row.beneficiary.id}>
                            <TableCell className="font-medium">
                              {row.beneficiary.firstName} {row.beneficiary.lastName}
                            </TableCell>
                            <TableCell>
                              {row.beneficiary.dob ? calculateAge(row.beneficiary.dob) : "—"}
                            </TableCell>
                            <TableCell>{row.beneficiary.sharePercent}%</TableCell>
                            <TableCell>
                              {row.age25 ? (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={row.age25.status === "COMPLETE" ? "secondary" : getStatusVariant(age25Status?.status || "")}
                                    className={cn(
                                      row.age25.status !== "COMPLETE" && age25Status?.isEligible && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    )}
                                  >
                                    {row.age25.status === "COMPLETE" ? "WITHDRAWN" : age25Status?.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(row.age25.eligibleDate)}
                                  </span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {row.age30 ? (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={row.age30.status === "COMPLETE" ? "secondary" : getStatusVariant(age30Status?.status || "")}
                                    className={cn(
                                      row.age30.status !== "COMPLETE" && age30Status?.isEligible && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    )}
                                  >
                                    {row.age30.status === "COMPLETE" ? "WITHDRAWN" : age30Status?.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(row.age30.eligibleDate)}
                                  </span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {row.age25 && age25Status?.isEligible && row.age25.status !== "COMPLETE" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() => {
                                      setSelectedWithdrawal(row.age25)
                                      setShowWithdrawalForm(true)
                                    }}
                                  >
                                    Process 25
                                  </Button>
                                )}
                                {row.age30 && age30Status?.isEligible && row.age30.status !== "COMPLETE" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() => {
                                      setSelectedWithdrawal(row.age30)
                                      setShowWithdrawalForm(true)
                                    }}
                                  >
                                    Process 30
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Distributions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : distributions.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  No distributions recorded
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((d) => {
                        const beneficiary = beneficiaries.find(b => b.id === d.beneficiaryId)
                        return (
                          <TableRow key={d.id}>
                            <TableCell>{formatDate(d.distributionDate)}</TableCell>
                            <TableCell>
                              {beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={d.isWithdrawal ? "default" : "secondary"}
                                className={cn(
                                  d.isWithdrawal && "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100"
                                )}
                              >
                                {d.isWithdrawal ? "Withdrawal" : d.hemsCategory || d.distributionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(d.amount)}</TableCell>
                            <TableCell>{d.paymentMethod}</TableCell>
                            <TableCell>
                              <EditableTextCell
                                value={d.notes}
                                onSave={async (val) => {
                                  await updateDistribution(d.id, { notes: val })
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* HEMS Request Modal */}
      <Dialog open={showHemsForm} onOpenChange={setShowHemsForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New HEMS Distribution Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Beneficiary *</Label>
              <Select
                value={hemsFormData.beneficiaryId}
                onValueChange={(v) => setHemsFormData({ ...hemsFormData, beneficiaryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select beneficiary" />
                </SelectTrigger>
                <SelectContent>
                  {hemsBeneficiaries.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.firstName} {b.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>HEMS Category</Label>
              <Select
                value={hemsFormData.hemsCategory}
                onValueChange={(v) => setHemsFormData({ ...hemsFormData, hemsCategory: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEMS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="text"
                placeholder="$0.00"
                value={hemsFormData.amount}
                onChange={(e) => setHemsFormData({ ...hemsFormData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Justification *</Label>
              <Textarea
                placeholder="Explain why this distribution qualifies under HEMS..."
                value={hemsFormData.hemsJustification}
                onChange={(e) => setHemsFormData({ ...hemsFormData, hemsJustification: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={hemsFormData.paymentMethod}
                onValueChange={(v) => setHemsFormData({ ...hemsFormData, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={hemsFormData.notes}
                onChange={(e) => setHemsFormData({ ...hemsFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowHemsForm(false)}>
                Cancel
              </Button>
              <Button onClick={submitHemsRequest}>
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Processing Modal */}
      <Dialog
        open={showWithdrawalForm}
        onOpenChange={(open) => {
          setShowWithdrawalForm(open)
          if (!open) setSelectedWithdrawal(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Process {selectedWithdrawal?.withdrawalType === "AGE_25" ? "Age 25" : "Age 30"} Withdrawal
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Processing {selectedWithdrawal.withdrawalType === "AGE_25" ? "50%" : "50%"} withdrawal for beneficiary.
                  Eligible since: {formatDate(selectedWithdrawal.eligibleDate)}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Withdrawal Amount *</Label>
                <Input
                  type="text"
                  placeholder="$0.00"
                  value={withdrawalFormData.amount}
                  onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={withdrawalFormData.paymentMethod}
                  onValueChange={(v) => setWithdrawalFormData({ ...withdrawalFormData, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes..."
                  value={withdrawalFormData.notes}
                  onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawalForm(false)
                    setSelectedWithdrawal(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={processWithdrawal}
                >
                  Process Withdrawal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
