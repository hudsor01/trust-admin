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
import type { artworkFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'
import { ASSET_STATUS } from './ArtworkTable'

interface ArtworkDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<
        ReturnType<typeof artworkFormDefaults>
    >['formInstance']
}

export function ArtworkDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: ArtworkDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Artwork' : 'Add Artwork'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">
                {/* Artwork Information */}
                <div>
                    <h4 className="text-sm font-medium mb-3">
                        Artwork Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <formInstance.Field name="title">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Starry Night"
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
                        <formInstance.Field name="artist">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="artist">Artist</Label>
                                    <Input
                                        id="artist"
                                        placeholder="e.g., Van Gogh"
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
                        <formInstance.Field name="medium">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="medium">Medium</Label>
                                    <Input
                                        id="medium"
                                        placeholder="e.g., Oil on canvas"
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
                        <formInstance.Field name="dimensions">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="dimensions">
                                        Dimensions
                                    </Label>
                                    <Input
                                        id="dimensions"
                                        placeholder='e.g., 24" x 36"'
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
                    <div className="mt-4">
                        <formInstance.Field name="location">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        placeholder="e.g., Living room, Storage unit"
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
                                        placeholder="$ (appraised)"
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
