"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Check,
  Circle,
  Mail,
  Phone,
  MapPin,
  Plus,
  Eye,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency, calculateAge } from "../utils/formatters"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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

// Import reusable editable cell components
import {
  EditableTextCell,
  EditableSelectCell,
  EditableDateCell,
  EditablePercentCell,
} from "@/components/editable-cells"
import { CopyButton } from "@/components/copy-button"
import { DataTable, type ColumnDef } from "@/components/data-table"

// Import types and hooks from TanStack Query hooks
import { useEntities } from "@/hooks/entities/queries"
import { useBeneficiaries, useUpdateBeneficiary, type Beneficiary } from "@/hooks/beneficiaries/queries"

interface Distribution {
  id: string
  distributionDate: string
  amount: string
  paymentMethod: string
  hemsCategory: string | null
  hemsJustification: string | null
  isWithdrawal: boolean
  notes: string | null
}

// Extended Beneficiary type with distributions (local to this page)
interface BeneficiaryWithDistributions extends Beneficiary {
  distributions?: Distribution[]
}

const DISTRIBUTION_STANDARDS = [
  { value: "HEMS", label: "HEMS" },
  { value: "WITHDRAWAL_ONLY", label: "Withdrawal Only" },
  { value: "DISCRETIONARY", label: "Discretionary" },
]

// Age-based withdrawal eligibility thresholds
const WITHDRAWAL_AGE_50_PERCENT = 25
const WITHDRAWAL_AGE_100_PERCENT = 30

// Calculate withdrawal eligibility based on age
function calculateEligibility(dob: string | null): {
  percent: number
  status: "none" | "partial" | "full"
  label: string
  nextMilestone?: { age: number; date: Date; percent: number }
} {
  if (!dob) {
    return { percent: 0, status: "none", label: "Set birthday" }
  }

  const age = calculateAge(dob)

  if (age >= WITHDRAWAL_AGE_100_PERCENT) {
    return { percent: 100, status: "full", label: "100% eligible" }
  }

  if (age >= WITHDRAWAL_AGE_50_PERCENT) {
    const birthDate = new Date(dob)
    const fullEligibleDate = new Date(birthDate)
    fullEligibleDate.setFullYear(birthDate.getFullYear() + WITHDRAWAL_AGE_100_PERCENT)
    return {
      percent: 50,
      status: "partial",
      label: "50% eligible",
      nextMilestone: { age: WITHDRAWAL_AGE_100_PERCENT, date: fullEligibleDate, percent: 100 }
    }
  }

  const birthDate = new Date(dob)
  const partialEligibleDate = new Date(birthDate)
  partialEligibleDate.setFullYear(birthDate.getFullYear() + WITHDRAWAL_AGE_50_PERCENT)
  return {
    percent: 0,
    status: "none",
    label: "Not yet eligible",
    nextMilestone: { age: WITHDRAWAL_AGE_50_PERCENT, date: partialEligibleDate, percent: 50 }
  }
}

