'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import type { Vehicle } from '@/db/schema'
import { useNeonList, useNeonMutations } from '@/hooks/use-neon-data'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput, vehicleFormDefaults } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import {
    asRecordStatus,
    asTitleStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { VehicleDialog } from './_components/VehicleDialog'
import { VehicleTable } from './_components/VehicleTable'

const log = logger.create('Vehicles')

export default function VehiclesPage() {
    const entityId = 1

    const { data: vehicles = [], isLoading: vehiclesLoading } =
        useNeonList<Vehicle>('vehicle', { entity_id: entityId })

    const {
        create: createVehicleMutation,
        update: updateVehicleMutation,
        delete: deleteVehicleMutation,
    } = useNeonMutations<Vehicle>('vehicle')

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
                        entityId,
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
                entityId,
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
                    entityId,
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
                    entityId,
                    data: updates,
                })
            } catch (err) {
                log.error('Failed to update vehicle', { error: err })
            }
        },
        [updateVehicleMutation],
    )

    const totalValue = sumStrings(vehicles.map((v) => v.dodValue))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Vehicles
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage vehicle assets
                        {vehicles.length > 0 &&
                            ` - Total DOD Value: ${formatCurrency(totalValue)}`}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Button onClick={vehicleForm.handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                </Button>
            </div>

            {/* Table */}
            <VehicleTable
                vehicles={vehicles}
                isLoading={vehiclesLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineUpdate={handleInlineUpdate}
            />

            {/* Vehicle Form Dialog */}
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
