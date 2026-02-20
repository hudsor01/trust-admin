'use client'

import type { Beneficiary } from '@/db/schema'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { BeneficiaryWithDistributions } from './types'
import { BeneficiaryDialogContent } from './BeneficiaryDialogContent'

interface NewDistribution {
    amount: string
    paymentMethod: string
    hemsCategory: string
    hemsJustification: string
    notes: string
}

interface BeneficiaryDialogProps {
    selectedBeneficiary: BeneficiaryWithDistributions | null
    onClose: () => void
    updateBeneficiary: (
        id: number,
        data: Partial<Beneficiary>,
    ) => Promise<unknown>
    setSelectedBeneficiary: (b: BeneficiaryWithDistributions | null) => void
    showDistributionForm: boolean
    setShowDistributionForm: (show: boolean) => void
    newDistribution: NewDistribution
    setNewDistribution: (d: NewDistribution) => void
    recordDistribution: () => Promise<void>
    showDeceasedForm: boolean
    setShowDeceasedForm: (show: boolean) => void
    deceasedDate: string
    setDeceasedDate: (date: string) => void
    handleMarkDeceased: () => Promise<void>
    isMarkingDeceased: boolean
}

export function BeneficiaryDialog({
    selectedBeneficiary,
    onClose,
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
}: BeneficiaryDialogProps) {
    return (
        <Dialog open={!!selectedBeneficiary} onOpenChange={onClose}>
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
                        isMarkingDeceased={isMarkingDeceased}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