export function Beneficiaries() {
  // Use TanStack Query hooks for data fetching
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string>("")

  const {
    data: beneficiariesRaw = [],
    isLoading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries(selectedEntity || undefined)
  const updateBeneficiaryMutation = useUpdateBeneficiary()

  // Wrapper function to match old API for child components
  const updateBeneficiary = async (id: string, data: Partial<Beneficiary>) => {
    return await updateBeneficiaryMutation.mutateAsync({ id, data })
  }

  // Local state for beneficiaries with distributions loaded
  const [beneficiaries, setBeneficiariesWithDist] = useState<BeneficiaryWithDistributions[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryWithDistributions | null>(null)
  const [showDistributionForm, setShowDistributionForm] = useState(false)
  const [newDistribution, setNewDistribution] = useState({
    amount: "",
    paymentMethod: "CHECK",
    hemsCategory: "",
    hemsJustification: "",
    notes: "",
  })

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  // Load distributions for each beneficiary
  useEffect(() => {
    const loadDistributions = async () => {
      const withDistributions = await Promise.all(
        beneficiariesRaw.map(async (b) => {
          try {
            const distRes = await fetch(`/api/beneficiaries/${b.id}`)
            if (distRes.ok) {
              const full = await distRes.json()
              return { ...b, distributions: full.distributions || [] }
            }
          } catch {}
          return { ...b, distributions: [] }
        })
      )
      setBeneficiariesWithDist(withDistributions)
    }

    if (beneficiariesRaw.length > 0) {
      loadDistributions()
    } else {
      setBeneficiariesWithDist([])
    }
  }, [beneficiariesRaw])

  const loading = entitiesLoading || beneficiariesLoading

  const recordDistribution = async () => {
    if (!selectedBeneficiary || !newDistribution.amount || parseFloat(newDistribution.amount) <= 0)
      return

    try {
      const res = await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId: selectedBeneficiary?.id,
          entityId: selectedBeneficiary?.entityId,
          distributionDate: new Date().toISOString(),
          amount: newDistribution.amount,
          distributionType: "PRINCIPAL",
          paymentMethod: newDistribution.paymentMethod,
          hemsCategory: newDistribution.hemsCategory || null,
          hemsJustification: newDistribution.hemsJustification || null,
          isWithdrawal: false,
          notes: newDistribution.notes || null,
        }),
      })

      if (res.ok) {
        setShowDistributionForm(false)
        setNewDistribution({
          amount: "",
          paymentMethod: "CHECK",
          hemsCategory: "",
          hemsJustification: "",
          notes: "",
        })
        refetchBeneficiaries()
        const updated = await fetch(`/api/beneficiaries/${selectedBeneficiary?.id}`).then((r) =>
          r.json()
        )
        setSelectedBeneficiary({ ...selectedBeneficiary, distributions: updated.distributions || [] })
      }
    } catch (error) {
      console.error("Failed to record distribution:", error)
    }
  }

  // Calculate totals
  const totalDistributed = useMemo(
    () =>
      beneficiaries.reduce((sum, b) => {
        const bTotal = (b.distributions || []).reduce((s, d) => s + parseFloat(d.amount), 0)
        return sum + bTotal
      }, 0),
    [beneficiaries]
  )

  const totalShares = useMemo(
    () => beneficiaries.reduce((sum, b) => sum + parseFloat(b.sharePercent || "0"), 0),
    [beneficiaries]
  )

  const informedCount = useMemo(() => beneficiaries.filter((b) => b.informed).length, [beneficiaries])
  const releaseSignedCount = useMemo(
    () => beneficiaries.filter((b) => b.releaseSigned).length,
    [beneficiaries]
  )

  // Column definitions for beneficiaries table
  const beneficiaryColumns: ColumnDef<BeneficiaryWithDistributions>[] = [
    {
      key: "name",
      header: "Name",
      render: (b) => (
        <span className="font-medium">{b.firstName} {b.lastName}</span>
      ),
      sortable: true,
    },
    {
      key: "sharePercent",
      header: "Share %",
      render: (b) => (
        <EditablePercentCell
          value={b.sharePercent}
          onSave={async (val) => {
            await updateBeneficiary(b.id, { sharePercent: val })
          }}
        />
      ),
      sortable: true,
    },
    {
      key: "eligibility",
      header: "Eligibility",
      render: (b) => {
        const eligibility = calculateEligibility(b.dob)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={
                    eligibility.status === "full"
                      ? "default"
                      : eligibility.status === "partial"
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    eligibility.status === "full" && "bg-success hover:bg-success/90",
                    eligibility.status === "partial" && "bg-amber-500/20 text-amber-700 border-amber-500/30",
                    eligibility.status === "none" && !b.dob && "text-muted-foreground"
                  )}
                >
                  {eligibility.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {eligibility.nextMilestone ? (
                  <p>
                    {eligibility.nextMilestone.percent}% at age {eligibility.nextMilestone.age} ({formatDate(eligibility.nextMilestone.date.toISOString())})
                  </p>
                ) : eligibility.status === "full" ? (
                  <p>Fully vested for withdrawal</p>
                ) : (
                  <p>Configure birthday in Settings</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      key: "distributionStandard",
      header: "Standard",
      render: (b) => (
        <EditableSelectCell
          value={b.distributionStandard || "HEMS"}
          options={DISTRIBUTION_STANDARDS}
          onSave={async (val) => {
            await updateBeneficiary(b.id, { distributionStandard: val })
          }}
        />
      ),
      sortable: true,
    },
    {
      key: "informed",
      header: "Notified",
      render: (b) => (
        <Button
          variant={b.informed ? "default" : "outline"}
          size="icon"
          className={cn(
            "h-7 w-7",
            b.informed && "bg-success hover:bg-success/90"
          )}
          onClick={() => updateBeneficiary(b.id, { informed: !b.informed })}
        >
          {b.informed ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
        </Button>
      ),
    },
    {
      key: "releaseSigned",
      header: "Release",
      render: (b) => (
        <Button
          variant={b.releaseSigned ? "default" : "outline"}
          size="icon"
          className={cn(
            "h-7 w-7",
            b.releaseSigned && "bg-success hover:bg-success/90"
          )}
          onClick={() =>
            updateBeneficiary(b.id, { releaseSigned: !b.releaseSigned })
          }
        >
          {b.releaseSigned ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
        </Button>
      ),
    },
    {
      key: "totalDistributed",
      header: "Distributed",
      render: (b) => {
        const totalDist = (b.distributions || []).reduce(
          (s, d) => s + parseFloat(d.amount),
          0
        )
        return (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(totalDist)}
          </span>
        )
      },
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (b) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedBeneficiary(b)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Beneficiaries</h2>
          <p className="text-sm text-muted-foreground">
            {beneficiaries.length} beneficiaries | {formatCurrency(totalDistributed)} distributed
          </p>
        </div>
        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
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
      </div>

      {/* Summary Cards */}
      <div className="@container">
      <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Shares
            </p>
            <p className="mt-2 text-2xl font-bold">{totalShares.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notified
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-bold">
                {informedCount}/{beneficiaries.length}
              </p>
              <Progress
                value={beneficiaries.length > 0 ? (informedCount / beneficiaries.length) * 100 : 0}
                className="w-20"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Releases Signed
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-bold">
                {releaseSignedCount}/{beneficiaries.length}
              </p>
              <Progress
                value={
                  beneficiaries.length > 0 ? (releaseSignedCount / beneficiaries.length) * 100 : 0
                }
                className="w-20 [&>div]:bg-success"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Distributed
            </p>
            <p className="mt-2 text-2xl font-bold text-success">
              {formatCurrency(totalDistributed)}
            </p>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Beneficiary List */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={beneficiaries}
            columns={beneficiaryColumns}
            isLoading={loading}
            emptyMessage="No beneficiaries found"
          />
        </CardContent>
      </Card>

      {/* Beneficiary Detail Dialog */}
      <Dialog
        open={!!selectedBeneficiary}
        onOpenChange={() => {
          setSelectedBeneficiary(null)
          setShowDistributionForm(false)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedBeneficiary
                ? `${selectedBeneficiary?.firstName} ${selectedBeneficiary?.lastName}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedBeneficiary && (
            <BeneficiaryDialogContent
              beneficiary={selectedBeneficiary}
              updateBeneficiary={updateBeneficiary}
              setSelectedBeneficiary={setSelectedBeneficiary}
              showDistributionForm={showDistributionForm}
              setShowDistributionForm={setShowDistributionForm}
              newDistribution={newDistribution}
              setNewDistribution={setNewDistribution}
              recordDistribution={recordDistribution}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate component for dialog content to handle calculations cleanly
function BeneficiaryDialogContent({
  beneficiary,
  updateBeneficiary,
  setSelectedBeneficiary,
  showDistributionForm,
  setShowDistributionForm,
  newDistribution,
  setNewDistribution,
  recordDistribution,
}: {
  beneficiary: BeneficiaryWithDistributions
  updateBeneficiary: (id: string, data: Partial<Beneficiary>) => Promise<Beneficiary>
  setSelectedBeneficiary: (b: BeneficiaryWithDistributions | null) => void
  showDistributionForm: boolean
  setShowDistributionForm: (show: boolean) => void
  newDistribution: { amount: string; paymentMethod: string; hemsCategory: string; hemsJustification: string; notes: string }
  setNewDistribution: (d: { amount: string; paymentMethod: string; hemsCategory: string; hemsJustification: string; notes: string }) => void
  recordDistribution: () => Promise<void>
}) {
  const eligibility = calculateEligibility(beneficiary.dob)
  const age25Date = beneficiary.dob
    ? new Date(new Date(beneficiary.dob).setFullYear(new Date(beneficiary.dob).getFullYear() + WITHDRAWAL_AGE_50_PERCENT))
    : null
  const age30Date = beneficiary.dob
    ? new Date(new Date(beneficiary.dob).setFullYear(new Date(beneficiary.dob).getFullYear() + WITHDRAWAL_AGE_100_PERCENT))
    : null

  return (
    <div className="space-y-4">
              {/* Key Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Share</p>
                  <p className="mt-1 text-xl font-bold">
                    {beneficiary.sharePercent
                      ? `${beneficiary.sharePercent}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eligibility</p>
                  <Badge
                    className={cn(
                      "mt-1",
                      eligibility.status === "full" && "bg-success hover:bg-success/90",
                      eligibility.status === "partial" && "bg-amber-500/20 text-amber-700 border-amber-500/30"
                    )}
                    variant={eligibility.status === "none" ? "outline" : "default"}
                  >
                    {eligibility.label}
                  </Badge>
                </div>
              </div>

              {/* Withdrawal Rights */}
              <Separator />
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Withdrawal Rights
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Card className={cn(eligibility.percent >= 50 && "border-success bg-success/5")}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Age {WITHDRAWAL_AGE_50_PERCENT}</p>
                        {eligibility.percent >= 50 && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <p className="font-medium">50% of share</p>
                      {age25Date ? (
                        <p className={cn(
                          "mt-1 text-xs",
                          eligibility.percent >= 50 ? "text-success" : "text-muted-foreground"
                        )}>
                          {eligibility.percent >= 50 ? "Eligible since" : "Eligible"}: {formatDate(age25Date.toISOString())}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Set birthday to calculate</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className={cn(eligibility.percent >= 100 && "border-success bg-success/5")}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Age {WITHDRAWAL_AGE_100_PERCENT}</p>
                        {eligibility.percent >= 100 && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <p className="font-medium">Remaining 50%</p>
                      {age30Date ? (
                        <p className={cn(
                          "mt-1 text-xs",
                          eligibility.percent >= 100 ? "text-success" : "text-muted-foreground"
                        )}>
                          {eligibility.percent >= 100 ? "Eligible since" : "Eligible"}: {formatDate(age30Date.toISOString())}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Set birthday to calculate</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <EditableTextCell
                      value={beneficiary.email}
                      onSave={async (val) => {
                        await updateBeneficiary(beneficiary.id, { email: val })
                        setSelectedBeneficiary({ ...beneficiary, email: val })
                      }}
                    />
                    {beneficiary.email && <CopyButton value={beneficiary.email} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <EditableTextCell
                      value={beneficiary.phone}
                      onSave={async (val) => {
                        await updateBeneficiary(beneficiary.id, { phone: val })
                        setSelectedBeneficiary({ ...beneficiary, phone: val })
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    <div className="flex-1 space-y-1">
                      <EditableTextCell
                        value={beneficiary.streetAddress}
                        onSave={async (val) => {
                          await updateBeneficiary(beneficiary.id, { streetAddress: val })
                          setSelectedBeneficiary({ ...beneficiary, streetAddress: val })
                        }}
                      />
                      <div className="flex gap-1">
                        <EditableTextCell
                          value={beneficiary.city}
                          onSave={async (val) => {
                            await updateBeneficiary(beneficiary.id, { city: val })
                            setSelectedBeneficiary({ ...beneficiary, city: val })
                          }}
                        />
                        <EditableTextCell
                          value={beneficiary.state}
                          onSave={async (val) => {
                            await updateBeneficiary(beneficiary.id, { state: val })
                            setSelectedBeneficiary({ ...beneficiary, state: val })
                          }}
                        />
                        <EditableTextCell
                          value={beneficiary.zip}
                          onSave={async (val) => {
                            await updateBeneficiary(beneficiary.id, { zip: val })
                            setSelectedBeneficiary({ ...beneficiary, zip: val })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Distribution History
                </p>
                {(beneficiary.distributions || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No distributions recorded</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(beneficiary.distributions || []).map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="text-sm">
                              {formatDate(d.distributionDate)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(d.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  d.isWithdrawal
                                    ? "outline"
                                    : d.hemsCategory
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {d.isWithdrawal
                                  ? "Withdrawal"
                                  : d.hemsCategory || "Distribution"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{d.paymentMethod}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Record Distribution Form */}
              {showDistributionForm ? (
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newDistribution.amount}
                        onChange={(e) =>
                          setNewDistribution({ ...newDistribution, amount: e.target.value })
                        }
                        placeholder="$0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={newDistribution.paymentMethod}
                        onValueChange={(v) =>
                          setNewDistribution({ ...newDistribution, paymentMethod: v })
                        }
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHECK">Check</SelectItem>
                          <SelectItem value="ACH">ACH</SelectItem>
                          <SelectItem value="WIRE">Wire</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {beneficiary.distributionStandard === "HEMS" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="hemsCategory">HEMS Category</Label>
                          <Select
                            value={newDistribution.hemsCategory}
                            onValueChange={(v) =>
                              setNewDistribution({ ...newDistribution, hemsCategory: v })
                            }
                          >
                            <SelectTrigger id="hemsCategory">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HEALTH">Health</SelectItem>
                              <SelectItem value="EDUCATION">Education</SelectItem>
                              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                              <SelectItem value="SUPPORT">Support</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="justification">Justification</Label>
                          <Input
                            id="justification"
                            value={newDistribution.hemsJustification}
                            onChange={(e) =>
                              setNewDistribution({
                                ...newDistribution,
                                hemsJustification: e.target.value,
                              })
                            }
                            placeholder="Explain why this qualifies under HEMS..."
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={newDistribution.notes}
                        onChange={(e) =>
                          setNewDistribution({ ...newDistribution, notes: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={recordDistribution}>Save</Button>
                      <Button variant="ghost" onClick={() => setShowDistributionForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button className="w-full" onClick={() => setShowDistributionForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Distribution
                </Button>
              )}
            </div>
  )
}
