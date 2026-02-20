'use client'

import { ResourceDialog } from '@/components/resource-dialog'
import { Checkbox } from '@/components/ui/checkbox'
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
import { DOD_VALUE_TYPES, RENTAL_STATUS, TRANSFER_STATUS } from '@/lib/constants'
import { ASSET_STATUS, PROPERTY_TYPES } from './constants'

interface RentalPropertyDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Form Field type is complex; passed through from page.tsx
    formInstance: any
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
                {/* Property Info */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">Property Info</h4>
                    <div className="space-y-3">
                        <formInstance.Field name="name">
                            {(field: any) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-name">Property Name</Label>
                                    <Input
                                        id="r-name"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        placeholder="e.g., Oak Street Duplex"
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="streetAddress">
                            {(field: any) => (
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
                                {(field: any) => (
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
                                {(field: any) => (
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
                                {(field: any) => (
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
                                {(field: any) => (
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

                {/* Property Details */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">
                        Property Details
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                        <formInstance.Field name="propertyType">
                            {(field: any) => (
                                <div className="space-y-2">
                                    <Label>Property Type</Label>
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
                                            {PROPERTY_TYPES.map((t) => (
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
                        <formInstance.Field name="units">
                            {(field: any) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-units">Units</Label>
                                    <Input
                                        id="r-units"
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="yearBuilt">
                            {(field: any) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-year">Year Built</Label>
                                    <Input
                                        id="r-year"
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="squareFeet">
                            {(field: any) => (
                                <div className="space-y-2">
                                    <Label htmlFor="r-sqft">Square Feet</Label>
                                    <Input
                                        id="r-sqft"
                                        type="number"
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

                {/* Rental Info */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">Rental Info</h4>
                    <div className="grid grid-cols-4 gap-3">
                        <formInstance.Field name="rentalStatus">
                            {(field: any) => (
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
                            {(field: any) => (
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
                        <formInstance.Field name="leaseStart">
                            {(field: any) => (
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
                            {(field: any) => (
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
                    </div>
                    <div className="mt-3">
                        <formInstance.Field name="propertyManager">
                            {(field: any) => (
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

                {/* DOD Valuation */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">
                        Date of Death Valuation
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <formInstance.Field name="dodValue">
                            {(field: any) => (
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
                            {(field: any) => (
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
                            {(field: any) => (
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

                {/* DOD Affidavit */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">
                        DOD Affidavit (Texas)
                    </h4>
                    <div className="grid grid-cols-3 items-end gap-3">
                        <formInstance.Field name="dodAffidavitFiled">
                            {(field: any) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="r-affidavit"
                                        checked={field.state.value}
                                        onCheckedChange={(checked) =>
                                            field.handleChange(!!checked)
                                        }
                                    />
                                    <Label htmlFor="r-affidavit">
                                        Affidavit Filed
                                    </Label>
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Subscribe<boolean>
                            selector={(state: any) =>
                                state.values.dodAffidavitFiled
                            }
                        >
                            {(dodAffidavitFiled: boolean) => (
                                <>
                                    <formInstance.Field name="dodAffidavitDate">
                                        {(field: any) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="r-filing-date">
                                                    Filing Date
                                                </Label>
                                                <Input
                                                    id="r-filing-date"
                                                    type="date"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={
                                                        !dodAffidavitFiled
                                                    }
                                                />
                                            </div>
                                        )}
                                    </formInstance.Field>
                                    <formInstance.Field name="clerkFileNo">
                                        {(field: any) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="r-clerk">
                                                    Clerk File Number
                                                </Label>
                                                <Input
                                                    id="r-clerk"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={
                                                        !dodAffidavitFiled
                                                    }
                                                />
                                            </div>
                                        )}
                                    </formInstance.Field>
                                </>
                            )}
                        </formInstance.Subscribe>
                    </div>
                </div>

                {/* Status */}
                <div>
                    <h4 className="mb-3 text-sm font-medium">Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <formInstance.Field name="status">
                            {(field: any) => (
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
                            {(field: any) => (
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

                {/* Notes */}
                <formInstance.Field name="notes">
                    {(field: any) => (
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
