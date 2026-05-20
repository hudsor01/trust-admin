'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import type { Vehicle } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput, vehicleFormDefaults } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asRecordStatus,
    asTitleStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { VehicleDialog } from './VehicleDialog'
import { VehicleTable } from './VehicleTable'

const log = logger.create('Vehicles')

export function VehiclesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: vehicles = [], isLoading: vehiclesLoading } =
        trpc.vehicle.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createVehicleMutation = trpc.vehicle.create.useMutation({
        onSuccess: () => utils.vehicle.list.invalidate(),
    })
    const updateVehicleMutation = trpc.vehicle.update.useMutation({
        onSuccess: () => utils.vehicle.list.invalidate(),
    })
    const deleteVehicleMutation = trpc.vehicle.delete.useMutation({
        onSuccess: () => utils.vehicle.list.invalidate(),
    })

    const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null)

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Vehicle',
            description:
                'Are you sure you want to delete this vehicle? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteVehicleMutation.mutateAsync({
                        id: pendingDelete.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete vehicle', { error: err })
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const vehicleForm = useResourceForm({
        initialData: vehicleFormDefaults(),
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                year: data.year,
                make: data.make,
                model: data.model,
                vin: data.vin,
                color: data.color || null,
                licensePlate: data.licensePlate || null,
                mileage: data.mileage,
                titleStatus: asTitleStatus(data.titleStatus),
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (
                vehicleForm.isEditing &&
                vehicleForm.editing &&
                'id' in vehicleForm.editing
            ) {
                const editingId = (vehicleForm.editing as Vehicle).id
                await updateVehicleMutation.mutateAsync({
                    id: editingId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createVehicleMutation.mutateAsync(payload)
            }
        },
    })

    const handleEdit = useCallback(
        (v: Vehicle) => {
            vehicleForm.handleEdit({
                ...v,
                description: v.description || '',
                color: v.color || '',
                licensePlate: v.licensePlate || '',
                acquisitionDate: toDateInput(v.acquisitionDate),
                acquisitionCost: v.acquisitionCost || '',
                dodValue: v.dodValue || '',
                dodValueDate: toDateInput(v.dodValueDate),
                dodValueType: v.dodValueType || '',
                notes: v.notes || '',
            })
        },
        [vehicleForm],
    )

    const handleDelete = useCallback(
        (item: Vehicle) => {
            setPendingDelete(item)
            confirmDelete()
        },
        [confirmDelete],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<Vehicle>) => {
            try {
                await updateVehicleMutation.mutateAsync({
                    id,
                    entityId: entityId!,
                    data: updates,
                })
            } catch (err) {
                log.error('Failed to update vehicle', { error: err })
            }
        },
        [updateVehicleMutation, entityId],
    )

    const totalValue = sumStrings(vehicles.map((v) => v.dodValue))
    const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length
    const transferredCount = vehicles.filter(
        (v) => v.transferStatus === 'COMPLETE',
    ).length
    const transferPct =
        vehicles.length > 0 ? (transferredCount / vehicles.length) * 100 : 0
    const kpiData: KpiStripItem[] = [
        { label: 'Vehicle count', value: vehicles.length },
        { label: 'Total DOD value', value: formatCurrency(totalValue) },
        { label: 'Transfer % complete', value: formatPercent(transferPct) },
        { label: 'Active count', value: activeCount },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Vehicles"
                description="Vehicles titled to the trust."
                actions={
                    <Button onClick={vehicleForm.handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vehicle
                    </Button>
                }
            />

            <KpiStrip data={kpiData} isLoading={vehiclesLoading} />

            <VehicleTable
                vehicles={vehicles}
                isLoading={vehiclesLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineUpdate={handleInlineUpdate}
            />

            <VehicleDialog
                isOpen={vehicleForm.isOpen}
                isEditing={vehicleForm.isEditing}
                isSubmitting={vehicleForm.isSubmitting}
                onOpenChange={vehicleForm.close}
                onSubmit={vehicleForm.handleSave}
                formInstance={vehicleForm.formInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
