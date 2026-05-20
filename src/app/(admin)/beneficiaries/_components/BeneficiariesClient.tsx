'use client'

import { UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Beneficiary } from '@/db/schema'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/utils/formatters'
import { AddBeneficiaryDialog } from './AddBeneficiaryDialog'
import { BeneficiaryAvatarStack } from './BeneficiaryAvatarStack'
import { BeneficiaryDialog } from './BeneficiaryDialog'
import { BeneficiaryShareDonuts } from './BeneficiaryShareDonuts'
import { BeneficiarySortableList } from './BeneficiarySortableList'
import { BeneficiaryTable } from './BeneficiaryTable'
import type { BeneficiaryWithDistributions } from './types'
import { WithdrawalMilestoneGantt } from './WithdrawalMilestoneGantt'

export function BeneficiariesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const {
        data: beneficiariesWithDist = [],
        isLoading: beneficiariesLoading,
    } = trpc.beneficiary.listWithDistributions.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )

    // HEMS pending count for the KPI strip — uses existing list query.
    const { data: hemsRequests = [] } = trpc.hemsRequest.list.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )

    // Entity dod for WithdrawalMilestoneGantt reference point when a
    // beneficiary has no dob on file.
    const { data: entityDetail } = trpc.entity.byId.useQuery(entityId!, {
        enabled: !!entityId,
    })

    const updateBeneficiaryMutation = trpc.beneficiary.update.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
        },
    })

    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [addFirstName, setAddFirstName] = useState('')
    const [addLastName, setAddLastName] = useState('')
    const [addRelationship, setAddRelationship] = useState('')
    const [addEmail, setAddEmail] = useState('')
    const [addSharePercent, setAddSharePercent] = useState('')

    const resetAddForm = () => {
        setAddFirstName('')
        setAddLastName('')
        setAddRelationship('')
        setAddEmail('')
        setAddSharePercent('')
    }

    const createBeneficiaryMutation = trpc.beneficiary.create.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
            utils.beneficiary.list.invalidate()
            setAddDialogOpen(false)
            resetAddForm()
            toast.success('Beneficiary added')
        },
        onError: (err) => toast.error(err.message),
    })

    const handleAddSubmit = () => {
        if (
            !entityId ||
            !addFirstName.trim() ||
            !addLastName.trim() ||
            !addRelationship.trim()
        )
            return
        createBeneficiaryMutation.mutate({
            entityId,
            firstName: addFirstName.trim(),
            lastName: addLastName.trim(),
            relationship: addRelationship.trim(),
            ...(addEmail.trim() ? { email: addEmail.trim() } : {}),
            ...(addSharePercent.trim()
                ? { sharePercent: addSharePercent.trim() }
                : {}),
        })
    }

    const updateBeneficiary = async (
        id: number,
        data: Partial<Beneficiary>,
    ) => {
        return await updateBeneficiaryMutation.mutateAsync({
            id,
            entityId: entityId!,
            data,
        })
    }

    const beneficiaries =
        beneficiariesWithDist as BeneficiaryWithDistributions[]
    const [selectedBeneficiary, setSelectedBeneficiary] =
        useState<BeneficiaryWithDistributions | null>(null)

    const loading = beneficiariesLoading

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

    // Distributions issued in the current calendar year (YTD). Filters by
    // distributionDate prefix so we avoid a separate filtered query.
    const currentYear = new Date().getUTCFullYear().toString()
    const totalDistributedYtd = useMemo(
        () =>
            sumStrings(
                beneficiaries.flatMap((b) =>
                    (b.distributions || [])
                        .filter((d) =>
                            d.distributionDate?.startsWith(currentYear),
                        )
                        .map((d) => d.amount),
                ),
            ),
        [beneficiaries, currentYear],
    )

    const pendingHemsCount = useMemo(
        () => hemsRequests.filter((h) => h.status === 'PENDING').length,
        [hemsRequests],
    )

    // Donut row uses derived `name = firstName + lastName` shape.
    const donutItems = useMemo(
        () =>
            beneficiaries.map((b) => ({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`.trim(),
                sharePercent: b.sharePercent,
                relationship: b.relationship,
            })),
        [beneficiaries],
    )

    const avatarItems = useMemo(
        () =>
            beneficiaries.map((b) => ({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`.trim(),
            })),
        [beneficiaries],
    )

    const milestoneItems = useMemo(
        () =>
            beneficiaries.map((b) => ({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`.trim(),
                dob: b.dob,
                withdrawalAge1: b.withdrawalAge1,
                withdrawalPct1: b.withdrawalPct1,
                withdrawalAge2: b.withdrawalAge2,
                withdrawalPct2: b.withdrawalPct2,
            })),
        [beneficiaries],
    )

    const kpiData: KpiStripItem[] = [
        { label: 'Beneficiary count', value: beneficiaries.length },
        { label: 'Total share %', value: `${totalShares}%` },
        {
            label: 'Distributions YTD',
            value: formatCurrency(totalDistributedYtd),
        },
        { label: 'Pending HEMS', value: pendingHemsCount },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Beneficiaries"
                description="Trust beneficiaries with share allocations and withdrawal milestones."
                actions={
                    <Button
                        onClick={() => setAddDialogOpen(true)}
                        disabled={!entityId}
                    >
                        <UserPlus className="mr-1 h-4 w-4" />
                        Add Beneficiary
                    </Button>
                }
            />

            <KpiStrip data={kpiData} isLoading={loading} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1">
                    <BeneficiaryAvatarStack beneficiaries={avatarItems} />
                </div>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                    {beneficiaries.length} beneficiaries ·{' '}
                    {formatCurrency(totalDistributed)} distributed lifetime ·{' '}
                    {formatCurrency(totalDistributedYtd)} YTD
                </div>
            </div>

            <BeneficiaryShareDonuts
                beneficiaries={donutItems}
                isLoading={loading}
            />

            {!loading && beneficiaries.length > 1 && entityId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Display Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-3 text-sm text-muted-foreground">
                            Drag to reorder how beneficiaries are listed
                            throughout the app.
                        </p>
                        <BeneficiarySortableList
                            beneficiaries={[...beneficiaries]
                                .sort(
                                    (a, b) =>
                                        (a.sortIndex ?? 0) - (b.sortIndex ?? 0),
                                )
                                .map((b) => ({
                                    id: b.id,
                                    firstName: b.firstName,
                                    lastName: b.lastName,
                                    relationship: b.relationship,
                                    sortIndex: b.sortIndex ?? 0,
                                }))}
                            entityId={entityId}
                        />
                    </CardContent>
                </Card>
            )}

            <WithdrawalMilestoneGantt
                beneficiaries={milestoneItems}
                entityDod={entityDetail?.dod ?? null}
                isLoading={loading}
            />

            <BeneficiaryTable
                beneficiaries={beneficiaries}
                isLoading={loading}
                onViewDetails={setSelectedBeneficiary}
                onUpdateBeneficiary={updateBeneficiary}
            />

            <BeneficiaryDialog
                selectedBeneficiary={selectedBeneficiary}
                onClose={() => setSelectedBeneficiary(null)}
                updateBeneficiary={updateBeneficiary}
                setSelectedBeneficiary={setSelectedBeneficiary}
                entityId={entityId!}
            />

            <AddBeneficiaryDialog
                open={addDialogOpen}
                onOpenChange={(open) => {
                    setAddDialogOpen(open)
                    if (!open) resetAddForm()
                }}
                firstName={addFirstName}
                lastName={addLastName}
                relationship={addRelationship}
                email={addEmail}
                sharePercent={addSharePercent}
                isPending={createBeneficiaryMutation.isPending}
                onFirstNameChange={setAddFirstName}
                onLastNameChange={setAddLastName}
                onRelationshipChange={setAddRelationship}
                onEmailChange={setAddEmail}
                onSharePercentChange={setAddSharePercent}
                onSubmit={handleAddSubmit}
            />
        </div>
    )
}
