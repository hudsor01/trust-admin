'use client'

import { TRPCClientError } from '@trpc/client'
import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import type { Firearm } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { FIREARM_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import { firearmFormDefaults, toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asRecordStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { FirearmDialog } from './FirearmDialog'
import { FirearmTable } from './FirearmTable'
import { NfaStatusDialog } from './NfaStatusDialog'

const log = logger.create('Firearms')

export function FirearmsClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: firearms = [], isLoading: firearmsLoading } =
        trpc.firearm.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createFirearmMutation = trpc.firearm.create.useMutation({
        onSuccess: () => utils.firearm.list.invalidate(),
    })
    const updateFirearmMutation = trpc.firearm.update.useMutation({
        onSuccess: () => {
            utils.firearm.list.invalidate()
            // Blanket byId invalidation — useResourceForm.onSuccess does not
            // expose the row id; safe over-invalidation matches row-detail
            // re-render needs. NfaStatusDialog uses the scoped form.
            utils.firearm.byId.invalidate()
        },
    })
    const deleteFirearmMutation = trpc.firearm.delete.useMutation({
        onSuccess: () => utils.firearm.list.invalidate(),
    })

    const [pendingDelete, setPendingDelete] = useState<Firearm | null>(null)
    // NfaStatusDialog is owned at the FirearmsClient level so it can be opened
    // from either FirearmTable's row action column (top-level, 1 click) or
    // FirearmRowDetail's "Update Form 5 Status" button (expanded row, 2 clicks).
    // The dialog enforces D-02: it is still the sole UI path to mutate
    // nfaTransferStatus — only the entry point is duplicated, not the mutation.
    const [nfaStatusFirearm, setNfaStatusFirearm] = useState<Firearm | null>(
        null,
    )

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Firearm',
            description:
                'Are you sure you want to delete this firearm? This action cannot be undone.',
            confirmText: 'Delete Firearm',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteFirearmMutation.mutateAsync({
                        id: pendingDelete.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete firearm', { error: err })
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const firearmForm = useResourceForm({
        initialData: firearmFormDefaults(),
        steps: FIREARM_WIZARD_STEPS,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                make: data.make,
                model: data.model,
                serialNumber: data.serialNumber,
                firearmType: data.firearmType as Firearm['firearmType'],
                caliber: data.caliber || null,
                barrelLength: data.barrelLength || null,
                action: data.action || null,
                isNfa: data.isNfa,
                nfaClass: (data.nfaClass as Firearm['nfaClass']) || null,
                atfFormType:
                    (data.atfFormType as Firearm['atfFormType']) || null,
                atfControlNumber: data.atfControlNumber || null,
                taxStampDate: data.taxStampDate || null,
                nfrtrSerial: data.nfrtrSerial || null,
                nfaRegistered: data.nfaRegistered,
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                condition: data.condition as Firearm['condition'],
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                location: data.location || null,
                insured: data.insured,
                notes: data.notes || null,
            }

            try {
                if (
                    firearmForm.isEditing &&
                    firearmForm.editing &&
                    'id' in firearmForm.editing
                ) {
                    const editingId = (firearmForm.editing as Firearm).id
                    await updateFirearmMutation.mutateAsync({
                        id: editingId,
                        entityId: entityId!,
                        data: payload,
                    })
                } else {
                    await createFirearmMutation.mutateAsync(payload)
                }
            } catch (err) {
                if (
                    err instanceof TRPCClientError &&
                    err.data?.code === 'CONFLICT'
                ) {
                    toast.error(
                        'A firearm with this serial number already exists.',
                    )
                    return // do NOT close — let user fix the serialNumber
                }
                throw err
            }
        },
    })

    const handleEdit = useCallback(
        (f: Firearm) => {
            firearmForm.handleEdit({
                ...f,
                description: f.description || '',
                caliber: f.caliber || '',
                barrelLength: f.barrelLength || '',
                action: f.action || '',
                nfaClass: f.nfaClass,
                atfFormType: f.atfFormType,
                atfControlNumber: f.atfControlNumber || '',
                taxStampDate: toDateInput(f.taxStampDate),
                nfrtrSerial: f.nfrtrSerial || '',
                nfaRegistered: f.nfaRegistered,
                acquisitionDate: toDateInput(f.acquisitionDate),
                acquisitionCost: f.acquisitionCost || '',
                dodValue: f.dodValue || '',
                dodValueDate: toDateInput(f.dodValueDate),
                dodValueType: f.dodValueType || '',
                location: f.location || '',
                notes: f.notes || '',
            })
        },
        [firearmForm],
    )

    const handleDelete = useCallback(
        (item: Firearm) => {
            setPendingDelete(item)
            confirmDelete()
        },
        [confirmDelete],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<Firearm>) => {
            try {
                await updateFirearmMutation.mutateAsync({
                    id,
                    entityId: entityId!,
                    data: updates,
                })
            } catch (err) {
                log.error('Failed to update firearm', { error: err })
            }
        },
        [updateFirearmMutation, entityId],
    )

    // Sequential bulk delete — leaves a known committed set + exact failure count.
    const onBulkDelete = useCallback(
        async (rows: Firearm[]) => {
            let failed = 0
            for (const row of rows) {
                try {
                    await deleteFirearmMutation.mutateAsync({
                        id: row.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    failed++
                    log.error('Bulk delete failed', {
                        id: row.id,
                        error: err,
                    })
                }
            }
            if (failed > 0) {
                toast.error(
                    `Failed to delete ${failed} of ${rows.length} firearms`,
                )
            } else {
                toast.success(`Deleted ${rows.length} firearms`)
            }
        },
        [deleteFirearmMutation, entityId],
    )

    // KPI compute (UI-SPEC §KPI Strip)
    const totalDodValue = sumStrings(firearms.map((f) => f.dodValue))
    const transferredCount = firearms.filter(
        (f) => f.transferStatus === 'COMPLETE',
    ).length
    const transferPct =
        firearms.length > 0 ? (transferredCount / firearms.length) * 100 : 0
    const nfaCount = firearms.filter((f) => f.isNfa).length

    const kpiData: KpiStripItem[] = [
        { label: 'Firearm count', value: firearms.length },
        { label: 'Total DOD value', value: formatCurrency(totalDodValue) },
        { label: 'Transfer % complete', value: formatPercent(transferPct) },
        { label: 'NFA items', value: nfaCount },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Firearms"
                description="Firearms held by the trust."
                actions={
                    <Button onClick={firearmForm.handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Firearm
                    </Button>
                }
            />

            <KpiStrip data={kpiData} isLoading={firearmsLoading} />

            <FirearmTable
                firearms={firearms}
                isLoading={firearmsLoading}
                entityId={entityId!}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdateNfaStatus={setNfaStatusFirearm}
                onBulkDelete={onBulkDelete}
                onInlineUpdate={handleInlineUpdate}
            />

            <FirearmDialog
                isOpen={firearmForm.isOpen}
                isEditing={firearmForm.isEditing}
                isSubmitting={firearmForm.isSubmitting}
                onOpenChange={firearmForm.close}
                onSubmit={firearmForm.handleSave}
                formInstance={firearmForm.formInstance}
                wizard={firearmForm}
            />

            {nfaStatusFirearm && (
                <NfaStatusDialog
                    firearm={{
                        id: nfaStatusFirearm.id,
                        entityId: nfaStatusFirearm.entityId,
                        nfaTransferStatus:
                            (nfaStatusFirearm.nfaTransferStatus as
                                | 'NOT_FILED'
                                | 'FILED'
                                | 'APPROVED'
                                | null) ?? 'NOT_FILED',
                    }}
                    open={!!nfaStatusFirearm}
                    onOpenChange={(open) => {
                        if (!open) setNfaStatusFirearm(null)
                    }}
                />
            )}

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
