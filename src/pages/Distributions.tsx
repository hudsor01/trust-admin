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
import { ResourceDialog } from "@/components/resource-dialog"
import { useResourceForm } from "@/hooks/use-resource-form"
import { z } from "zod"
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
import { useEntities } from "@/hooks/entities/queries"
import { useBeneficiaries } from "@/hooks/beneficiaries/queries"
import { useWithdrawalRecords, useUpdateWithdrawalRecord } from "@/hooks/withdrawal-records/queries"
import { useDistributions, useCreateDistribution, useUpdateDistribution } from "@/hooks/distributions/queries"

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

// Form validation schemas
const hemsFormSchema = z.object({
  beneficiaryId: z.string().min(1, "Beneficiary is required"),
  amount: z.string().min(1, "Amount is required"),
  hemsCategory: z.string(),
  hemsJustification: z.string().min(1, "Justification is required"),
  paymentMethod: z.string(),
  notes: z.string().optional(),
})

const withdrawalFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string(),
  notes: z.string().optional(),
})

export function Distributions() {
  // Use TanStack Query hooks
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const { data: beneficiaries = [], isLoading: beneficiariesLoading } = useBeneficiaries(selectedEntity || undefined)
  const { data: distributions = [], isLoading: distributionsLoading } = useDistributions(undefined, selectedEntity || undefined)
  const createDistributionMutation = useCreateDistribution()
  const updateDistributionMutation = useUpdateDistribution()

  // Get all withdrawal records (not filtered by entity since they're filtered by beneficiary)
  const { data: withdrawalRecords = [] } = useWithdrawalRecords()
  const updateWithdrawalRecordMutation = useUpdateWithdrawalRecord()

  const loading = entitiesLoading || beneficiariesLoading || distributionsLoading
  const [activeTab, setActiveTab] = useState("hems")
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null)

  // HEMS Request Form
  const hemsForm = useResourceForm({
    initialData: {
      beneficiaryId: "",
      amount: "",
      hemsCategory: "HEALTH",
      hemsJustification: "",
      paymentMethod: "CHECK",
      notes: "",
    },
    validationSchema: hemsFormSchema,
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const amount = parseFloat(data.amount.replace(/[,$]/g, ""))
      await createDistributionMutation.mutateAsync({
        beneficiaryId: data.beneficiaryId,
        entityId: selectedEntity,
        distributionDate: new Date().toISOString(),
        amount: amount.toString(),
        distributionType: "PRINCIPAL",
        hemsCategory: data.hemsCategory,
        hemsJustification: data.hemsJustification,
        isWithdrawal: false,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
      })
    },
  })

  const { formInstance: hemsFormInstance } = hemsForm

  // Withdrawal Processing Form
  const withdrawalForm = useResourceForm({
    initialData: {
      amount: "",
      paymentMethod: "CHECK",
      notes: "",
    },
    validationSchema: withdrawalFormSchema,
    onSubmit: async (data) => {
      if (!selectedWithdrawal) return
      const amount = parseFloat(data.amount.replace(/[,$]/g, ""))
      
      // Create distribution first
      const distData = await createDistributionMutation.mutateAsync({
        beneficiaryId: selectedWithdrawal.beneficiaryId,
        entityId: selectedWithdrawal.entityId,
        distributionDate: new Date().toISOString(),
        amount: amount.toString(),
        distributionType: "PRINCIPAL",
        hemsCategory: "WITHDRAWAL",
        isWithdrawal: true,
        paymentMethod: data.paymentMethod,
        notes: data.notes || `${selectedWithdrawal.withdrawalType} withdrawal`,
      })

      // Then update the withdrawal record
      await updateWithdrawalRecordMutation.mutateAsync({
        id: selectedWithdrawal.id,
        data: {
          status: "COMPLETE",
          withdrawnAmount: amount.toString(),
          exercisedDate: new Date().toISOString(),
          distributionId: distData.id,
        },
      })

      // Close and reset
      setSelectedWithdrawal(null)
    },
  })

  const { formInstance: withdrawalFormInstance } = withdrawalForm

  // Helper to open withdrawal form
  const openWithdrawalForm = (withdrawal: WithdrawalRecord) => {
    setSelectedWithdrawal(withdrawal)
    withdrawalForm.open()
  }

  // Auto-select first entity when entities load
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const updateDistribution = async (id: string, updates: Partial<Distribution>) => {
    await updateDistributionMutation.mutateAsync({ id, data: updates })
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
              <Button onClick={() => hemsForm.open()}>
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
                                    onClick={() => openWithdrawalForm(row.age25!)}
                                  >
                                    Process 25
                                  </Button>
                                )}
                                {row.age30 && age30Status?.isEligible && row.age30.status !== "COMPLETE" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() => openWithdrawalForm(row.age30!)}
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
      <ResourceDialog
        open={hemsForm.isOpen}
        onOpenChange={hemsForm.close}
        title="New HEMS Distribution Request"
        onSubmit={hemsForm.handleSave}
        isLoading={hemsForm.isSubmitting}
      >
        <div className="space-y-4">
          {/* Beneficiary - Required */}
          <hemsFormInstance.Field name="beneficiaryId">
            {(field) => (
              <div className="space-y-2">
                <Label>Beneficiary *</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger onBlur={field.handleBlur}>
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
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </hemsFormInstance.Field>

          {/* HEMS Category */}
          <hemsFormInstance.Field name="hemsCategory">
            {(field) => (
              <div className="space-y-2">
                <Label>HEMS Category</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger onBlur={field.handleBlur}>
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
            )}
          </hemsFormInstance.Field>

          {/* Amount - Required */}
          <hemsFormInstance.Field name="amount">
            {(field) => (
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="text"
                  placeholder="$0.00"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </hemsFormInstance.Field>

          {/* Justification - Required */}
          <hemsFormInstance.Field name="hemsJustification">
            {(field) => (
              <div className="space-y-2">
                <Label>Justification *</Label>
                <Textarea
                  placeholder="Explain why this distribution qualifies under HEMS..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={3}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </hemsFormInstance.Field>

          {/* Payment Method */}
          <hemsFormInstance.Field name="paymentMethod">
            {(field) => (
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger onBlur={field.handleBlur}>
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
            )}
          </hemsFormInstance.Field>

          {/* Additional Notes */}
          <hemsFormInstance.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Optional notes..."
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </hemsFormInstance.Field>
        </div>
      </ResourceDialog>

      {/* Withdrawal Processing Modal */}
      <ResourceDialog
        open={withdrawalForm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            withdrawalForm.close()
            setSelectedWithdrawal(null)
          }
        }}
        title={selectedWithdrawal ? `Process ${selectedWithdrawal.withdrawalType === "AGE_25" ? "Age 25" : "Age 30"} Withdrawal` : "Process Withdrawal"}
        onSubmit={withdrawalForm.handleSave}
        isLoading={withdrawalForm.isSubmitting}
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processing {selectedWithdrawal.withdrawalType === "AGE_25" ? "50%" : "50%"} withdrawal for beneficiary.
                Eligible since: {formatDate(selectedWithdrawal.eligibleDate)}
              </AlertDescription>
            </Alert>

            {/* Withdrawal Amount - Required */}
            <withdrawalFormInstance.Field name="amount">
              {(field) => (
                <div className="space-y-2">
                  <Label>Withdrawal Amount *</Label>
                  <Input
                    type="text"
                    placeholder="$0.00"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors?.[0] && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </withdrawalFormInstance.Field>

            {/* Payment Method */}
            <withdrawalFormInstance.Field name="paymentMethod">
              {(field) => (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger onBlur={field.handleBlur}>
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
              )}
            </withdrawalFormInstance.Field>

            {/* Notes */}
            <withdrawalFormInstance.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Optional notes..."
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </withdrawalFormInstance.Field>
          </div>
        )}
      </ResourceDialog>
    </div>
  )
}
