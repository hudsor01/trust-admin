'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Beneficiary } from '@/db/schema'
import { logger } from '@/lib/logger'
import { isPositive, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asPaymentMethod } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { BeneficiaryDialog } from './BeneficiaryDialog'
import { BeneficiarySummaryCards } from './BeneficiarySummaryCards'
import { BeneficiaryTable } from './BeneficiaryTable'
import type { BeneficiaryWithDistributions } from './types'

const log = logger.create('Beneficiaries')

export function BeneficiariesClient() {
    const utils = trpc.useUtils()
    const entityId = 1

    const {
        data: beneficiariesWithDist = [],
        isLoading: beneficiariesLoading,
    } = trpc.beneficiary.listWithDistributions.useQuery({ entityId })

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
        id: number,
        data: Partial<Beneficiary>,
    ) => {
        return await updateBeneficiaryMutation.mutateAsync({
            id,
            entityId,
            data,
        })
    }

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

    const loading = beneficiariesLoading

    const handleMarkDeceased = async () => {
        if (!selectedBeneficiary || !deceasedDate) return

        try {
            await markDeceasedMutation.mutateAsync({
                beneficiaryId: selectedBeneficiary.id,
                entityId,
                deceasedDate: `${deceasedDate}T00:00:00.000Z`,
            })
            setShowDeceasedForm(false)
            setDeceasedDate('')
            setSelectedBeneficiary(null)
        } catch (error) {
            log.error('Failed to mark deceased', { error })
            toast.error('Failed to mark beneficiary as deceased')
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
                approvalDate: new Date().toISOString(),
            })

            setShowDistributionForm(false)
            setNewDistribution({
                amount: '',
                paymentMethod: 'CHECK',
                hemsCategory: '',
                hemsJustification: '',
                notes: '',
            })

            const updated = await utils.beneficiary.byId.fetch({
                id: selectedBeneficiary.id,
                entityId,
            })
            if (updated) {
                setSelectedBeneficiary({
                    ...selectedBeneficiary,
                    distributions:
                        (updated as BeneficiaryWithDistributions)
                            .distributions || [],
                })
            }
        } catch (error) {
            log.error('Failed to record distribution', { error })
            toast.error('Failed to record distribution')
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
                onClose={() => {
                    setSelectedBeneficiary(null)
                    setShowDistributionForm(false)
                    setShowDeceasedForm(false)
                    setDeceasedDate('')
                }}
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
        </div>
    )
}
