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
import { INVESTMENT_ACCOUNT_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import { TRANSFER_STATUS } from '@/lib/constants'
import {
    ACCOUNT_STATUS,
    INVESTMENT_ACCOUNT_TYPES,
    type InvestmentFormData,
} from './constants'

interface InvestmentAccountDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<InvestmentFormData>['formInstance']
    wizard: ResourceWizardProps<InvestmentFormData>
}

export function InvestmentAccountDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    wizard,
}: InvestmentAccountDialogProps) {
    const { currentStep } = wizard
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={
                isEditing ? 'Edit Investment Account' : 'Add Investment Account'
            }
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            submitLabel={isEditing ? 'Save' : 'Create'}
            steps={INVESTMENT_ACCOUNT_WIZARD_STEPS}
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
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Identity
                            </h4>
                            <NameDescriptionFields
                                formInstance={formInstance}
                                idPrefix="investment"
                                namePlaceholder="e.g., Vanguard Brokerage"
                            />
                        </div>

                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Account Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Institution */}
                                <formInstance.Field name="institution">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-institution">
                                                Institution *
                                            </Label>
                                            <Input
                                                id="inv-institution"
                                                placeholder="e.g., Fidelity, Schwab"
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

                                {/* Account Type */}
                                <formInstance.Field name="accountType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-type">
                                                Account Type *
                                            </Label>
                                            <Select
                                                value={field.state.value}
                                                onValueChange={(v) =>
                                                    field.handleChange(v)
                                                }
                                            >
                                                <SelectTrigger id="inv-type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {INVESTMENT_ACCOUNT_TYPES.map(
                                                        (t) => (
                                                            <SelectItem
                                                                key={t.value}
                                                                value={t.value}
                                                            >
                                                                {t.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                {/* Account Name */}
                                <formInstance.Field name="accountName">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-name">
                                                Account Name
                                            </Label>
                                            <Input
                                                id="inv-name"
                                                placeholder="e.g., Rollover IRA"
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

                                {/* Account Number */}
                                <formInstance.Field name="accountNumber">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-number">
                                                Account Number *
                                            </Label>
                                            <Input
                                                id="inv-number"
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
                </WizardStepGroup>

                {/* Step 2: Valuation */}
                <WizardStepGroup step={1} currentStep={currentStep}>
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Date of Death Valuation
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                {/* DOD Value */}
                                <formInstance.Field name="dodValue">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-dod-value">
                                                DOD Value
                                            </Label>
                                            <Input
                                                id="inv-dod-value"
                                                placeholder="$"
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

                                {/* DOD Value Date */}
                                <formInstance.Field name="dodValueDate">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-dod-date">
                                                DOD Value Date
                                            </Label>
                                            <Input
                                                id="inv-dod-date"
                                                type="date"
                                                value={field.state.value || ''}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value || null,
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                </formInstance.Field>

                                {/* Cost Basis */}
                                <formInstance.Field name="costBasis">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-cost-basis">
                                                Cost Basis
                                            </Label>
                                            <Input
                                                id="inv-cost-basis"
                                                placeholder="$ (for step-up)"
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
                </WizardStepGroup>

                {/* Step 3: Ownership */}
                <WizardStepGroup step={2} currentStep={currentStep}>
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-medium mb-3">Status</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Account Status */}
                                <formInstance.Field name="status">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-status">
                                                Account Status *
                                            </Label>
                                            <Select
                                                value={field.state.value}
                                                onValueChange={(v) =>
                                                    field.handleChange(v)
                                                }
                                            >
                                                <SelectTrigger id="inv-status">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ACCOUNT_STATUS.map((s) => (
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

                                {/* Transfer Status */}
                                <formInstance.Field name="transferStatus">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="inv-transfer">
                                                Transfer Status *
                                            </Label>
                                            <Select
                                                value={field.state.value}
                                                onValueChange={(v) =>
                                                    field.handleChange(v)
                                                }
                                            >
                                                <SelectTrigger id="inv-transfer">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TRANSFER_STATUS.map(
                                                        (s) => (
                                                            <SelectItem
                                                                key={s.value}
                                                                value={s.value}
                                                            >
                                                                {s.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>
                        </div>

                        {/* Notes */}
                        <formInstance.Field name="notes">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="inv-notes">Notes</Label>
                                    <Textarea
                                        id="inv-notes"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        rows={3}
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                    </div>
                </WizardStepGroup>
            </div>
        </ResourceDialog>
    )
}
