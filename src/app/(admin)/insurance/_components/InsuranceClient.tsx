'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import type { InsurancePolicy } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { INSURANCE_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import { insurancePolicyFormDefaults, toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asInsurancePolicyType,
    asPremiumFrequency,
    asRecordStatus,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { InsuranceDialog } from './InsuranceDialog'
import { InsuranceTable } from './InsuranceTable'

const log = logger.create('Insurance')

export function InsuranceClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: policies = [], isLoading: policiesLoading } =
        trpc.insurancePolicy.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createMutation = trpc.insurancePolicy.create.useMutation({
        onSuccess: () => utils.insurancePolicy.list.invalidate(),
    })
    const updateMutation = trpc.insurancePolicy.update.useMutation({
        onSuccess: () => utils.insurancePolicy.list.invalidate(),
    })
    const deleteMutation = trpc.insurancePolicy.delete.useMutation({
        onSuccess: () => utils.insurancePolicy.list.invalidate(),
    })

    const [pendingDelete, setPendingDelete] = useState<InsurancePolicy | null>(
        null,
    )

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Insurance Policy',
            description:
                'Are you sure you want to delete this insurance policy? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteMutation.mutateAsync({
                        id: pendingDelete.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete insurance policy', {
                        error: err,
                    })
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const policyForm = useResourceForm({
        initialData: insurancePolicyFormDefaults(),
        steps: INSURANCE_WIZARD_STEPS,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                policyType: asInsurancePolicyType(data.policyType),
                carrier: data.carrier,
                policyNumber: data.policyNumber,
                coverageAmount: data.coverageAmount || null,
                premium: data.premium || null,
                premiumFrequency: asPremiumFrequency(
                    data.premiumFrequency || null,
                ),
                effectiveDate: data.effectiveDate || null,
                expirationDate: data.expirationDate || null,
                insuredAsset: data.insuredAsset || null,
                beneficiaries: data.beneficiaries || null,
                status: asRecordStatus(data.status),
                notes: data.notes || null,
            }

            if (
                policyForm.isEditing &&
                policyForm.editing &&
                'id' in policyForm.editing
            ) {
                const editingId = (policyForm.editing as InsurancePolicy).id
                await updateMutation.mutateAsync({
                    id: editingId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createMutation.mutateAsync(payload)
            }
        },
    })

    const handleEdit = useCallback(
        (p: InsurancePolicy) => {
            policyForm.handleEdit({
                ...p,
                description: p.description || '',
                carrier: p.carrier || '',
                policyNumber: p.policyNumber || '',
                coverageAmount: p.coverageAmount || '',
                premium: p.premium || '',
                premiumFrequency: p.premiumFrequency || '',
                effectiveDate: toDateInput(p.effectiveDate),
                expirationDate: toDateInput(p.expirationDate),
                insuredAsset: p.insuredAsset || '',
                beneficiaries: p.beneficiaries || '',
                notes: p.notes || '',
            })
        },
        [policyForm],
    )

    const handleDelete = useCallback(
        (item: InsurancePolicy) => {
            setPendingDelete(item)
            confirmDelete()
        },
        [confirmDelete],
    )

    // Sequential (NOT Promise.all) bulk delete: a mid-batch failure leaves a
    // known committed set and an exact failure count to report.
    const onBulkDelete = useCallback(
        async (rows: InsurancePolicy[]) => {
            let failed = 0
            for (const row of rows) {
                try {
                    await deleteMutation.mutateAsync({
                        id: row.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    failed++
                    log.error('Bulk delete failed', { id: row.id, error: err })
                }
            }
            if (failed > 0) {
                toast.error(
                    `Failed to delete ${failed} of ${rows.length} policies`,
                )
            } else {
                toast.success(`Deleted ${rows.length} policies`)
            }
        },
        [deleteMutation, entityId],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<InsurancePolicy>) => {
            try {
                await updateMutation.mutateAsync({
                    id,
                    entityId: entityId!,
                    data: updates,
                })
            } catch (err) {
                log.error('Failed to update insurance policy', { error: err })
            }
        },
        [updateMutation, entityId],
    )

    const totalCoverage = sumStrings(policies.map((p) => p.coverageAmount))
    const totalPremium = sumStrings(policies.map((p) => p.premium))
    const activeCount = policies.filter((p) => p.status === 'ACTIVE').length
    const kpiData: KpiStripItem[] = [
        { label: 'Policy count', value: policies.length },
        { label: 'Total coverage', value: formatCurrency(totalCoverage) },
        { label: 'Active count', value: activeCount },
        { label: 'Annual premium', value: formatCurrency(totalPremium) },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Insurance"
                description="Insurance policies covering trust assets."
                actions={
                    <Button onClick={policyForm.handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Policy
                    </Button>
                }
            />

            <KpiStrip data={kpiData} isLoading={policiesLoading} />

            <InsuranceTable
                policies={policies}
                isLoading={policiesLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineUpdate={handleInlineUpdate}
                onBulkDelete={onBulkDelete}
            />

            <InsuranceDialog
                isOpen={policyForm.isOpen}
                isEditing={policyForm.isEditing}
                isSubmitting={policyForm.isSubmitting}
                onOpenChange={policyForm.close}
                onSubmit={policyForm.handleSave}
                formInstance={policyForm.formInstance}
                wizard={policyForm}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
