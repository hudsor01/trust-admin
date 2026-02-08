'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
    const utils = trpc.useUtils()
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
    } = useCrudMutations({
        router: trpc.vehicle,
        invalidate: () => utils.vehicle.list.invalidate(),
    })

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
                    entityId: selectedEntity,
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
        async (item: Vehicle) => {
            if (!confirm('Are you sure you want to delete this vehicle?'))
                return
            if (!selectedEntity) return
            try {
                await deleteVehicleMutation.mutateAsync({
                    id: item.id,
                    entityId: selectedEntity,
                })
            } catch (err) {
                console.error('Failed to delete vehicle:', err)
            }
        },
        [deleteVehicleMutation, selectedEntity],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<Vehicle>) => {
            if (!selectedEntity) return
            try {
                await updateVehicleMutation.mutateAsync({
                    id,
                    entityId: selectedEntity,
                    data: updates,
                })
            } catch (err) {
                console.error('Failed to update vehicle:', err)
            }
        },
        [updateVehicleMutation, selectedEntity],
    )

    // Column definitions using TanStack Table format
    const columns: ColumnDef<Vehicle>[] = useMemo(
        () => [
            {
                id: 'vehicle',
                accessorFn: (row) =>
                    `${row.year} ${row.make} ${row.model}`.toLowerCase(),
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Year/Make/Model"
                    />
                ),
                cell: ({ row }) => (
                    <div>
                        <p className="font-medium">
                            {row.original.year} {row.original.make}{' '}
                            {row.original.model}
                        </p>
                        {row.original.mileage && (
                            <p className="text-xs text-muted-foreground">
                                {row.original.mileage.toLocaleString()} miles
                            </p>
                        )}
                    </div>
                ),
                filterFn: 'includesString',
            },
            {
                accessorKey: 'vin',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="VIN" />
                ),
                cell: ({ row }) => (
                    <code className="text-xs">
                        {row.original.vin.slice(-6)}
                    </code>
                ),
            },
            {
                accessorKey: 'color',
                header: 'Color',
                cell: ({ row }) => (
                    <EditableTextCell
                        value={row.original.color}
                        onSave={(val) =>
                            handleInlineUpdate(row.original.id, { color: val })
                        }
                        placeholder="Add color"
                    />
                ),
            },
            {
                accessorKey: 'dodValue',
                header: 'DOD Value',
                cell: ({ row }) => (
                    <EditableCurrencyCell
                        value={row.original.dodValue}
                        onSave={(val) =>
                            handleInlineUpdate(row.original.id, {
                                dodValue: val,
                            })
                        }
                    />
                ),
            },
            {
                accessorKey: 'titleStatus',
                header: 'Title',
                cell: ({ row }) => (
                    <EditableSelectCell
                        value={row.original.titleStatus}
                        options={TITLE_STATUS}
                        variants={STATUS_VARIANTS}
                        onSave={(val) =>
                            handleInlineUpdate(row.original.id, {
                                titleStatus: asTitleStatus(val),
                            })
                        }
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <EditableSelectCell
                        value={row.original.status}
                        options={ASSET_STATUS}
                        variants={STATUS_VARIANTS}
                        onSave={(val) =>
                            handleInlineUpdate(row.original.id, {
                                status: asRecordStatus(val),
                            })
                        }
                    />
                ),
            },
            {
                accessorKey: 'transferStatus',
                header: 'Transfer',
                cell: ({ row }) => (
                    <EditableSelectCell
                        value={row.original.transferStatus}
                        options={TRANSFER_STATUS}
                        variants={STATUS_VARIANTS}
                        onSave={(val) =>
                            handleInlineUpdate(row.original.id, {
                                transferStatus: asTransferStatus(val),
                            })
                        }
                    />
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(row.original)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(row.original)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ),
            },
        ],
        [handleInlineUpdate, handleEdit, handleDelete],
    )

    if (entitiesLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

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
                    value={selectedEntity?.toString() ?? ''}
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
                    {/* Actions */}
                    <div className="flex justify-end">
                        <Button onClick={vehicleForm.handleAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Vehicle
                        </Button>
                    </div>

                    {/* Table */}
                    <DataTable
                        columns={columns}
                        data={vehicles}
                        searchKey="vehicle"
                        searchPlaceholder="Search vehicles..."
                        isLoading={vehiclesLoading}
                        emptyMessage="No vehicles. Click Add Vehicle to create one."
                        enablePagination={true}
                    />
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
                                            value={
                                                field.state.value
                                                    ? String(field.state.value)
                                                    : ''
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value
                                                // Only update if empty or valid 4-digit year
                                                if (val === '') {
                                                    // Don't auto-fill on clear - let user type fresh
                                                    return
                                                }
                                                const parsed = Number.parseInt(
                                                    val,
                                                    10,
                                                )
                                                if (
                                                    !Number.isNaN(parsed) &&
                                                    parsed >= 0
                                                ) {
                                                    field.handleChange(parsed)
                                                }
                                            }}
                                            onBlur={(e) => {
                                                field.handleBlur()
                                                // On blur, ensure we have a valid year
                                                const val = e.target.value
                                                if (
                                                    !val ||
                                                    Number.parseInt(val, 10) <
                                                        1900
                                                ) {
                                                    field.handleChange(
                                                        new Date().getFullYear(),
                                                    )
                                                }
                                            }}
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                            <vehicleForm.formInstance.Field name="color">
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                                {(field: {
                                    state: {
                                        value: number
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: number) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="mileage">Mileage</Label>
                                        <Input
                                            id="mileage"
                                            type="number"
                                            value={field.state.value || ''}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    Number.parseInt(
                                                        e.target.value,
                                                        10,
                                                    ) || 0,
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="titleStatus">
                                            Title Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger id="titleStatus">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TITLE_STATUS.map((opt) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                            <vehicleForm.formInstance.Field name="acquisitionCost">
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
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
                            <vehicleForm.formInstance.Field name="dodValueType">
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="dodValueType">
                                            Valuation Type
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger id="dodValueType">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOD_VALUE_TYPES.map((opt) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="status">
                                            Asset Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSET_STATUS.map((opt) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
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
                                {(field: {
                                    state: {
                                        value: string
                                        meta: { errors?: unknown[] }
                                    }
                                    handleChange: (value: string) => void
                                    handleBlur: () => void
                                }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="transferStatus">
                                            Transfer Status *
                                        </Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger id="transferStatus">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSFER_STATUS.map((opt) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
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
                        {(field: {
                            state: {
                                value: string
                                meta: { errors?: unknown[] }
                            }
                            handleChange: (value: string) => void
                            handleBlur: () => void
                        }) => (
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    rows={4}
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
