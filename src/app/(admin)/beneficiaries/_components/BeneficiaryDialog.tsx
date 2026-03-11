'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { Beneficiary } from '@/db/schema'
import { logger } from '@/lib/logger'
import { isPositive } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { asPaymentMethod } from '@/lib/type-utils'
import { BeneficiaryDialogContent } from './BeneficiaryDialogContent'
import type { BeneficiaryWithDistributions } from './types'

const log = logger.create('BeneficiaryDialog')

interface BeneficiaryDialogProps {
    selectedBeneficiary: BeneficiaryWithDistributions | null
    onClose: () => void
    updateBeneficiary: (
        id: number,
        data: Partial<Beneficiary>,
    ) => Promise<unknown>
    setSelectedBeneficiary: (b: BeneficiaryWithDistributions | null) => void
    entityId: number
}

export function BeneficiaryDialog({
    selectedBeneficiary,
    onClose,
    updateBeneficiary,
    setSelectedBeneficiary,
    entityId,
}: BeneficiaryDialogProps) {
    const utils = trpc.useUtils()

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

    const handleClose = () => {
        setShowDistributionForm(false)
        setShowDeceasedForm(false)
        setDeceasedDate('')
        setNewDistribution({
            amount: '',
            paymentMethod: 'CHECK',
            hemsCategory: '',
            hemsJustification: '',
            notes: '',
        })
        onClose()
    }

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

    return (
        <Dialog open={!!selectedBeneficiary} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {selectedBeneficiary
                            ? `${selectedBeneficiary.firstName} ${selectedBeneficiary.lastName}`
                            : ''}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Beneficiary details and distribution management
                    </DialogDescription>
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
    )
}
