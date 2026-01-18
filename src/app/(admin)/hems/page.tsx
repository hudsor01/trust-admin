'use client'

import { AlertCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { type ColumnDef, DataTable } from '@/components/data-table'
import { EditableTextCell } from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { SummaryCard } from '@/components/summary-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { Beneficiary, Distribution, WithdrawalRecord } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { addMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asPaymentMethod,
    enumToOptions,
    PAYMENT_METHOD_VALUES,
} from '@/lib/type-utils'
import { cn } from '@/lib/utils'
import {
    calculateAge,
    formatCurrency,
    formatDate,
    getWithdrawalStatus,
} from '@/utils/formatters'

interface GrandchildWithdrawal {
    beneficiary: Beneficiary
    age25: WithdrawalRecord | null
    age30: WithdrawalRecord | null
}

// HEMS categories with descriptions (not a schema enum, kept as constant)
const HEMS_CATEGORIES = [
    {
        value: 'HEALTH',
        label: 'Health',
        description: 'Medical expenses, insurance, treatments',
    },
    {
        value: 'EDUCATION',
        label: 'Education',
        description: 'Tuition, books, educational programs',
    },
    {
        value: 'MAINTENANCE',
        label: 'Maintenance',
        description: 'Living expenses, housing, utilities',
    },
    {
        value: 'SUPPORT',
        label: 'Support',
        description: 'General support and welfare',
    },
]

// Derive from schema - filter to common payment methods
const PAYMENT_METHODS = enumToOptions(PAYMENT_METHOD_VALUES, (v) =>
    ['CHECK', 'ACH', 'WIRE'].includes(v),
)

const hemsFormSchema = z.object({
    beneficiaryId: z.string().min(1, 'Beneficiary is required'),
    amount: z.string().min(1, 'Amount is required'),
    hemsCategory: z.string(),
    hemsJustification: z.string().min(1, 'Justification is required'),
    paymentMethod: z.string(),
    notes: z.string().optional(),
})

const withdrawalFormSchema = z.object({
    amount: z.string().min(1, 'Amount is required'),
    paymentMethod: z.string(),
    notes: z.string().optional(),
})

