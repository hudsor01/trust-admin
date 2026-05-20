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
import type {
    ResourceWizardProps,
    UseResourceFormReturn,
} from '@/hooks/use-resource-form'
import { INSURANCE_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import type { insurancePolicyFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'
import {
    enumToOptions,
    INSURANCE_POLICY_TYPE_VALUES,
    PREMIUM_FREQUENCY_VALUES,
} from '@/lib/type-utils'
import { POLICY_STATUS } from './InsuranceTable'

const POLICY_TYPE_OPTIONS = enumToOptions(INSURANCE_POLICY_TYPE_VALUES)
const FREQUENCY_OPTIONS = enumToOptions(PREMIUM_FREQUENCY_VALUES)

type InsuranceForm = ReturnType<typeof insurancePolicyFormDefaults>

interface InsuranceDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<InsuranceForm>['formInstance']
    wizard: ResourceWizardProps<InsuranceForm>
}

export function InsuranceDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    wizard,
}: InsuranceDialogProps) {
    const { currentStep } = wizard
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            submitLabel={isEditing ? 'Save' : 'Create'}
            steps={INSURANCE_WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={wizard.completedSteps}
            currentStepValid={wizard.getStepValidity(currentStep)}
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
                                formInstance={formInstance}
                                idPrefix="insurance"
                                namePlaceholder="e.g., State Farm Auto"
                            />
                        </div>

                        {/* Policy Information */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Policy Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <formInstance.Field name="policyType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="policyType">
                                                Policy Type *
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="policyType">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {POLICY_TYPE_OPTIONS.map(
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="carrier">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="carrier">
                                                Carrier *
                                            </Label>
                                            <Input
                                                id="carrier"
                                                placeholder="e.g., State Farm"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>
                            <div className="mt-4">
                                <formInstance.Field name="policyNumber">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="policyNumber">
                                                Policy Number *
                                            </Label>
                                            <Input
                                                id="policyNumber"
                                                placeholder="e.g., POL-123456"
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
                                                    <p className="text-sm text-destructive">
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

                {/* Step 2: Coverage */}
                <WizardStepGroup step={1} currentStep={currentStep}>
                    <div className="space-y-6">
                        {/* Coverage & Premium */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Coverage & Premium
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <formInstance.Field name="coverageAmount">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="coverageAmount">
                                                Coverage Amount
                                            </Label>
                                            <Input
                                                id="coverageAmount"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="premium">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="premium">
                                                Premium
                                            </Label>
                                            <Input
                                                id="premium"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="premiumFrequency">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="premiumFrequency">
                                                Frequency
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="premiumFrequency">
                                                    <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FREQUENCY_OPTIONS.map(
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
                                                    <p className="text-sm text-destructive">
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
                        {/* Dates */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Dates</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <formInstance.Field name="effectiveDate">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="effectiveDate">
                                                Effective Date
                                            </Label>
                                            <Input
                                                id="effectiveDate"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="expirationDate">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="expirationDate">
                                                Expiration Date
                                            </Label>
                                            <Input
                                                id="expirationDate"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Additional Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <formInstance.Field name="insuredAsset">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="insuredAsset">
                                                Insured Asset
                                            </Label>
                                            <Input
                                                id="insuredAsset"
                                                placeholder="e.g., 123 Main St"
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
                                                    <p className="text-sm text-destructive">
                                                        {getFieldError(field)}
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="beneficiaries">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="beneficiaries">
                                                Beneficiaries
                                            </Label>
                                            <Input
                                                id="beneficiaries"
                                                placeholder="e.g., Hudson Living Trust"
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
                                                    <p className="text-sm text-destructive">
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
                                                Policy Status *
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
                                                    {POLICY_STATUS.map(
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
                                                    <p className="text-sm text-destructive">
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
                                            <p className="text-sm text-destructive">
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
