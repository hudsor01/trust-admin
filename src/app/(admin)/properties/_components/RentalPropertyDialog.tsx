'use client'

import { NameDescriptionFields } from '@/components/forms/NameDescriptionFields'
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
import {
    DOD_VALUE_TYPES,
    RENTAL_STATUS,
    TRANSFER_STATUS,
} from '@/lib/constants'
import type { RentalFormData } from './constants'
import { ASSET_STATUS } from './constants'

interface RentalPropertyDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<RentalFormData>['formInstance']
}

export function RentalPropertyDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: RentalPropertyDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Rental Property' : 'Add Rental Property'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">
                <div>
                    <h4 className="mb-3 text-sm font-medium">Identity</h4>
                    <NameDescriptionFields
                        Field={
                            formInstance.Field as unknown as Parameters<
                                typeof NameDescriptionFields
                            >[0]['Field']
                        }
                        idPrefix="rental"
                        namePlaceholder="e.g., Oak Street Duplex"
                    />
                </div>

                <div>
                    <h4 className="mb-3 text-sm font-medium">Property Info</h4>
                    <div className="space-y-3">
                        <formInstance.Field name="streetAddress">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-street">
                                        Street Address
                                    </Label>
                                    <Input
                                        id="r-street"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <div className="grid grid-cols-4 gap-3">
                            <formInstance.Field name="city">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="r-city">City</Label>
                                        <Input
                                            id="r-city"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                            <formInstance.Field name="state">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="r-state">State</Label>
                                        <Input
                                            id="r-state"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                            <formInstance.Field name="zip">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="r-zip">ZIP</Label>
                                        <Input
                                            id="r-zip"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                            <formInstance.Field name="county">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="r-county">County</Label>
                                        <Input
                                            id="r-county"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="mb-3 text-sm font-medium">Rental Info</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <formInstance.Field name="rentalStatus">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Rental Status</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RENTAL_STATUS.map((s) => (
                                                <SelectItem
                                                    key={s.value}
                                                    value={s.value}
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="monthlyRent">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-rent">Monthly Rent</Label>
                                    <Input
                                        id="r-rent"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="$"
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        <formInstance.Field name="leaseStart">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-lease-start">
                                        Lease Start
                                    </Label>
                                    <Input
                                        id="r-lease-start"
                                        type="date"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="leaseEnd">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-lease-end">
                                        Lease End
                                    </Label>
                                    <Input
                                        id="r-lease-end"
                                        type="date"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="propertyManager">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-manager">
                                        Property Manager
                                    </Label>
                                    <Input
                                        id="r-manager"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                <div>
                    <h4 className="mb-3 text-sm font-medium">
                        Date of Death Valuation
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <formInstance.Field name="dodValue">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-dod-val">DOD Value</Label>
                                    <Input
                                        id="r-dod-val"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="$"
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="dodValueDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-dod-date">
                                        DOD Value Date
                                    </Label>
                                    <Input
                                        id="r-dod-date"
                                        type="date"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="dodValueType">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Valuation Type</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger>
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
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                <div>
                    <h4 className="mb-3 text-sm font-medium">Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <formInstance.Field name="status">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Asset Status</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger>
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
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="transferStatus">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label>Transfer Status</Label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                    >
                                        <SelectTrigger>
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
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </div>

                <formInstance.Field name="notes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="r-notes">Notes</Label>
                            <Textarea
                                id="r-notes"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                            />
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