export default function DistributionsPage() {
    const utils = trpc.useUtils()

    // Use tRPC hooks
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId
        ? Number(entityId)
        : (entities[0]?.id ?? null)

    const { data: beneficiaries = [], isLoading: beneficiariesLoading } =
        trpc.beneficiary.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

    const { data: distributions = [], isLoading: distributionsLoading } =
        trpc.distribution.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

    const createDistributionMutation = trpc.distribution.create.useMutation({
        onSuccess: () => {
            utils.distribution.list.invalidate()
            utils.withdrawalRecord.list.invalidate()
        },
    })

    const updateDistributionMutation = trpc.distribution.update.useMutation({
        onSuccess: () => utils.distribution.list.invalidate(),
    })

    const { data: withdrawalRecords = [] } =
        trpc.withdrawalRecord.list.useQuery()

    const updateWithdrawalRecordMutation =
        trpc.withdrawalRecord.update.useMutation({
            onSuccess: () => utils.withdrawalRecord.list.invalidate(),
        })

    const loading =
        entitiesLoading || beneficiariesLoading || distributionsLoading
    const [activeTab, setActiveTab] = useState('hems')
    const [selectedWithdrawal, setSelectedWithdrawal] =
        useState<WithdrawalRecord | null>(null)

    // HEMS Request Form
    const hemsForm = useResourceForm({
        initialData: {
            beneficiaryId: '',
            amount: '',
            hemsCategory: 'HEALTH',
            hemsJustification: '',
            paymentMethod: 'CHECK',
            notes: '',
        },
        schema: hemsFormSchema,
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const amount = parseFloat(data.amount.replace(/[,$]/g, ''))
            await createDistributionMutation.mutateAsync({
                beneficiaryId: Number(data.beneficiaryId),
                entityId: selectedEntity!,
                distributionDate: new Date().toISOString(),
                amount: amount.toString(),
                distributionType: 'PRINCIPAL',
                hemsCategory: data.hemsCategory,
                hemsJustification: data.hemsJustification,
                isWithdrawal: false,
                paymentMethod: asPaymentMethod(data.paymentMethod),
                notes: data.notes || null,
            })
        },
    })

    const { formInstance: hemsFormInstance } = hemsForm

    // Withdrawal Processing Form
    const withdrawalForm = useResourceForm({
        initialData: {
            amount: '',
            paymentMethod: 'CHECK',
            notes: '',
        },
        schema: withdrawalFormSchema,
        onSubmit: async (data) => {
            if (!selectedWithdrawal) return
            const amount = parseFloat(data.amount.replace(/[,$]/g, ''))

            // Create distribution first
            const distData = await createDistributionMutation.mutateAsync({
                beneficiaryId: selectedWithdrawal?.beneficiaryId,
                entityId: selectedWithdrawal?.entityId,
                distributionDate: new Date().toISOString(),
                amount: amount.toString(),
                distributionType: 'PRINCIPAL',
                hemsCategory: 'WITHDRAWAL',
                isWithdrawal: true,
                paymentMethod: asPaymentMethod(data.paymentMethod),
                notes:
                    data.notes ||
                    `${selectedWithdrawal?.withdrawalType} withdrawal`,
            })

            // Then update the withdrawal record
            await updateWithdrawalRecordMutation.mutateAsync({
                id: selectedWithdrawal?.id,
                data: {
                    status: 'COMPLETE',
                    withdrawnAmount: amount.toString(),
                    exercisedDate: new Date().toISOString(),
                    distributionId: distData.id,
                },
            })

            setSelectedWithdrawal(null)
        },
    })

    const { formInstance: withdrawalFormInstance } = withdrawalForm

    const openWithdrawalForm = (withdrawal: WithdrawalRecord) => {
        setSelectedWithdrawal(withdrawal)
        withdrawalForm.open()
    }

    const updateDistribution = async (
        id: number,
        updates: Partial<Distribution>,
    ) => {
        await updateDistributionMutation.mutateAsync({ id, data: updates })
    }

    const eligibleWithdrawals = withdrawalRecords.filter((w) => {
        const status = getWithdrawalStatus(w.eligibleDate)
        return status.isEligible && w.status !== 'COMPLETE'
    })

    const hemsBeneficiaries = beneficiaries.filter(
        (b) =>
            b.distributionStandard === 'HEMS' ||
            b.relationshipType !== 'GRANDCHILD',
    )

    const grandchildrenWithdrawals = withdrawalRecords.reduce((acc, wr) => {
        const beneficiary = beneficiaries.find((b) => b.id === wr.beneficiaryId)
        if (!beneficiary) return acc

        const existing = acc.find((a) => a.beneficiary.id === beneficiary.id)
        if (existing) {
            if (wr.withdrawalType === 'AGE_25') existing.age25 = wr
            if (wr.withdrawalType === 'AGE_30') existing.age30 = wr
        } else {
            acc.push({
                beneficiary,
                age25: wr.withdrawalType === 'AGE_25' ? wr : null,
                age30: wr.withdrawalType === 'AGE_30' ? wr : null,
            })
        }
        return acc
    }, [] as GrandchildWithdrawal[])

    const getStatusVariant = (
        status: string,
    ): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'ELIGIBLE':
                return 'default'
            case 'COMPLETE':
                return 'secondary'
            default:
                return 'outline'
        }
    }

    const hemsDistributions = distributions.filter(
        (d) => d.hemsCategory && !d.isWithdrawal,
    )
    const hemsTotalDistributed = sumStrings(
        hemsDistributions.map((d) => d.amount),
    )
    const withdrawalsTotalProcessed = sumStrings(
        distributions.filter((d) => d.isWithdrawal).map((d) => d.amount),
    )
    const eligibleWithdrawalsCount = eligibleWithdrawals.length
    const totalDistributed = addMoney(
        hemsTotalDistributed,
        withdrawalsTotalProcessed,
    )

    const hemsColumns: ColumnDef<Distribution>[] = [
        {
            key: 'distributionDate',
            header: 'Date',
            render: (d) => formatDate(d.distributionDate),
            sortable: true,
        },
        {
            key: 'beneficiaryId',
            header: 'Beneficiary',
            render: (d) => {
                const beneficiary = beneficiaries.find(
                    (b) => b.id === d.beneficiaryId,
                )
                return beneficiary
                    ? `${beneficiary.firstName} ${beneficiary.lastName}`
                    : '—'
            },
            sortable: true,
        },
        {
            key: 'hemsCategory',
            header: 'Category',
            render: (d) => <Badge variant="secondary">{d.hemsCategory}</Badge>,
            sortable: true,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (d) => (
                <span className="font-medium">{formatCurrency(d.amount)}</span>
            ),
            sortable: true,
        },
        {
            key: 'hemsJustification',
            header: 'Justification',
            render: (d) => (
                <span className="text-muted-foreground">
                    {d.hemsJustification || '—'}
                </span>
            ),
        },
    ]

    const historyColumns: ColumnDef<Distribution>[] = [
        {
            key: 'distributionDate',
            header: 'Date',
            render: (d) => formatDate(d.distributionDate),
            sortable: true,
        },
        {
            key: 'beneficiaryId',
            header: 'Beneficiary',
            render: (d) => {
                const beneficiary = beneficiaries.find(
                    (b) => b.id === d.beneficiaryId,
                )
                return beneficiary
                    ? `${beneficiary.firstName} ${beneficiary.lastName}`
                    : '—'
            },
            sortable: true,
        },
        {
            key: 'distributionType',
            header: 'Type',
            render: (d) => (
                <Badge
                    variant={d.isWithdrawal ? 'default' : 'secondary'}
                    className={cn(
                        d.isWithdrawal &&
                            'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
                    )}
                >
                    {d.isWithdrawal
                        ? 'Withdrawal'
                        : d.hemsCategory || d.distributionType}
                </Badge>
            ),
            sortable: true,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (d) => (
                <span className="font-medium">{formatCurrency(d.amount)}</span>
            ),
            sortable: true,
        },
        {
            key: 'paymentMethod',
            header: 'Method',
            render: (d) => d.paymentMethod,
        },
        {
            key: 'notes',
            header: 'Notes',
            render: (d) => (
                <EditableTextCell
                    value={d.notes}
                    onSave={async (val) => {
                        await updateDistribution(d.id, { notes: val })
                    }}
                />
            ),
        },
    ]

    type WithdrawalRow = {
        beneficiary: Beneficiary
        age25: WithdrawalRecord | null
        age30: WithdrawalRecord | null
    }
    const withdrawalColumns: ColumnDef<WithdrawalRow>[] = [
        {
            key: 'beneficiary',
            header: 'Beneficiary',
            render: (w) => (
                <span className="font-medium">
                    {w.beneficiary.firstName} {w.beneficiary.lastName}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'age',
            header: 'Age',
            render: (w) =>
                w.beneficiary.dob ? calculateAge(w.beneficiary.dob) : '—',
            sortable: true,
        },
        {
            key: 'share',
            header: 'Share',
            render: (w) => `${w.beneficiary.sharePercent}%`,
            sortable: true,
        },
        {
            key: 'age25',
            header: 'Age 25 (50%)',
            render: (w) => {
                if (!w.age25) return '—'
                const status = getWithdrawalStatus(w.age25.eligibleDate)
                return (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                w.age25.status === 'COMPLETE'
                                    ? 'secondary'
                                    : getStatusVariant(status?.status || '')
                            }
                            className={cn(
                                w.age25.status !== 'COMPLETE' &&
                                    status?.isEligible &&
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                            )}
                        >
                            {w.age25.status === 'COMPLETE'
                                ? 'WITHDRAWN'
                                : status?.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(w.age25.eligibleDate)}
                        </span>
                    </div>
                )
            },
        },
        {
            key: 'age30',
            header: 'Age 30 (50%)',
            render: (w) => {
                if (!w.age30) return '—'
                const status = getWithdrawalStatus(w.age30.eligibleDate)
                return (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                w.age30.status === 'COMPLETE'
                                    ? 'secondary'
                                    : getStatusVariant(status?.status || '')
                            }
                            className={cn(
                                w.age30.status !== 'COMPLETE' &&
                                    status?.isEligible &&
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                            )}
                        >
                            {w.age30.status === 'COMPLETE'
                                ? 'WITHDRAWN'
                                : status?.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(w.age30.eligibleDate)}
                        </span>
                    </div>
                )
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (w) => {
                const age25Status = w.age25
                    ? getWithdrawalStatus(w.age25.eligibleDate)
                    : null
                const age30Status = w.age30
                    ? getWithdrawalStatus(w.age30.eligibleDate)
                    : null
                return (
                    <div className="flex gap-2">
                        {w.age25 &&
                            age25Status?.isEligible &&
                            w.age25.status !== 'COMPLETE' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() => openWithdrawalForm(w.age25!)}
                                >
                                    Process 25
                                </Button>
                            )}
                        {w.age30 &&
                            age30Status?.isEligible &&
                            w.age30.status !== 'COMPLETE' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                                    onClick={() => openWithdrawalForm(w.age30!)}
                                >
                                    Process 30
                                </Button>
                            )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Distributions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        HEMS requests and age-based withdrawals
                    </p>
                </div>
                <Select
                    value={selectedEntity?.toString() || ''}
                    onValueChange={(val) => setEntityId(val || null)}
                >
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select Trust" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Metrics */}
            <div className="@container">
                <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
                    <SummaryCard
                        title="HEMS Distributed"
                        value={formatCurrency(hemsTotalDistributed)}
                    />
                    <SummaryCard
                        title="Withdrawals Processed"
                        value={formatCurrency(withdrawalsTotalProcessed)}
                    />
                    <SummaryCard
                        title="Eligible Withdrawals"
                        value={eligibleWithdrawalsCount}
                    />
                    <SummaryCard
                        title="Total Distributed"
                        value={formatCurrency(totalDistributed)}
                    />
                </div>
            </div>

            {/* Alerts */}
            {eligibleWithdrawals.length > 0 && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-200">
                        Eligible Withdrawals
                    </AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                        {eligibleWithdrawals.length} withdrawal
                        {eligibleWithdrawals.length > 1 ? 's are' : ' is'}{' '}
                        eligible to be processed.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="hems">HEMS Distributions</TabsTrigger>
                    <TabsTrigger
                        value="withdrawals"
                        className="flex items-center gap-2"
                    >
                        Age-Based Withdrawals
                        {eligibleWithdrawals.length > 0 && (
                            <Badge
                                variant="default"
                                className="bg-green-600 text-xs"
                            >
                                {eligibleWithdrawals.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        Distribution History
                    </TabsTrigger>
                </TabsList>

                {/* HEMS Tab */}
                <TabsContent value="hems" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-lg">
                                    HEMS Distribution Request
                                </CardTitle>
                                <CardDescription>
                                    Health, Education, Maintenance, and Support
                                    distributions
                                </CardDescription>
                            </div>
                            <Button
                                onClick={() => hemsForm.open()}
                                disabled={!selectedEntity}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                New HEMS Request
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {HEMS_CATEGORIES.map((cat) => (
                                    <Card
                                        key={cat.value}
                                        className="bg-muted/50"
                                    >
                                        <CardContent className="p-4">
                                            <p className="font-medium">
                                                {cat.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {cat.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent HEMS Distributions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Recent HEMS Distributions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                data={hemsDistributions.slice(0, 10)}
                                columns={hemsColumns}
                                isLoading={loading}
                                emptyMessage="No HEMS distributions recorded"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Grandchild Age-Based Withdrawals
                            </CardTitle>
                            <CardDescription>
                                Per trust terms: 50% at age 25, remaining 50% at
                                age 30
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                data={grandchildrenWithdrawals}
                                columns={withdrawalColumns}
                                isLoading={loading}
                                emptyMessage="No grandchild withdrawal schedules found."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                All Distributions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                data={distributions}
                                columns={historyColumns}
                                isLoading={loading}
                                emptyMessage="No distributions recorded"
                            />
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
                                            <SelectItem
                                                key={b.id}
                                                value={b.id.toString()}
                                            >
                                                {b.firstName} {b.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </hemsFormInstance.Field>

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
                                            <SelectItem
                                                key={cat.value}
                                                value={cat.value}
                                            >
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </hemsFormInstance.Field>

                    <hemsFormInstance.Field name="amount">
                        {(field) => (
                            <div className="space-y-2">
                                <Label>Amount *</Label>
                                <Input
                                    type="text"
                                    placeholder="$0.00"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </hemsFormInstance.Field>

                    <hemsFormInstance.Field name="hemsJustification">
                        {(field) => (
                            <div className="space-y-2">
                                <Label>Justification *</Label>
                                <Textarea
                                    placeholder="Explain why this distribution qualifies under HEMS..."
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    rows={3}
                                />
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </hemsFormInstance.Field>

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
                                            <SelectItem
                                                key={pm.value}
                                                value={pm.value}
                                            >
                                                {pm.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </hemsFormInstance.Field>

                    <hemsFormInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label>Additional Notes</Label>
                                <Textarea
                                    placeholder="Optional notes..."
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
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
                title={
                    selectedWithdrawal
                        ? `Process ${selectedWithdrawal?.withdrawalType === 'AGE_25' ? 'Age 25' : 'Age 30'} Withdrawal`
                        : 'Process Withdrawal'
                }
                onSubmit={withdrawalForm.handleSave}
                isLoading={withdrawalForm.isSubmitting}
            >
                {selectedWithdrawal && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Processing{' '}
                                {selectedWithdrawal?.withdrawalType === 'AGE_25'
                                    ? '50%'
                                    : '50%'}{' '}
                                withdrawal for beneficiary. Eligible since:{' '}
                                {formatDate(selectedWithdrawal?.eligibleDate)}
                            </AlertDescription>
                        </Alert>

                        <withdrawalFormInstance.Field name="amount">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Withdrawal Amount *</Label>
                                    <Input
                                        type="text"
                                        placeholder="$0.00"
                                        value={field.state.value}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors?.[0] && (
                                        <p className="text-sm text-destructive">
                                            {field.state.meta.errors[0]}
                                        </p>
                                    )}
                                </div>
                            )}
                        </withdrawalFormInstance.Field>

                        <withdrawalFormInstance.Field name="paymentMethod">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger
                                            onBlur={field.handleBlur}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map((pm) => (
                                                <SelectItem
                                                    key={pm.value}
                                                    value={pm.value}
                                                >
                                                    {pm.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </withdrawalFormInstance.Field>

                        <withdrawalFormInstance.Field name="notes">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        placeholder="Optional notes..."
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
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
