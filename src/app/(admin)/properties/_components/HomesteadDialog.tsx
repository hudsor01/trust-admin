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
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { DOD_VALUE_TYPES, TRANSFER_STATUS } from '@/lib/constants'
import type { HomesteadFormData } from './constants'
import { ASSET_STATUS, PROPERTY_TYPES } from './constants'

interface HomesteadDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<HomesteadFormData>['formInstance']
}

export function HomesteadDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: HomesteadDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Homestead' : 'Add Homestead'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">
                <div>
                    <h4 className="mb-3 text-sm font-medium">Address</h4>
                    <div className="space-y-3">
                        <formInstance.Field name="streetAddress">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-street">
                                        Street Address
                                    </Label>
                                    <Input
                                        id="h-street"
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
                                        <Label htmlFor="h-city">City</Label>
                                        <Input
                                            id="h-city"
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
                                        <Label htmlFor="h-state">State</Label>
                                        <Input
                                            id="h-state"
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
                                        <Label htmlFor="h-zip">ZIP</Label>
                                        <Input
                                            id="h-zip"
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
                                        <Label htmlFor="h-county">County</Label>
                                        <Input
                                            id="h-county"
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
                    <h4 className="mb-3 text-sm font-medium">
                        Property Details
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <formInstance.Field name="propertyType">
                            {(field) => (
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
                        <formInstance.Field name="yearBuilt">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-year">Year Built</Label>
                                    <Input
                                        id="h-year"
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
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-sqft">Square Feet</Label>
                                    <Input
                                        id="h-sqft"
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
                    <div className="mt-3 grid grid-cols-4 gap-3">
                        <formInstance.Field name="bedrooms">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-beds">Bedrooms</Label>
                                    <Input
                                        id="h-beds"
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
                        <formInstance.Field name="bathrooms">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-baths">Bathrooms</Label>
                                    <Input
                                        id="h-baths"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="lotSizeAcres">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-lot">
                                        Lot Size (acres)
                                    </Label>
                                    <Input
                                        id="h-lot"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="parcelNumber">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-parcel">
                                        Parcel Number
                                    </Label>
                                    <Input
                                        id="h-parcel"
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
                    <h4 className="mb-3 text-sm font-medium">Acquisition</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <formInstance.Field name="acquisitionDate">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-acq-date">
                                        Acquisition Date
                                    </Label>
                                    <Input
                                        id="h-acq-date"
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
                        <formInstance.Field name="acquisitionCost">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-acq-cost">
                                        Acquisition Cost
                                    </Label>
                                    <Input
                                        id="h-acq-cost"
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
                </div>

                <div>
                    <h4 className="mb-3 text-sm font-medium">
                        Date of Death Valuation
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <formInstance.Field name="dodValue">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="h-dod-val">DOD Value</Label>
                                    <Input
                                        id="h-dod-val"
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
                                    <Label htmlFor="h-dod-date">
                                        DOD Value Date
                                    </Label>
                                    <Input
                                        id="h-dod-date"
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
                    <h4 className="mb-3 text-sm font-medium">
                        DOD Affidavit (Texas)
                    </h4>
                    <div className="grid grid-cols-3 items-end gap-3">
                        <formInstance.Field name="dodAffidavitFiled">
                            {(field) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="h-affidavit"
                                        checked={field.state.value}
                                        onCheckedChange={(checked) =>
                                            field.handleChange(!!checked)
                                        }
                                    />
                                    <Label htmlFor="h-affidavit">
                                        Affidavit Filed
                                    </Label>
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Subscribe<boolean>
                            selector={(state) => state.values.dodAffidavitFiled}
                        >
                            {(dodAffidavitFiled: boolean) => (
                                <>
                                    <formInstance.Field name="dodAffidavitDate">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="h-filing-date">
                                                    Filing Date
                                                </Label>
                                                <Input
                                                    id="h-filing-date"
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
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="h-clerk">
                                                    Clerk File Number
                                                </Label>
                                                <Input
                                                    id="h-clerk"
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
                            <Label htmlFor="h-notes">Notes</Label>
                            <Textarea
                                id="h-notes"
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
