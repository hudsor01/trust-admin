'use client'

import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { SummaryCard } from '@/components/summary-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Distribution, WithdrawalRecord } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { addMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asPaymentMethod } from '@/lib/type-utils'
import { formatCurrency, getWithdrawalStatus } from '@/utils/formatters'
import { HemsDialog } from './_components/HemsDialog'
import { HemsTable } from './_components/HemsTable'
import { HistoryTable } from './_components/HistoryTable'
import type { HemsFormData, WithdrawalFormData } from './_components/types'
import { WithdrawalDialog } from './_components/WithdrawalDialog'
import type { WithdrawalRow } from './_components/WithdrawalsTable'
import { WithdrawalsTable } from './_components/WithdrawalsTable'

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

    const deleteDistributionMutation = trpc.distribution.delete.useMutation({
        onSuccess: () => utils.distribution.list.invalidate(),
    })

    const { data: withdrawalRecords = [] } =
        trpc.withdrawalRecord.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

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
    const hemsForm = useResourceForm<HemsFormData>({
        initialData: {
            beneficiaryId: '',
            amount: '',
            hemsCategory: 'HEALTH',
            hemsJustification: '',
            paymentMethod: 'CHECK',
            notes: '',
        },
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
                approvalDate: new Date().toISOString(),
            })
        },
    })

    const { formInstance: hemsFormInstance } = hemsForm

    // Withdrawal Processing Form
    const withdrawalForm = useResourceForm<WithdrawalFormData>({
        initialData: {
            amount: '',
            paymentMethod: 'CHECK',
            notes: '',
        },
        onSubmit: async (data) => {
            if (!selectedWithdrawal) return
            const amount = parseFloat(data.amount.replace(/[,$]/g, ''))

            // Create distribution first
            const distData = await createDistributionMutation.mutateAsync({
                beneficiaryId: selectedWithdrawal.beneficiaryId,
                entityId: selectedWithdrawal.entityId,
                distributionDate: new Date().toISOString(),
                amount: amount.toString(),
                distributionType: 'PRINCIPAL',
                hemsCategory: 'WITHDRAWAL',
                isWithdrawal: true,
                paymentMethod: asPaymentMethod(data.paymentMethod),
                notes:
                    data.notes ||
                    `${selectedWithdrawal.withdrawalType} withdrawal`,
                approvalDate: new Date().toISOString(),
            })

            if (!distData) {
                throw new Error('Failed to create distribution')
            }

            // Then update the withdrawal record — if this fails, clean up the distribution
            try {
                await updateWithdrawalRecordMutation.mutateAsync({
                    id: selectedWithdrawal.id,
                    entityId: selectedWithdrawal.entityId,
                    data: {
                        status: 'COMPLETE',
                        withdrawnAmount: amount.toString(),
                        exercisedDate: new Date().toISOString(),
                        distributionId: distData.id,
                    },
                })
            } catch (err) {
                // Rollback: delete the orphaned distribution
                await deleteDistributionMutation.mutateAsync({
                    id: distData.id,
                    entityId: selectedWithdrawal.entityId,
                })
                throw err
            }

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
        await updateDistributionMutation.mutateAsync({
            id,
            entityId: selectedEntity!,
            data: updates,
        })
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
    }, [] as WithdrawalRow[])

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

                <TabsContent value="hems" className="space-y-4">
                    <HemsTable
                        hemsDistributions={hemsDistributions}
                        beneficiaries={beneficiaries}
                        isLoading={loading}
                        selectedEntity={selectedEntity}
                        onNewRequest={() => hemsForm.open()}
                    />
                </TabsContent>

                <TabsContent value="withdrawals">
                    <WithdrawalsTable
                        grandchildrenWithdrawals={grandchildrenWithdrawals}
                        isLoading={loading}
                        onProcessWithdrawal={openWithdrawalForm}
                    />
                </TabsContent>

                <TabsContent value="history">
                    <HistoryTable
                        distributions={distributions}
                        beneficiaries={beneficiaries}
                        isLoading={loading}
                        onUpdateDistribution={updateDistribution}
                    />
                </TabsContent>
            </Tabs>

            {/* HEMS Request Modal */}
            <HemsDialog
                isOpen={hemsForm.isOpen}
                isSubmitting={hemsForm.isSubmitting}
                hemsBeneficiaries={hemsBeneficiaries}
                onOpenChange={hemsForm.close}
                onSubmit={hemsForm.handleSave}
                formInstance={hemsFormInstance}
            />

            {/* Withdrawal Processing Modal */}
            <WithdrawalDialog
                isOpen={withdrawalForm.isOpen}
                isSubmitting={withdrawalForm.isSubmitting}
                selectedWithdrawal={selectedWithdrawal}
                onOpenChange={(open) => {
                    if (!open) {
                        withdrawalForm.close()
                        setSelectedWithdrawal(null)
                    }
                }}
                onSubmit={withdrawalForm.handleSave}
                formInstance={withdrawalFormInstance}
            />
        </div>
    )
}
