'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Beneficiary } from '@/db/schema'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/utils/formatters'
import { AddBeneficiaryDialog } from './AddBeneficiaryDialog'
import { BeneficiaryDialog } from './BeneficiaryDialog'
import { BeneficiarySummaryCards } from './BeneficiarySummaryCards'
import { BeneficiaryTable } from './BeneficiaryTable'
import type { BeneficiaryWithDistributions } from './types'

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

    const informedCount = useMemo(
        () => beneficiaries.filter((b) => b.informed).length,
        [beneficiaries],
    )
    const releaseSignedCount = useMemo(
        () => beneficiaries.filter((b) => b.releaseSigned).length,
        [beneficiaries],
    )

    return (
        <div className="space-y-6">
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
                <Button
                    onClick={() => setAddDialogOpen(true)}
                    disabled={!entityId}
                >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Beneficiary
                </Button>
            </div>

            <BeneficiarySummaryCards
                totalShares={totalShares}
                informedCount={informedCount}
                releaseSignedCount={releaseSignedCount}
                totalDistributed={totalDistributed}
                totalBeneficiaries={beneficiaries.length}
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
