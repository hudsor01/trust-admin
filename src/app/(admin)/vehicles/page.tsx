'use client'

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
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
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Vehicle } from '@/db/schema'
import { useCrudMutations } from '@/hooks/use-crud-mutations'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
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

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return
        try {
            await deleteVehicleMutation.mutateAsync(id)
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
                                                <TableHead>Color</TableHead>
                                                <TableHead>DOD Value</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Transfer</TableHead>
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
                                                        <EditableTextCell
                                                            value={v.color}
                                                            onSave={(val) =>
                                                                handleInlineUpdate(
                                                                    v.id,
                                                                    {
                                                                        color: val,
                                                                    },
                                                                )
                                                            }
                                                            placeholder="Add color"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <EditableCurrencyCell
                                                            value={v.dodValue}
                                                            onSave={(val) =>
                                                                handleInlineUpdate(
                                                                    v.id,
                                                                    {
                                                                        dodValue:
                                                                            val,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <EditableSelectCell
                                                            value={
                                                                v.titleStatus
                                                            }
                                                            options={
                                                                TITLE_STATUS
                                                            }
                                                            variants={
                                                                STATUS_VARIANTS
                                                            }
                                                            onSave={(val) =>
                                                                handleInlineUpdate(
                                                                    v.id,
                                                                    {
                                                                        titleStatus:
                                                                            asTitleStatus(
                                                                                val,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <EditableSelectCell
                                                            value={v.status}
                                                            options={
                                                                ASSET_STATUS
                                                            }
                                                            variants={
                                                                STATUS_VARIANTS
                                                            }
                                                            onSave={(val) =>
                                                                handleInlineUpdate(
                                                                    v.id,
                                                                    {
                                                                        status: asRecordStatus(
                                                                            val,
                                                                        ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <EditableSelectCell
                                                            value={
                                                                v.transferStatus
                                                            }
                                                            options={
                                                                TRANSFER_STATUS
                                                            }
                                                            variants={
                                                                STATUS_VARIANTS
                                                            }
                                                            onSave={(val) =>
                                                                handleInlineUpdate(
                                                                    v.id,
                                                                    {
                                                                        transferStatus:
                                                                            asTransferStatus(
                                                                                val,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() =>
                                                                                handleEdit(
                                                                                    v,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            Edit
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    v.id,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            Delete
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
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
                    {/* Vehicle Information */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Vehicle Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <vehicleForm.formInstance.Field name="year">
                                {(field) => (
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
                                                    parseInt(
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
                            <vehicleForm.formInstance.Field name="make">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="make">Make *</Label>
                                        <Input
                                            id="make"
                                            placeholder="e.g., Ford, Toyota"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                            <vehicleForm.formInstance.Field name="model">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="model">Model *</Label>
                                        <Input
                                            id="model"
                                            placeholder="e.g., F-150, Camry"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <vehicleForm.formInstance.Field name="vin">
                                {(field) => (
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
                            <vehicleForm.formInstance.Field name="color">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Color</Label>
                                        <Input
                                            id="color"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <vehicleForm.formInstance.Field name="licensePlate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="licensePlate">
                                            License Plate
                                        </Label>
                                        <Input
                                            id="licensePlate"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                            <vehicleForm.formInstance.Field name="mileage">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="mileage">Mileage</Label>
                                        <Input
                                            id="mileage"
                                            type="number"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value
                                                        ? parseInt(
                                                              e.target.value,
                                                              10,
                                                          )
                                                        : null,
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
                            <vehicleForm.formInstance.Field name="titleStatus">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="titleStatus">
                                            Title Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="titleStatus"
                                                onBlur={field.handleBlur}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TITLE_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                        </div>
                    </div>

                    {/* Acquisition */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Acquisition
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <vehicleForm.formInstance.Field name="acquisitionDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="acquisitionDate">
                                            Acquisition Date
                                        </Label>
                                        <Input
                                            id="acquisitionDate"
                                            type="date"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value || null,
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
                            <vehicleForm.formInstance.Field name="acquisitionCost">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="acquisitionCost">
                                            Acquisition Cost
                                        </Label>
                                        <Input
                                            id="acquisitionCost"
                                            placeholder="$"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                        </div>
                    </div>

                    {/* DOD Valuation */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Date of Death Valuation
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <vehicleForm.formInstance.Field name="dodValue">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="dodValue">
                                            DOD Value
                                        </Label>
                                        <Input
                                            id="dodValue"
                                            placeholder="$ (KBB/NADA)"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
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
                            <vehicleForm.formInstance.Field name="dodValueDate">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="dodValueDate">
                                            DOD Value Date
                                        </Label>
                                        <Input
                                            id="dodValueDate"
                                            type="date"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value || null,
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
                            <vehicleForm.formInstance.Field name="dodValueType">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="dodValueType">
                                            Valuation Type
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="dodValueType"
                                                onBlur={field.handleBlur}
                                            >
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOD_VALUE_TYPES.map((t) => (
                                                    <SelectItem
                                                        key={t.value}
                                                        value={t.value}
                                                    >
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <vehicleForm.formInstance.Field name="status">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="status">
                                            Asset Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="status"
                                                onBlur={field.handleBlur}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSET_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                            <vehicleForm.formInstance.Field name="transferStatus">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="transferStatus">
                                            Transfer Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={(v) =>
                                                field.handleChange(v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="transferStatus"
                                                onBlur={field.handleBlur}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSFER_STATUS.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                        </div>
                    </div>

                    {/* Notes */}
                    <vehicleForm.formInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    rows={3}
                                />
                                {field.state.meta.errors &&
                                    field.state.meta.errors.length > 0 && (
                                        <p className="text-sm text-red-500">
                                            {getFieldError(field)}
                                        </p>
                                    )}
                            </div>
                        )}
                    </vehicleForm.formInstance.Field>
                </div>
            </ResourceDialog>
        </div>
    )
}
