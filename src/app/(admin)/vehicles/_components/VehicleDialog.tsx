'use client'

import { ResourceDialog } from '@/components/resource-dialog'
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
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { DOD_VALUE_TYPES, TRANSFER_STATUS } from '@/lib/constants'
import type { vehicleFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'
import { ASSET_STATUS, TITLE_STATUS } from './VehicleTable'

interface VehicleDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<
        ReturnType<typeof vehicleFormDefaults>
    >['formInstance']
}

export function VehicleDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: VehicleDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">
                {/* Vehicle Information */}
                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Vehicle Information
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                        <formInstance.Field name="year">
                            {(field) => (
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
                                            if (val === '') return
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
                                            const val = e.target.value
                                            if (
                                                !val ||
                                                Number.parseInt(val, 10) < 1900
                                            ) {
                                                field.handleChange(
                                                    new Date().getFullYear(),
                                                )
                                            }
                                        }}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="make">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="make">Make *</Label>
                                    <Input
                                        id="make"
                                        placeholder="e.g., Ford, Toyota"
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="model">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model *</Label>
                                    <Input
                                        id="model"
                                        placeholder="e.g., F-150, Camry"
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <formInstance.Field name="vin">
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="color">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="color">Color</Label>
                                    <Input
                                        id="color"
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <formInstance.Field name="licensePlate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="licensePlate">
                                        License Plate
                                    </Label>
                                    <Input
                                        id="licensePlate"
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="mileage">
                            {(field) => (
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="titleStatus">
                            {(field) => (
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                {/* Acquisition */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Acquisition</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="acquisitionDate">
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
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="acquisitionCost">
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
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                {/* DOD Valuation */}
                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Date of Death Valuation
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                        <formInstance.Field name="dodValue">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="dodValue">DOD Value</Label>
                                    <Input
                                        id="dodValue"
                                        placeholder="$ (KBB/NADA)"
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="dodValueDate">
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
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                    {field.state.meta.errors &&
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="dodValueType">
                            {(field) => (
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="status">
                            {(field) => (
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="transferStatus">
                            {(field) => (
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
                                        field.state.meta.errors.length > 0 && (
                                            <p className="text-sm text-red-500">
                                                {getFieldError(field)}
                                            </p>
                                        )}
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                {/* Notes */}
                <formInstance.Field name="notes">
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
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
