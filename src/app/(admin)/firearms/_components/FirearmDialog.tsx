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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { WizardStepGroup } from '@/components/wizard-step-group'
import type {
    ResourceWizardProps,
    UseResourceFormReturn,
} from '@/hooks/use-resource-form'
import { FIREARM_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import {
    ATF_FORM_TYPE_LABELS,
    CONDITION_LABELS,
    DOD_VALUE_TYPES,
    FIREARM_TYPE_LABELS,
    NFA_CLASS_LABELS,
    TRANSFER_STATUS,
} from '@/lib/constants'
import type { firearmFormDefaults } from '@/lib/form-factory'
import { getFieldError } from '@/lib/form-helpers'

type FirearmForm = ReturnType<typeof firearmFormDefaults>

interface FirearmDialogProps {
    isOpen: boolean
    isEditing: boolean
    isSubmitting: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: () => void
    formInstance: UseResourceFormReturn<FirearmForm>['formInstance']
    wizard: ResourceWizardProps<FirearmForm>
}

const ASSET_STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'TRANSFERRED', label: 'Transferred' },
    { value: 'DISPOSED', label: 'Disposed' },
]

export function FirearmDialog({
    isOpen,
    isEditing,
    isSubmitting,
    onOpenChange,
    onSubmit,
    formInstance,
    wizard,
}: FirearmDialogProps) {
    const { currentStep } = wizard
    return (
        <ResourceDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            title={isEditing ? 'Edit Firearm' : 'Add Firearm'}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            submitLabel={isEditing ? 'Save Changes' : 'Create Firearm'}
            steps={FIREARM_WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={wizard.completedSteps}
            currentStepValid={wizard.getStepValidity(currentStep)}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
            onStepClick={wizard.goToStep}
        >
            <div className="space-y-6">
                {/* Step 1: Identity */}
                <WizardStepGroup step={0} currentStep={currentStep}>
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Identity
                            </h4>
                            <NameDescriptionFields
                                formInstance={formInstance}
                                idPrefix="firearm"
                                namePlaceholder="e.g., Grandpa's Model 700"
                            />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium mb-3">
                                Firearm Information
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <formInstance.Field name="make">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="make">Make *</Label>
                                            <Input
                                                id="make"
                                                placeholder="e.g., Remington"
                                                value={field.state.value || ''}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={field.handleBlur}
                                            />
                                            {field.state.meta.errors?.length >
                                                0 && (
                                                <p className="text-sm text-destructive">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="model">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="model">
                                                Model *
                                            </Label>
                                            <Input
                                                id="model"
                                                placeholder="e.g., 700, M&P Shield"
                                                value={field.state.value || ''}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={field.handleBlur}
                                            />
                                            {field.state.meta.errors?.length >
                                                0 && (
                                                <p className="text-sm text-destructive">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="firearmType">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="firearmType">
                                                Type *
                                            </Label>
                                            <Select
                                                value={field.state.value || ''}
                                                onValueChange={
                                                    field.handleChange
                                                }
                                            >
                                                <SelectTrigger id="firearmType">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(
                                                        FIREARM_TYPE_LABELS,
                                                    ).map(([value, label]) => (
                                                        <SelectItem
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {field.state.meta.errors?.length >
                                                0 && (
                                                <p className="text-sm text-destructive">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <formInstance.Field name="serialNumber">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="serialNumber">
                                                Serial Number *
                                            </Label>
                                            <Input
                                                id="serialNumber"
                                                placeholder="Letters, numbers, hyphens"
                                                value={field.state.value || ''}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={field.handleBlur}
                                            />
                                            {field.state.meta.errors?.length >
                                                0 && (
                                                <p className="text-sm text-destructive">
                                                    {getFieldError(field)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </formInstance.Field>
                                <formInstance.Field name="caliber">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="caliber">
                                                Caliber
                                            </Label>
                                            <Input
                                                id="caliber"
                                                placeholder="e.g., 9mm, .308 Win"
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
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <formInstance.Field name="barrelLength">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="barrelLength">
                                                Barrel Length (inches)
                                            </Label>
                                            <Input
                                                id="barrelLength"
                                                type="number"
                                                step="0.01"
                                                placeholder="e.g., 16.5"
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
                                <formInstance.Field name="action">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="action">
                                                Action Type
                                            </Label>
                                            <Input
                                                id="action"
                                                placeholder="e.g., bolt-action, semi-auto"
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
                            </div>
                            <formInstance.Field name="isNfa">
                                {(field) => (
                                    <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="isNfa">
                                                NFA Item
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Check if this is a Title II /
                                                NFA firearm (suppressor, SBR,
                                                machine gun, AOW, etc.)
                                            </p>
                                        </div>
                                        <Switch
                                            id="isNfa"
                                            checked={Boolean(field.state.value)}
                                            onCheckedChange={field.handleChange}
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                            {/* NFA conditional section — formInstance.Subscribe on isNfa per ContactDialog pattern */}
                            <formInstance.Subscribe
                                selector={(state) => state.values.isNfa}
                            >
                                {(isNfa) =>
                                    !isNfa ? null : (
                                        <div className="space-y-4 mt-4 p-4 rounded-lg bg-muted/30 border">
                                            <h4 className="text-sm font-medium">
                                                NFA Classification
                                            </h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <formInstance.Field name="nfaClass">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="nfaClass">
                                                                NFA Class
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    field.state
                                                                        .value ||
                                                                    ''
                                                                }
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    field.handleChange(
                                                                        v,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger id="nfaClass">
                                                                    <SelectValue placeholder="Select class" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.entries(
                                                                        NFA_CLASS_LABELS,
                                                                    ).map(
                                                                        ([
                                                                            value,
                                                                            label,
                                                                        ]) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    value
                                                                                }
                                                                                value={
                                                                                    value
                                                                                }
                                                                            >
                                                                                {
                                                                                    label
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </formInstance.Field>
                                                <formInstance.Field name="atfFormType">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="atfFormType">
                                                                ATF Form Type
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    field.state
                                                                        .value ||
                                                                    ''
                                                                }
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    field.handleChange(
                                                                        v,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger id="atfFormType">
                                                                    <SelectValue placeholder="Select form" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.entries(
                                                                        ATF_FORM_TYPE_LABELS,
                                                                    ).map(
                                                                        ([
                                                                            value,
                                                                            label,
                                                                        ]) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    value
                                                                                }
                                                                                value={
                                                                                    value
                                                                                }
                                                                            >
                                                                                {
                                                                                    label
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </formInstance.Field>
                                                <formInstance.Field name="nfaRegistered">
                                                    {(field) => (
                                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                                            <Label htmlFor="nfaRegistered">
                                                                NFRTR Registered
                                                            </Label>
                                                            <Switch
                                                                id="nfaRegistered"
                                                                checked={Boolean(
                                                                    field.state
                                                                        .value,
                                                                )}
                                                                onCheckedChange={
                                                                    field.handleChange
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </formInstance.Field>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <formInstance.Field name="atfControlNumber">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="atfControlNumber">
                                                                ATF Control
                                                                Number
                                                            </Label>
                                                            <Input
                                                                id="atfControlNumber"
                                                                value={
                                                                    field.state
                                                                        .value ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                onBlur={
                                                                    field.handleBlur
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </formInstance.Field>
                                                <formInstance.Field name="taxStampDate">
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="taxStampDate">
                                                                Tax Stamp Date
                                                            </Label>
                                                            <Input
                                                                id="taxStampDate"
                                                                type="date"
                                                                value={
                                                                    field.state
                                                                        .value ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    field.handleChange(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                onBlur={
                                                                    field.handleBlur
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </formInstance.Field>
                                            </div>
                                            <formInstance.Field name="nfrtrSerial">
                                                {(field) => (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="nfrtrSerial">
                                                            NFRTR Serial Number
                                                        </Label>
                                                        <Input
                                                            id="nfrtrSerial"
                                                            placeholder="If different from serial number above"
                                                            value={
                                                                field.state
                                                                    .value || ''
                                                            }
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            onBlur={
                                                                field.handleBlur
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </formInstance.Field>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                NFA fields are for recordkeeping
                                                only. ATF approval is required
                                                before transferring NFA items to
                                                a beneficiary.
                                            </p>
                                        </div>
                                    )
                                }
                            </formInstance.Subscribe>
                        </div>
                    </div>
                </WizardStepGroup>

                {/* Step 2: Valuation */}
                <WizardStepGroup step={1} currentStep={currentStep}>
                    <div className="space-y-6">
                        <formInstance.Field name="condition">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="condition">
                                        NRA Condition Grade
                                    </Label>
                                    <Select
                                        value={field.state.value || 'GOOD'}
                                        onValueChange={field.handleChange}
                                    >
                                        <SelectTrigger id="condition">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(
                                                CONDITION_LABELS,
                                            ).map(([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </formInstance.Field>
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
                                            {field.state.meta.errors?.length >
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
                                                placeholder="$ — Blue Book / appraisal"
                                                value={field.state.value || ''}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={field.handleBlur}
                                            />
                                            {field.state.meta.errors?.length >
                                                0 && (
                                                <p className="text-sm text-destructive">
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
                        <div className="grid grid-cols-3 gap-4">
                            <formInstance.Field name="status">
                                {(field) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status *</Label>
                                        <Select
                                            value={field.state.value || ''}
                                            onValueChange={field.handleChange}
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSET_STATUS_OPTIONS.map(
                                                    (opt) => (
                                                        <SelectItem
                                                            key={opt.value}
                                                            value={opt.value}
                                                        >
                                                            {opt.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
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
                                                <SelectValue />
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
                                    </div>
                                )}
                            </formInstance.Field>
                            <formInstance.Field name="insured">
                                {(field) => (
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <Label htmlFor="insured">Insured</Label>
                                        <Switch
                                            id="insured"
                                            checked={Boolean(field.state.value)}
                                            onCheckedChange={field.handleChange}
                                        />
                                    </div>
                                )}
                            </formInstance.Field>
                        </div>
                        <formInstance.Field name="location">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="location">
                                        Storage Location
                                    </Label>
                                    <Input
                                        id="location"
                                        placeholder="Safe, bank vault, FFL storage..."
                                        value={field.state.value || ''}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                </div>
                            )}
                        </formInstance.Field>
                        <formInstance.Field name="notes">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        rows={3}
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
                </WizardStepGroup>
            </div>
        </ResourceDialog>
    )
}
