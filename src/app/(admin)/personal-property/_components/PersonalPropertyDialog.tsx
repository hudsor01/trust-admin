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
import { WizardStepGroup } from '@/components/wizard-step-group'
import type { UseResourceFormReturn } from '@/hooks/use-resource-form'
import { PERSONAL_PROPERTY_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import { DOD_VALUE_TYPES, TRANSFER_STATUS } from '@/lib/constants'
import type { personalPropertyFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'
import type { PersonalPropertyMode } from './PersonalPropertyClient'
import { ASSET_STATUS, CATEGORY_OPTIONS } from './PersonalPropertyTable'

type PersonalPropertyForm = ReturnType<typeof personalPropertyFormDefaults>

interface PersonalPropertyDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<PersonalPropertyForm>['formInstance']
    wizard: Pick<
        UseResourceFormReturn<PersonalPropertyForm>,
        | 'currentStep'
        | 'completedSteps'
        | 'isStepValid'
        | 'goNext'
        | 'goPrev'
        | 'goToStep'
    >
    mode?: PersonalPropertyMode
    categoryOptions?: { value: string; label: string }[]
}

export function PersonalPropertyDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    wizard,
    mode = 'personal-property',
    categoryOptions = CATEGORY_OPTIONS,
}: PersonalPropertyDialogProps) {
    const noun = mode === 'artwork' ? 'Artwork' : 'Personal Property'
    const { currentStep } = wizard
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? `Edit ${noun}` : `Add ${noun}`}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            submitLabel={isEditing ? 'Save' : 'Create'}
            steps={PERSONAL_PROPERTY_WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={wizard.completedSteps}
            isStepValid={wizard.isStepValid(currentStep)}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
            onStepClick={wizard.goToStep}
        >
            <div className="space-y-6">
                {/* Step 1: Type + Name */}
                <WizardStepGroup step={0} currentStep={currentStep}>
                    <div className="space-y-6">
                        {/* Identity */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Identity
                            </h4>
                            <NameDescriptionFields
                                Field={
                                    formInstance.Field as unknown as Parameters<
                                        typeof NameDescriptionFields
                                    >[0]['Field']
                                }
                                idPrefix="personal-property"
                                namePlaceholder="e.g., Diamond Ring, Rolex Watch"
                                descriptionPlaceholder="Brief description of the item"
                            />
                            <div className="mt-4">
                                <formInstance.Field name="category">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="category">
                                                Category *
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="category">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categoryOptions.map(
                                                        (opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={
                                                                    opt.value
                                                                }
                                                            >
                                                                {opt.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
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
                                </formInstance.Field>
                            </div>
                            <div className="mt-4">
                                <formInstance.Field name="location">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="location">
                                                Location
                                            </Label>
                                            <Input
                                                id="location"
                                                placeholder="e.g., Safe deposit box, Home safe"
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
                                </formInstance.Field>
                            </div>
                        </div>
                    </div>
                </WizardStepGroup>

                {/* Step 2: Valuation */}
                <WizardStepGroup step={1} currentStep={currentStep}>
                    <div className="space-y-6">
                        {/* Acquisition */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Acquisition
                            </h4>
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
                                            <Label htmlFor="dodValue">
                                                DOD Value
                                            </Label>
                                            <Input
                                                id="dodValue"
                                                placeholder="$ (appraised)"
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
                                </formInstance.Field>
                                <formInstance.Field name="dodValueType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="dodValueType">
                                                Valuation Type
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="dodValueType">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DOD_VALUE_TYPES.map(
                                                        (opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={
                                                                    opt.value
                                                                }
                                                            >
                                                                {opt.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
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
                                </formInstance.Field>
                            </div>
                        </div>
                    </div>
                </WizardStepGroup>

                {/* Step 3: Ownership */}
                <WizardStepGroup step={2} currentStep={currentStep}>
                    <div className="space-y-6">
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
                                                onValueChange={
                                                    field.handleChange
                                                }
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
                                </formInstance.Field>
                                <formInstance.Field name="transferStatus">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="transferStatus">
                                                Transfer Status *
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="transferStatus">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TRANSFER_STATUS.map(
                                                        (opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={
                                                                    opt.value
                                                                }
                                                            >
                                                                {opt.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
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
                </WizardStepGroup>
            </div>
        </ResourceDialog>
    )
}
