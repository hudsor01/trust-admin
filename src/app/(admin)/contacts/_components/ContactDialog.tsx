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
import type { Contact } from '@/db/schema'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { getFieldError } from '@/lib/form-helpers'
import { ROLE_LABELS } from './ContactTable'

interface ContactDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<Contact>['formInstance']
}

export function ContactDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
}: ContactDialogProps) {
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Contact' : 'Add Contact'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
        >
            <div className="space-y-4">
                {/* Name */}
                <formInstance.Field name="name">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="Full name"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors &&
                                field.state.meta.errors.length > 0 && (
                                    <p className="text-sm text-destructive">
                                        {getFieldError(field)}
                                    </p>
                                )}
                        </div>
                    )}
                </formInstance.Field>

                {/* Company */}
                <formInstance.Field name="company">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input
                                id="company"
                                placeholder="Company name"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* Role */}
                <formInstance.Field name="role">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={field.state.value || ''}
                                onValueChange={(v) => field.handleChange(v)}
                            >
                                <SelectTrigger
                                    id="role"
                                    onBlur={field.handleBlur}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ROLE_LABELS).map(
                                        ([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </formInstance.Field>

                {/* Professional Fields (conditional on role) */}
                <formInstance.Subscribe selector={(state) => state.values.role}>
                    {(role) => {
                        if (role !== 'ATTORNEY' && role !== 'ACCOUNTANT')
                            return null
                        return (
                            <>
                                <formInstance.Field name="licenseNo">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="licenseNo">
                                                {role === 'ATTORNEY'
                                                    ? 'Bar Number'
                                                    : 'CPA License No.'}
                                            </Label>
                                            <Input
                                                id="licenseNo"
                                                placeholder={
                                                    role === 'ATTORNEY'
                                                        ? 'TX Bar #'
                                                        : 'CPA License #'
                                                }
                                                value={field.state.value || ''}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={field.handleBlur}
                                            />
                                        </div>
                                    )}
                                </formInstance.Field>
                                {role === 'ATTORNEY' && (
                                    <formInstance.Field name="barNo">
                                        {(field) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="barNo">
                                                    State Bar Number
                                                </Label>
                                                <Input
                                                    id="barNo"
                                                    placeholder="e.g., 24012345"
                                                    value={
                                                        field.state.value || ''
                                                    }
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={field.handleBlur}
                                                />
                                            </div>
                                        )}
                                    </formInstance.Field>
                                )}
                            </>
                        )
                    }}
                </formInstance.Subscribe>

                {/* Email */}
                <formInstance.Field name="email">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors &&
                                field.state.meta.errors.length > 0 && (
                                    <p className="text-sm text-destructive">
                                        {getFieldError(field)}
                                    </p>
                                )}
                        </div>
                    )}
                </formInstance.Field>

                {/* Phone */}
                <formInstance.Field name="phone">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                placeholder="(555) 123-4567"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors &&
                                field.state.meta.errors.length > 0 && (
                                    <p className="text-sm text-destructive">
                                        {getFieldError(field)}
                                    </p>
                                )}
                        </div>
                    )}
                </formInstance.Field>

                {/* Street Address */}
                <formInstance.Field name="streetAddress">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="streetAddress">
                                Street Address
                            </Label>
                            <Input
                                id="streetAddress"
                                placeholder="123 Main St"
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-3 gap-3">
                    <formInstance.Field name="city">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="City"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="state">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    placeholder="ST"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="zip">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP</Label>
                                <Input
                                    id="zip"
                                    placeholder="12345"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors &&
                                    field.state.meta.errors.length > 0 && (
                                        <p className="text-sm text-destructive">
                                            {getFieldError(field)}
                                        </p>
                                    )}
                            </div>
                        )}
                    </formInstance.Field>
                </div>

                {/* Notes */}
                <formInstance.Field name="notes">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes about this contact..."
                                value={field.state.value || ''}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        </div>
                    )}
                </formInstance.Field>
            </div>
        </ResourceDialog>
    )
}
