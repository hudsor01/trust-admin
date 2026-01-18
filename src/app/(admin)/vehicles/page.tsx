'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { CurrencyField, FormField } from '@/components/form-field'
import { ResourceDialog } from '@/components/resource-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { Vehicle } from '@/db/schema'
import { useCrudMutations } from '@/hooks/use-crud-mutations'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import {
    actionsColumn,
    editableCurrencyColumn,
    editableSelectColumn,
    editableTextColumn,
} from '@/lib/column-helpers'
import {
    DOD_VALUE_TYPES,
    STATUS_VARIANTS,
    TRANSFER_STATUS,
} from '@/lib/constants'
import { toDateInput, vehicleFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asRecordStatus,
    asTitleStatus,
    asTransferStatus,
    asValuationType,
    enumToOptions,
    RECORD_STATUS_VALUES,
    TITLE_STATUS_VALUES,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'

// Derive options from schema enums (single source of truth)
const TITLE_STATUS = enumToOptions(TITLE_STATUS_VALUES)
const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

export default function VehiclesPage() {
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityIdStr, setEntityIdStr] = useEntityFilter()
    const selectedEntity = entityIdStr ? Number(entityIdStr) : entities[0]?.id

    const { data: vehicles = [], isLoading: vehiclesLoading } =
        trpc.vehicle.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

    const {
        create: createVehicleMutation,
        update: updateVehicleMutation,
        delete: deleteVehicleMutation,
    } = useCrudMutations('vehicle')

    const [searchQuery, setSearchQuery] = useState('')

    // Use useResourceForm hook with TanStack Form validation
    const vehicleForm = useResourceForm({
        initialData: vehicleFormDefaults(),
        onSubmit: async (data) => {
            if (!selectedEntity) return

            const payload = {
                entityId: selectedEntity,
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
                    data: payload,
                })
            } else {
                await createVehicleMutation.mutateAsync(payload)
            }
        },
    })

    const handleEdit = (v: Vehicle) => {
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
    }

    const handleDelete = async (item: Vehicle) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return
        try {
            await deleteVehicleMutation.mutateAsync(item.id)
        } catch (err) {
            console.error('Failed to delete vehicle:', err)
        }
    }

    const handleInlineUpdate = async (
        id: number,
        updates: Partial<Vehicle>,
    ) => {
        try {
            await updateVehicleMutation.mutateAsync({ id, data: updates })
        } catch (err) {
            console.error('Failed to update vehicle:', err)
        }
    }

    // Column definitions using helpers
    const colorColumn = editableTextColumn<Vehicle>(
        'color',
        'Color',
        (id, val) => handleInlineUpdate(id, { color: val }),
        { placeholder: 'Add color' },
    )

    const dodValueColumn = editableCurrencyColumn<Vehicle>(
        'dodValue',
        'DOD Value',
        (id, val) => handleInlineUpdate(id, { dodValue: val }),
    )

    const titleColumn = editableSelectColumn<Vehicle>(
        'titleStatus',
        'Title',
        TITLE_STATUS,
        (id, val) =>
            handleInlineUpdate(id, { titleStatus: asTitleStatus(val) }),
        { variants: STATUS_VARIANTS },
    )

    const statusColumn = editableSelectColumn<Vehicle>(
        'status',
        'Status',
        ASSET_STATUS,
        (id, val) => handleInlineUpdate(id, { status: asRecordStatus(val) }),
        { variants: STATUS_VARIANTS },
    )

    const transferColumn = editableSelectColumn<Vehicle>(
        'transferStatus',
        'Transfer',
        TRANSFER_STATUS,
        (id, val) =>
            handleInlineUpdate(id, { transferStatus: asTransferStatus(val) }),
        { variants: STATUS_VARIANTS },
    )

    const actions = actionsColumn<Vehicle>({
        onEdit: handleEdit,
        onDelete: handleDelete,
    })

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const filteredVehicles = vehicles.filter((v) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            v.make.toLowerCase().includes(query) ||
            v.model.toLowerCase().includes(query) ||
            v.vin.toLowerCase().includes(query) ||
            v.year.toString().includes(query)
        )
    })

    const totalValue = sumStrings(vehicles.map((v) => v.dodValue))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Manage vehicle assets
                    {vehicles.length > 0 &&
                        ` - Total DOD Value: ${formatCurrency(totalValue)}`}
                </p>
                <Select
                    value={selectedEntity?.toString() ?? undefined}
                    onValueChange={(val) => setEntityIdStr(val || null)}
                >
                    <SelectTrigger className="w-70">
                        <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedEntity && (
                <>
                    {/* Search & Actions */}
                    <div className="flex items-center justify-between gap-4">
                        <Input
                            placeholder="Search vehicles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const csv = [
                                        [
                                            'Year',
                                            'Make',
                                            'Model',
                                            'VIN',
                                            'Color',
                                            'DOD Value',
                                            'Title Status',
                                            'Status',
                                        ].join(','),
                                        ...vehicles.map((v) =>
                                            [
                                                v.year,
                                                v.make,
                                                v.model,
                                                v.vin,
                                                v.color || '',
                                                v.dodValue || '',
                                                v.titleStatus,
                                                v.status,
                                            ].join(','),
                                        ),
                                    ].join('\n')
                                    const blob = new Blob([csv], {
                                        type: 'text/csv',
                                    })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `vehicles-${new Date().toISOString().split('T')[0]}.csv`
                                    a.click()
                                }}
                            >
                                Export CSV
                            </Button>
                            <Button onClick={vehicleForm.handleAdd}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Vehicle
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    {vehiclesLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    {vehicles.length === 0
                                        ? 'No vehicles. Click Add Vehicle to create one.'
                                        : 'No vehicles match your search.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Year/Make/Model
                                                </TableHead>
                                                <TableHead>VIN</TableHead>
                                                <TableHead>
                                                    {colorColumn.header}
                                                </TableHead>
                                                <TableHead>
                                                    {dodValueColumn.header}
                                                </TableHead>
                                                <TableHead>
                                                    {titleColumn.header}
                                                </TableHead>
                                                <TableHead>
                                                    {statusColumn.header}
                                                </TableHead>
                                                <TableHead>
                                                    {transferColumn.header}
                                                </TableHead>
                                                <TableHead className="w-20">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredVehicles.map((v) => (
                                                <TableRow key={v.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">
                                                                {v.year}{' '}
                                                                {v.make}{' '}
                                                                {v.model}
                                                            </p>
                                                            {v.mileage && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {v.mileage.toLocaleString()}{' '}
                                                                    miles
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs">
                                                            {v.vin.slice(-6)}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        {colorColumn.render?.(
                                                            v,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {dodValueColumn.render?.(
                                                            v,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {titleColumn.render?.(
                                                            v,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {statusColumn.render?.(
                                                            v,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {transferColumn.render?.(
                                                            v,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {actions.render?.(v)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Vehicle Form Dialog */}
            <ResourceDialog
                open={vehicleForm.isOpen}
                onOpenChange={vehicleForm.close}
                title={vehicleForm.isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
                onSubmit={vehicleForm.handleSave}
                isLoading={vehicleForm.isSubmitting}
            >
                <div className="space-y-6">
                    {/* Vehicle Information - Year/Make/Model grid kept raw for special handling */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Vehicle Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Year field needs special min/max handling */}
                            <vehicleForm.formInstance.Field name="year">
                                {(field: {
                                    state: {
                                        value: number
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: number) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="year">Year *</Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            min={1900}
                                            max={new Date().getFullYear() + 1}
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    Number.parseInt(
                                                        e.target.value,
                                                        10,
                                                    ) ||
                                                        new Date().getFullYear(),
                                                )
                                            }
                                            onBlur={field.handleBlur}
                                        />
                                        {field.state.meta.errors &&
                                            field.state.meta.errors.length >
                                                0 && (
                                                <p className="text-sm text-red-500">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                    </div>
                                )}
                            </vehicleForm.formInstance.Field>
                            <FormField
                                form={vehicleForm.formInstance}
                                name="make"
                                label="Make"
                                required
                                placeholder="e.g., Ford, Toyota"
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="model"
                                label="Model"
                                required
                                placeholder="e.g., F-150, Camry"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* VIN field needs uppercase transform */}
                            <vehicleForm.formInstance.Field name="vin">
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="vin">VIN *</Label>
                                        <Input
                                            id="vin"
                                            placeholder="17 characters"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            onBlur={field.handleBlur}
                                        />
                                        {field.state.meta.errors &&
                                            field.state.meta.errors.length >
                                                0 && (
                                                <p className="text-sm text-red-500">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                    </div>
                                )}
                            </vehicleForm.formInstance.Field>
                            <FormField
                                form={vehicleForm.formInstance}
                                name="color"
                                label="Color"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <FormField
                                form={vehicleForm.formInstance}
                                name="licensePlate"
                                label="License Plate"
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="mileage"
                                label="Mileage"
                                type="number"
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="titleStatus"
                                label="Title Status"
                                required
                                type="select"
                                options={TITLE_STATUS}
                            />
                        </div>
                    </div>

                    {/* Acquisition */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Acquisition
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                form={vehicleForm.formInstance}
                                name="acquisitionDate"
                                label="Acquisition Date"
                                type="date"
                            />
                            <CurrencyField
                                form={vehicleForm.formInstance}
                                name="acquisitionCost"
                                label="Acquisition Cost"
                            />
                        </div>
                    </div>

                    {/* DOD Valuation */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Date of Death Valuation
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <CurrencyField
                                form={vehicleForm.formInstance}
                                name="dodValue"
                                label="DOD Value"
                                placeholder="$ (KBB/NADA)"
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="dodValueDate"
                                label="DOD Value Date"
                                type="date"
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="dodValueType"
                                label="Valuation Type"
                                type="select"
                                options={DOD_VALUE_TYPES}
                                placeholder="Select type"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                form={vehicleForm.formInstance}
                                name="status"
                                label="Asset Status"
                                required
                                type="select"
                                options={ASSET_STATUS}
                            />
                            <FormField
                                form={vehicleForm.formInstance}
                                name="transferStatus"
                                label="Transfer Status"
                                required
                                type="select"
                                options={TRANSFER_STATUS}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <FormField
                        form={vehicleForm.formInstance}
                        name="notes"
                        label="Notes"
                        type="textarea"
                    />
                </div>
            </ResourceDialog>
        </div>
    )
}
