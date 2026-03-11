'use client'

import { useMemo, useState } from 'react'
import type { Beneficiary } from '@/db/schema'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/utils/formatters'
import { BeneficiaryDialog } from './BeneficiaryDialog'
import { BeneficiarySummaryCards } from './BeneficiarySummaryCards'
import { BeneficiaryTable } from './BeneficiaryTable'
import type { BeneficiaryWithDistributions } from './types'

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
                entityId={entityId}
            />
        </div>
    )
}
