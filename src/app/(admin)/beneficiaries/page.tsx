'use client'

import {
    AlertTriangle,
    Check,
    Circle,
    Eye,
    Mail,
    MapPin,
    Phone,
    Plus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { type ColumnDef, DataTable } from '@/components/data-table'
import {
    EditablePercentCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
// Tooltips temporarily disabled due to React 19 + Radix UI compatibility issue
// import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Beneficiary } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { isPositive, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asDistributionStandard,
    asPaymentMethod,
    DISTRIBUTION_STANDARD_VALUES,
    enumToOptions,
} from '@/lib/type-utils'
import { cn } from '@/lib/utils'
import { calculateAge, formatCurrency, formatDate } from '@/utils/formatters'

interface Distribution {
    id: string
    distributionDate: string
    amount: string
    paymentMethod: string
    hemsCategory: string | null
    hemsJustification: string | null
    isWithdrawal: boolean | null
    notes: string | null
}

interface BeneficiaryWithDistributions extends Beneficiary {
    distributions?: Distribution[]
}

// Derive options from schema enums (single source of truth)
const DISTRIBUTION_STANDARDS = enumToOptions(DISTRIBUTION_STANDARD_VALUES)

const WITHDRAWAL_AGE_50_PERCENT = 25
const WITHDRAWAL_AGE_100_PERCENT = 30

function calculateEligibility(dob: string | null): {
    percent: number
    status: 'none' | 'partial' | 'full'
    label: string
    nextMilestone?: { age: number; date: Date; percent: number }
} {
    if (!dob) {
        return { percent: 0, status: 'none', label: 'Set birthday' }
    }

    const age = calculateAge(dob)

    if (age >= WITHDRAWAL_AGE_100_PERCENT) {
        return { percent: 100, status: 'full', label: '100% eligible' }
    }

    if (age >= WITHDRAWAL_AGE_50_PERCENT) {
        const birthDate = new Date(dob)
        const fullEligibleDate = new Date(birthDate)
        fullEligibleDate.setFullYear(
            birthDate.getFullYear() + WITHDRAWAL_AGE_100_PERCENT,
        )
        return {
            percent: 50,
            status: 'partial',
            label: '50% eligible',
            nextMilestone: {
                age: WITHDRAWAL_AGE_100_PERCENT,
                date: fullEligibleDate,
                percent: 100,
            },
        }
    }

    const birthDate = new Date(dob)
    const partialEligibleDate = new Date(birthDate)
    partialEligibleDate.setFullYear(
        birthDate.getFullYear() + WITHDRAWAL_AGE_50_PERCENT,
    )
    return {
        percent: 0,
        status: 'none',
        label: 'Not yet eligible',
        nextMilestone: {
            age: WITHDRAWAL_AGE_50_PERCENT,
            date: partialEligibleDate,
            percent: 50,
        },
    }
}

export default function BeneficiariesPage() {
    const utils = trpc.useUtils()

    // Use tRPC hooks for data fetching
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId || entities[0]?.id

    // Use optimized query that fetches beneficiaries with distributions in one query
    const {
        data: beneficiariesWithDist = [],
        isLoading: beneficiariesLoading,
    } = trpc.beneficiary.listWithDistributions.useQuery(
        { entityId: selectedEntity! },
        { enabled: !!selectedEntity },
    )

    const updateBeneficiaryMutation = trpc.beneficiary.update.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
        },
    })

    const createDistributionMutation = trpc.distribution.create.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
            utils.distribution.list.invalidate()
        },
    })

    const markDeceasedMutation = trpc.beneficiary.markDeceased.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
        },
    })

    const updateBeneficiary = async (
        id: string,
        data: Partial<Beneficiary>,
    ) => {
        return await updateBeneficiaryMutation.mutateAsync({ id, data })
    }

    // Cast to include distributions (already fetched by listWithDistributions)
    const beneficiaries =
        beneficiariesWithDist as BeneficiaryWithDistributions[]
    const [selectedBeneficiary, setSelectedBeneficiary] =
        useState<BeneficiaryWithDistributions | null>(null)
    const [showDistributionForm, setShowDistributionForm] = useState(false)
    const [showDeceasedForm, setShowDeceasedForm] = useState(false)
    const [deceasedDate, setDeceasedDate] = useState('')
    const [newDistribution, setNewDistribution] = useState({
        amount: '',
        paymentMethod: 'CHECK',
        hemsCategory: '',
        hemsJustification: '',
        notes: '',
    })

    const loading = entitiesLoading || beneficiariesLoading

    const handleMarkDeceased = async () => {
        if (!selectedBeneficiary || !deceasedDate) return

        try {
            await markDeceasedMutation.mutateAsync({
                beneficiaryId: selectedBeneficiary.id,
                deceasedDate: new Date(deceasedDate).toISOString(),
            })
            setShowDeceasedForm(false)
            setDeceasedDate('')
            setSelectedBeneficiary(null)
            // The mutation invalidates the query, so beneficiaries will reload
        } catch (error) {
            console.error('Failed to mark deceased:', error)
        }
    }

    const recordDistribution = async () => {
        if (
            !selectedBeneficiary ||
            !newDistribution.amount ||
            !isPositive(newDistribution.amount)
        )
            return

        try {
            await createDistributionMutation.mutateAsync({
                beneficiaryId: selectedBeneficiary.id,
                entityId: selectedBeneficiary.entityId,
                distributionDate: new Date().toISOString(),
                amount: newDistribution.amount,
                distributionType: 'PRINCIPAL',
                paymentMethod: asPaymentMethod(newDistribution.paymentMethod),
                hemsCategory: newDistribution.hemsCategory || null,
                hemsJustification: newDistribution.hemsJustification || null,
                isWithdrawal: false,
                notes: newDistribution.notes || null,
            })

            setShowDistributionForm(false)
            setNewDistribution({
                amount: '',
                paymentMethod: 'CHECK',
                hemsCategory: '',
                hemsJustification: '',
                notes: '',
            })

            // Refresh distributions for selected beneficiary using tRPC
            const updated = await utils.beneficiary.byId.fetch(
                selectedBeneficiary.id,
            )
            if (updated) {
                setSelectedBeneficiary({
                    ...selectedBeneficiary,
                    distributions: updated.distributions || [],
                })
            }
        } catch (error) {
            console.error('Failed to record distribution:', error)
        }
    }

    const totalDistributed = useMemo(
        () =>
            sumStrings(
                beneficiaries.flatMap((b) =>
                    (b.distributions || []).map((d) => d.amount),
                ),
            ),
        [beneficiaries],
    )

    const totalShares = useMemo(
        () => sumStrings(beneficiaries.map((b) => b.sharePercent)),
        [beneficiaries],
    )

    const informedCount = useMemo(
        () => beneficiaries.filter((b) => b.informed).length,
        [beneficiaries],
    )
    const releaseSignedCount = useMemo(
        () => beneficiaries.filter((b) => b.releaseSigned).length,
        [beneficiaries],
    )

    const beneficiaryColumns: ColumnDef<BeneficiaryWithDistributions>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (b) => (
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'font-medium',
                            b.deceasedDate &&
                                'text-muted-foreground line-through',
                        )}
                    >
                        {b.firstName} {b.lastName}
                    </span>
                    {b.deceasedDate && (
                        <Badge
                            variant="outline"
                            className="text-xs border-destructive/50 text-destructive"
                        >
                            Deceased
                        </Badge>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'sharePercent',
            header: 'Share %',
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
            key: 'eligibility',
            header: 'Eligibility',
            render: (b) => {
                const eligibility = calculateEligibility(b.dob)
                return (
                    <Badge
                        variant={
                            eligibility.status === 'full'
                                ? 'default'
                                : eligibility.status === 'partial'
                                  ? 'secondary'
                                  : 'outline'
                        }
                        className={cn(
                            eligibility.status === 'full' &&
                                'bg-success hover:bg-success/90',
                            eligibility.status === 'partial' &&
                                'bg-amber-500/20 text-amber-700 border-amber-500/30',
                            eligibility.status === 'none' &&
                                !b.dob &&
                                'text-muted-foreground',
                        )}
                        title={
                            eligibility.nextMilestone
                                ? `${eligibility.nextMilestone.percent}% at age ${eligibility.nextMilestone.age}`
                                : eligibility.status === 'full'
                                  ? 'Fully vested for withdrawal'
                                  : 'Configure birthday in Settings'
                        }
                    >
                        {eligibility.label}
                    </Badge>
                )
            },
        },
        {
            key: 'distributionStandard',
            header: 'Standard',
            render: (b) => (
                <EditableSelectCell
                    value={b.distributionStandard || 'HEMS'}
                    options={DISTRIBUTION_STANDARDS}
                    onSave={async (val) => {
                        await updateBeneficiary(b.id, {
                            distributionStandard: asDistributionStandard(val),
                        })
                    }}
                />
            ),
            sortable: true,
        },
        {
            key: 'informed',
            header: 'Notified',
            render: (b) => (
                <Button
                    variant={b.informed ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                        'h-7 w-7',
                        b.informed && 'bg-success hover:bg-success/90',
                    )}
                    onClick={() =>
                        updateBeneficiary(b.id, { informed: !b.informed })
                    }
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
            key: 'releaseSigned',
            header: 'Release',
            render: (b) => (
                <Button
                    variant={b.releaseSigned ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                        'h-7 w-7',
                        b.releaseSigned && 'bg-success hover:bg-success/90',
                    )}
                    onClick={() =>
                        updateBeneficiary(b.id, {
                            releaseSigned: !b.releaseSigned,
                        })
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
            key: 'totalDistributed',
            header: 'Distributed',
            render: (b) => {
                const totalDist = sumStrings(
                    (b.distributions || []).map((d) => d.amount),
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
            key: 'actions',
            header: '',
            render: (b) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedBeneficiary(b)}
                    title="View details"
                >
                    <Eye className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Beneficiaries
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {beneficiaries.length} beneficiaries |{' '}
                        {formatCurrency(totalDistributed)} distributed
                    </p>
                </div>
                <NativeSelect
                    value={selectedEntity || ''}
                    onChange={(e) => setEntityId(e.target.value || null)}
                    className="w-62.5"
                >
                    <NativeSelectOption value="" disabled>
                        Select Trust
                    </NativeSelectOption>
                    {entities.map((e) => (
                        <NativeSelectOption key={e.id} value={e.id}>
                            {e.name}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>

            {/* Summary Cards */}
            <div className="@container">
                <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Shares
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {totalShares}%
                            </p>
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
                                    value={
                                        beneficiaries.length > 0
                                            ? (informedCount /
                                                  beneficiaries.length) *
                                              100
                                            : 0
                                    }
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
                                        beneficiaries.length > 0
                                            ? (releaseSignedCount /
                                                  beneficiaries.length) *
                                              100
                                            : 0
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
                    setShowDeceasedForm(false)
                    setDeceasedDate('')
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedBeneficiary
                                ? `${selectedBeneficiary?.firstName} ${selectedBeneficiary?.lastName}`
                                : ''}
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
                            showDeceasedForm={showDeceasedForm}
                            setShowDeceasedForm={setShowDeceasedForm}
                            deceasedDate={deceasedDate}
                            setDeceasedDate={setDeceasedDate}
                            handleMarkDeceased={handleMarkDeceased}
                            isMarkingDeceased={markDeceasedMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

function BeneficiaryDialogContent({
    beneficiary,
    updateBeneficiary,
    setSelectedBeneficiary,
    showDistributionForm,
    setShowDistributionForm,
    newDistribution,
    setNewDistribution,
    recordDistribution,
    showDeceasedForm,
    setShowDeceasedForm,
    deceasedDate,
    setDeceasedDate,
    handleMarkDeceased,
    isMarkingDeceased,
}: {
    beneficiary: BeneficiaryWithDistributions
    updateBeneficiary: (
        id: string,
        data: Partial<Beneficiary>,
    ) => Promise<unknown>
    setSelectedBeneficiary: (b: BeneficiaryWithDistributions | null) => void
    showDistributionForm: boolean
    setShowDistributionForm: (show: boolean) => void
    newDistribution: {
        amount: string
        paymentMethod: string
        hemsCategory: string
        hemsJustification: string
        notes: string
    }
    setNewDistribution: (d: {
        amount: string
        paymentMethod: string
        hemsCategory: string
        hemsJustification: string
        notes: string
    }) => void
    recordDistribution: () => Promise<void>
    showDeceasedForm: boolean
    setShowDeceasedForm: (show: boolean) => void
    deceasedDate: string
    setDeceasedDate: (date: string) => void
    handleMarkDeceased: () => Promise<void>
    isMarkingDeceased: boolean
}) {
    const eligibility = calculateEligibility(beneficiary.dob)
    const age25Date = beneficiary.dob
        ? new Date(
              new Date(beneficiary.dob).setFullYear(
                  new Date(beneficiary.dob).getFullYear() +
                      WITHDRAWAL_AGE_50_PERCENT,
              ),
          )
        : null
    const age30Date = beneficiary.dob
        ? new Date(
              new Date(beneficiary.dob).setFullYear(
                  new Date(beneficiary.dob).getFullYear() +
                      WITHDRAWAL_AGE_100_PERCENT,
              ),
          )
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
                            : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Eligibility</p>
                    <Badge
                        className={cn(
                            'mt-1',
                            eligibility.status === 'full' &&
                                'bg-success hover:bg-success/90',
                            eligibility.status === 'partial' &&
                                'bg-amber-500/20 text-amber-700 border-amber-500/30',
                        )}
                        variant={
                            eligibility.status === 'none'
                                ? 'outline'
                                : 'default'
                        }
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
                    <Card
                        className={cn(
                            eligibility.percent >= 50 &&
                                'border-success bg-success/5',
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Age {WITHDRAWAL_AGE_50_PERCENT}
                                </p>
                                {eligibility.percent >= 50 && (
                                    <Check className="h-4 w-4 text-success" />
                                )}
                            </div>
                            <p className="font-medium">50% of share</p>
                            {age25Date ? (
                                <p
                                    className={cn(
                                        'mt-1 text-xs',
                                        eligibility.percent >= 50
                                            ? 'text-success'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {eligibility.percent >= 50
                                        ? 'Eligible since'
                                        : 'Eligible'}
                                    : {formatDate(age25Date.toISOString())}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Set birthday to calculate
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    <Card
                        className={cn(
                            eligibility.percent >= 100 &&
                                'border-success bg-success/5',
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Age {WITHDRAWAL_AGE_100_PERCENT}
                                </p>
                                {eligibility.percent >= 100 && (
                                    <Check className="h-4 w-4 text-success" />
                                )}
                            </div>
                            <p className="font-medium">Remaining 50%</p>
                            {age30Date ? (
                                <p
                                    className={cn(
                                        'mt-1 text-xs',
                                        eligibility.percent >= 100
                                            ? 'text-success'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {eligibility.percent >= 100
                                        ? 'Eligible since'
                                        : 'Eligible'}
                                    : {formatDate(age30Date.toISOString())}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Set birthday to calculate
                                </p>
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
                                await updateBeneficiary(beneficiary.id, {
                                    email: val,
                                })
                                setSelectedBeneficiary({
                                    ...beneficiary,
                                    email: val,
                                })
                            }}
                        />
                        {beneficiary.email && (
                            <CopyButton value={beneficiary.email} />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <EditableTextCell
                            value={beneficiary.phone}
                            onSave={async (val) => {
                                await updateBeneficiary(beneficiary.id, {
                                    phone: val,
                                })
                                setSelectedBeneficiary({
                                    ...beneficiary,
                                    phone: val,
                                })
                            }}
                        />
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        <div className="flex-1 space-y-1">
                            <EditableTextCell
                                value={beneficiary.streetAddress}
                                onSave={async (val) => {
                                    await updateBeneficiary(beneficiary.id, {
                                        streetAddress: val,
                                    })
                                    setSelectedBeneficiary({
                                        ...beneficiary,
                                        streetAddress: val,
                                    })
                                }}
                            />
                            <div className="flex gap-1">
                                <EditableTextCell
                                    value={beneficiary.city}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { city: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            city: val,
                                        })
                                    }}
                                />
                                <EditableTextCell
                                    value={beneficiary.state}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { state: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            state: val,
                                        })
                                    }}
                                />
                                <EditableTextCell
                                    value={beneficiary.zip}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { zip: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            zip: val,
                                        })
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
                    <p className="text-sm text-muted-foreground">
                        No distributions recorded
                    </p>
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
                                                        ? 'outline'
                                                        : d.hemsCategory
                                                          ? 'default'
                                                          : 'secondary'
                                                }
                                            >
                                                {d.isWithdrawal
                                                    ? 'Withdrawal'
                                                    : d.hemsCategory ||
                                                      'Distribution'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {d.paymentMethod}
                                        </TableCell>
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
                                    setNewDistribution({
                                        ...newDistribution,
                                        amount: e.target.value,
                                    })
                                }
                                placeholder="$0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">
                                Payment Method
                            </Label>
                            <Select
                                value={newDistribution.paymentMethod}
                                onValueChange={(v) =>
                                    setNewDistribution({
                                        ...newDistribution,
                                        paymentMethod: v,
                                    })
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
                        {beneficiary.distributionStandard === 'HEMS' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="hemsCategory">
                                        HEMS Category
                                    </Label>
                                    <Select
                                        value={newDistribution.hemsCategory}
                                        onValueChange={(v) =>
                                            setNewDistribution({
                                                ...newDistribution,
                                                hemsCategory: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger id="hemsCategory">
                                            <SelectValue placeholder="Select category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTH">
                                                Health
                                            </SelectItem>
                                            <SelectItem value="EDUCATION">
                                                Education
                                            </SelectItem>
                                            <SelectItem value="MAINTENANCE">
                                                Maintenance
                                            </SelectItem>
                                            <SelectItem value="SUPPORT">
                                                Support
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="justification">
                                        Justification
                                    </Label>
                                    <Input
                                        id="justification"
                                        value={
                                            newDistribution.hemsJustification
                                        }
                                        onChange={(e) =>
                                            setNewDistribution({
                                                ...newDistribution,
                                                hemsJustification:
                                                    e.target.value,
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
                                    setNewDistribution({
                                        ...newDistribution,
                                        notes: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={recordDistribution}>Save</Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowDistributionForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    className="w-full"
                    onClick={() => setShowDistributionForm(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Record Distribution
                </Button>
            )}

            {/* Mark as Deceased - only show if not already deceased */}
            {!beneficiary.deceasedDate && (
                <>
                    <Separator />
                    {showDeceasedForm ? (
                        <Card className="border-destructive/50 bg-destructive/5">
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex items-start gap-2 text-destructive">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">
                                            Mark Beneficiary as Deceased
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            This will automatically redistribute
                                            their share pro-rata to living
                                            beneficiaries per Section 7.01.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deceasedDate">
                                        Date of Death
                                    </Label>
                                    <Input
                                        id="deceasedDate"
                                        type="date"
                                        value={deceasedDate}
                                        onChange={(e) =>
                                            setDeceasedDate(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        onClick={handleMarkDeceased}
                                        disabled={
                                            !deceasedDate || isMarkingDeceased
                                        }
                                    >
                                        {isMarkingDeceased
                                            ? 'Processing...'
                                            : 'Confirm'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            setShowDeceasedForm(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full text-muted-foreground hover:text-destructive hover:border-destructive"
                            onClick={() => setShowDeceasedForm(true)}
                        >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Mark as Deceased
                        </Button>
                    )}
                </>
            )}

            {/* Show deceased status if already marked */}
            {beneficiary.deceasedDate && (
                <>
                    <Separator />
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge
                            variant="outline"
                            className="border-destructive/50 text-destructive"
                        >
                            Deceased
                        </Badge>
                        <span className="text-sm">
                            {formatDate(beneficiary.deceasedDate)}
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
