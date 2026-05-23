---
phase: 30
slug: firearms-admin-page
artifact: PATTERNS.md
mapped: 2026-05-21
---

# Phase 30: Firearms Admin Page — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 10 (7 new components + 3 modified lib files)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(admin)/firearms/page.tsx` | route (Server Component) | request-response | `src/app/(admin)/vehicles/page.tsx` | exact |
| `src/app/(admin)/firearms/loading.tsx` | route (skeleton) | — | `src/app/(admin)/vehicles/loading.tsx` | exact |
| `src/app/(admin)/firearms/error.tsx` | route (error boundary) | — | `src/app/(admin)/vehicles/error.tsx` | exact |
| `src/app/(admin)/firearms/_components/FirearmsClient.tsx` | component (orchestrator) | CRUD | `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` | exact |
| `src/app/(admin)/firearms/_components/FirearmTable.tsx` | component (data table) | CRUD | `src/app/(admin)/vehicles/_components/VehicleTable.tsx` | exact |
| `src/app/(admin)/firearms/_components/FirearmDialog.tsx` | component (wizard dialog) | CRUD | `src/app/(admin)/vehicles/_components/VehicleDialog.tsx` | exact |
| `src/app/(admin)/firearms/_components/FirearmRowDetail.tsx` | component (row-expand detail) | request-response | `src/app/(admin)/accounts/_components/AccountsClient.tsx` (getRowDetail inline) | role-match |
| `src/app/(admin)/firearms/_components/NfaStatusDialog.tsx` | component (state-transition dialog) | event-driven | `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` (inline Dialog) | role-match |
| `src/lib/asset-wizard-steps.ts` | utility (config) | — | same file (extend existing `VEHICLE_WIZARD_STEPS` shape) | exact |
| `src/lib/constants.ts` | utility (constants) | — | same file (extend existing `STATUS_VARIANTS`) | exact |
| `src/lib/form-factory.ts` | utility (factory) | — | same file (extend with `firearmFormDefaults`) | exact |

---

## Pattern Assignments

### `src/app/(admin)/firearms/page.tsx` (Server Component, request-response)

**Analog:** `src/app/(admin)/vehicles/page.tsx` (lines 1–16)

**Full file to copy verbatim — change only the import and query names:**

```typescript
// src/app/(admin)/vehicles/page.tsx — lines 1-16
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCHelpers } from '@/lib/trpc-server'
import { VehiclesClient } from './_components/VehiclesClient'

export default async function VehiclesPage() {
    const helpers = await createTRPCHelpers()
    await Promise.all([
        helpers.vehicle.list.prefetch({ entityId: 1 }),
        helpers.entity.list.prefetch(),
    ])
    return (
        <HydrationBoundary state={dehydrate(helpers.queryClient)}>
            <VehiclesClient />
        </HydrationBoundary>
    )
}
```

**Firearm substitution:** replace `vehicle.list` → `firearm.list`, `VehiclesClient` → `FirearmsClient`.

---

### `src/app/(admin)/firearms/loading.tsx` (Skeleton)

**Analog:** `src/app/(admin)/vehicles/loading.tsx` (lines 1–18)

**Copy verbatim — update grid from 3 to 4 columns to match 4-card KPI strip:**

```typescript
// src/app/(admin)/vehicles/loading.tsx — lines 1-18 (note: update md:grid-cols-3 → md:grid-cols-4)
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">  {/* 4 KPI cards */}
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
            </div>
            <Skeleton className="h-80 w-full rounded-lg" />
        </div>
    )
}
```

---

### `src/app/(admin)/firearms/error.tsx` (ErrorBoundary)

**Analog:** `src/app/(admin)/vehicles/error.tsx` (lines 1–49)

**Copy verbatim — no substitutions needed.** The component is generic and named `AdminError`.

```typescript
// src/app/(admin)/vehicles/error.tsx — lines 1-49
'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])
    // ... Card layout with AlertTriangle + "Try again" Button
}
```

---

### `src/app/(admin)/firearms/_components/FirearmsClient.tsx` (orchestrator, CRUD)

**Analog:** `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` (lines 1–236)

**Imports pattern** (lines 1–26):
```typescript
'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import type { Vehicle } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { VEHICLE_WIZARD_STEPS } from '@/lib/asset-wizard-steps'
import { toDateInput, vehicleFormDefaults } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
```

**Entity + query pattern** (lines 29–38):
```typescript
const utils = trpc.useUtils()
const { data: entities } = trpc.entity.list.useQuery()
const entityId = entities?.[0]?.id

const { data: vehicles = [], isLoading: vehiclesLoading } =
    trpc.vehicle.list.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )
```

**Mutation wiring pattern** (lines 40–48):
```typescript
const createVehicleMutation = trpc.vehicle.create.useMutation({
    onSuccess: () => utils.vehicle.list.invalidate(),
})
const updateVehicleMutation = trpc.vehicle.update.useMutation({
    onSuccess: () => utils.vehicle.list.invalidate(),
})
const deleteVehicleMutation = trpc.vehicle.delete.useMutation({
    onSuccess: () => utils.vehicle.list.invalidate(),
})
```

**CONFLICT error handling in onSubmit** — vehicles does NOT handle CONFLICT (no unique VIN constraint in the UI layer). Firearm must add this block in the `onSubmit` catch, copying the pattern from HemsQueueClient's try/catch (lines 305–319):
```typescript
// In useResourceForm onSubmit:
try {
    await createFirearmMutation.mutateAsync(payload)
} catch (err) {
    if (err instanceof TRPCClientError && err.data?.code === 'CONFLICT') {
        toast.error('A firearm with this serial number already exists.')
        return // do NOT close the dialog
    }
    throw err
}
```

**Sequential bulk delete pattern** (lines 158–183) — copy verbatim, substitute `vehicle` → `firearm`:
```typescript
const onBulkDelete = useCallback(
    async (rows: Vehicle[]) => {
        let failed = 0
        for (const row of rows) {
            try {
                await deleteVehicleMutation.mutateAsync({
                    id: row.id,
                    entityId: entityId!,
                })
            } catch (err) {
                failed++
                log.error('Bulk delete failed', { id: row.id, error: err })
            }
        }
        if (failed > 0) {
            toast.error(`Failed to delete ${failed} of ${rows.length} vehicles`)
        } else {
            toast.success(`Deleted ${rows.length} vehicles`)
        }
    },
    [deleteVehicleMutation, entityId],
)
```

**KPI strip derivation pattern** (lines 185–197):
```typescript
const totalValue = sumStrings(vehicles.map((v) => v.dodValue))
// ... other derivations
const kpiData: KpiStripItem[] = [
    { label: 'Vehicle count', value: vehicles.length },
    { label: 'Total DOD value', value: formatCurrency(totalValue) },
    { label: 'Transfer % complete', value: formatPercent(transferPct) },
    { label: 'Active count', value: activeCount },
]
```

**Page layout JSX** (lines 199–235) — copy verbatim with label/prop substitutions:
```tsx
return (
    <div className="space-y-6">
        <PageHeader
            title="Firearms"
            description="Firearms held by the trust."
            actions={
                <Button onClick={vehicleForm.handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Firearm
                </Button>
            }
        />
        <KpiStrip data={kpiData} isLoading={firearmsLoading} />
        <FirearmTable ... />
        <FirearmDialog ... />
        <ConfirmDialog {...deleteDialogProps} />
    </div>
)
```

---

### `src/app/(admin)/firearms/_components/FirearmTable.tsx` (DataTable, CRUD)

**Analog:** `src/app/(admin)/vehicles/_components/VehicleTable.tsx` (lines 1–248)

**Imports pattern** (lines 1–24):
```typescript
'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { BulkAction } from '@/components/ui/data-table-bulk-actions'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { selectColumn } from '@/components/ui/data-table-select-column'
import type { Vehicle } from '@/db/schema'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
```

**Tooltip-wrapped action buttons** — source: `src/app/(admin)/trustees/_components/TrusteeTable.tsx` lines 232–275:
```typescript
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

// In the actions column cell:
<div className="flex items-center gap-1">
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(row.original)}
                    aria-label="Edit firearm"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Edit firearm</p></TooltipContent>
        </Tooltip>
    </TooltipProvider>
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(row.original)}
                    aria-label="Delete firearm"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Delete firearm</p></TooltipContent>
        </Tooltip>
    </TooltipProvider>
</div>
```

**`meta: { excludeFromExport: true }` on actions and select columns** — source: `src/app/(admin)/accounting/_components/AccountingTable.tsx` line 217 and `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` line 278:
```typescript
{
    id: 'actions',
    header: '',
    meta: { excludeFromExport: true },
    cell: ...
}
// selectColumn already sets this internally via DataTable primitive
```

**`initialColumnVisibility` for hidden columns** — source: `src/app/(admin)/beneficiaries/_components/BeneficiaryTable.tsx` lines 299–304:
```typescript
<DataTable
    initialColumnVisibility={{
        description: false,
        barrelLength: false,
        action: false,
        isNfa: false,
        nfaClass: false,
        atfFormType: false,
        atfControlNumber: false,
        taxStampDate: false,
        nfrtrSerial: false,
        nfaRegistered: false,
        nfaTransferStatus: false,
        acquisitionDate: false,
        acquisitionCost: false,
        dodValueDate: false,
        dodValueType: false,
        location: false,
        insured: false,
        status: false,
        notes: false,
        createdAt: false,
        updatedAt: false,
    }}
/>
```

**NFA milestone pill in typeClassification cell** — source: `src/app/(admin)/hems/_components/HistoryTable.tsx` lines 88–101 (milestone class pattern) + UI-SPEC §Type + Classification Cell:
```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// typeClassification column cell:
cell: ({ row }) => (
    <div className="flex items-center gap-2">
        <span>{FIREARM_TYPE_LABELS[row.original.firearmType]}</span>
        {row.original.isNfa && (
            <Badge className="text-milestone-foreground bg-milestone/15 border-milestone/30 text-[10px] px-1 py-0 font-medium">
                NFA
            </Badge>
        )}
    </div>
)
```

**Combined make/model cell** (maps to `firearmIdentity` column):
```tsx
cell: ({ row }) => (
    <div>
        <p>{row.original.make} {row.original.model}</p>
        <p className="text-xs text-muted-foreground">{row.original.caliber}</p>
    </div>
)
```

**Serial number cell** — mirrors VIN code cell from VehicleTable lines 117–120:
```tsx
cell: ({ row }) => (
    <div className="truncate" title={row.original.serialNumber}>
        <code className="text-xs">{row.original.serialNumber}</code>
    </div>
)
```

**DataTable props** — copy from VehicleTable lines 232–246 with firearm substitutions:
```tsx
<DataTable
    tableId="firearms"
    columns={columns}
    data={firearms}
    searchKey="name"
    searchPlaceholder="Search firearms..."
    isLoading={isLoading}
    emptyMessage="No firearms recorded. Click Add Firearm to create one."
    enablePagination={true}
    enableRowSelection
    bulkActions={bulkActions}
    exportable
    exportResource="firearms"
    getRowDetail={(row) => <FirearmRowDetail firearm={row} onSetNfaStatus={...} />}
    initialColumnVisibility={{ ... }}
/>
```

---

### `src/app/(admin)/firearms/_components/FirearmDialog.tsx` (wizard dialog, CRUD)

**Analog:** `src/app/(admin)/vehicles/_components/VehicleDialog.tsx` (lines 1–631)

**Imports pattern** (lines 1–24):
```typescript
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
import { DOD_VALUE_TYPES, TRANSFER_STATUS } from '@/lib/constants'
import { getFieldError } from '@/lib/form-helpers'
```

**ResourceDialog + WizardStepGroup shell** — copy from VehicleDialog lines 49–63 verbatim, substituting VEHICLE → FIREARM and vehicle → firearm copy:
```tsx
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
```

**WizardStepGroup per step** — copy from VehicleDialog lines 66–344 structure; `<WizardStepGroup step={0} currentStep={currentStep}>` wraps each step.

**Switch/boolean field pattern (for `isNfa` toggle and `nfaRegistered`)** — source: `src/app/(admin)/personal-property/_components/PersonalPropertyDialog.tsx` lines 418–440:
```tsx
<formInstance.Field name="isNfa">
    {(field) => (
        <div className="mt-4 flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
                <Label htmlFor="isNfa">NFA Item</Label>
                <p className="text-xs text-muted-foreground">
                    Check if this is a Title II / NFA firearm
                </p>
            </div>
            <Switch
                id="isNfa"
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
            />
        </div>
    )}
</formInstance.Field>
```

**NFA conditional section using `formInstance.Subscribe`** — source: `src/app/(admin)/contacts/_components/ContactDialog.tsx` lines 120–179. This is the cleanest null-return pattern for conditional rendering:
```tsx
<formInstance.Subscribe selector={(state) => state.values.isNfa}>
    {(isNfa) => {
        if (!isNfa) return null
        return (
            <div className="space-y-4 mt-4">
                <h4 className="text-sm font-medium">NFA Classification</h4>
                {/* nfaClass Select, atfFormType Select, nfaRegistered Switch */}
                {/* atfControlNumber Input, taxStampDate Input */}
                {/* nfrtrSerial Input (full-width) */}
                <p className="text-xs text-muted-foreground mt-2">
                    NFA fields are for recordkeeping only. ATF approval is required before transferring NFA items to a beneficiary.
                </p>
            </div>
        )
    }}
</formInstance.Subscribe>
```

Note: `formInstance.Subscribe<boolean>` (typed) for a boolean field — matches the `<string>` typed usage in `src/app/(admin)/liabilities/_components/LiabilityDialog.tsx` line 153, just with `boolean` instead of `string`.

**Conditional animated reveal alternative** — for the NFA section the ContactDialog `null-return` pattern is preferred (cleaner). The LiabilityDialog `opacity-0/max-h-0` CSS animation pattern (lines 163–168) is available if the UI-SPEC requests animation, but the spec does not.

---

### `src/app/(admin)/firearms/_components/FirearmRowDetail.tsx` (row-expand panel, request-response)

**Analog:** `src/app/(admin)/accounts/_components/AccountsClient.tsx` (lines 348–387, inline `getRowDetail` callback)

**Row detail container pattern** (AccountsClient lines 349–380):
```tsx
<div className="space-y-1">
    <p className="text-sm font-semibold">Account detail</p>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Routing number</dt>
        <dd className="font-mono">{account.routingNumber ?? '—'}</dd>
        <dt className="text-muted-foreground">DOD date</dt>
        <dd>{...}</dd>
    </dl>
</div>
```

**Firearm row-detail container** (adapts to 3-section grid layout per UI-SPEC §Row-Detail Panel):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-md border border-border">
    {/* Section 1: Physical Details */}
    {/* Section 2: NFA Classification (conditional on isNfa) */}
    {/* Section 3: Related Records */}
</div>
```

**Warning alert for `nfaRegistered === false`** — source: `src/app/(admin)/liabilities/_components/PaymentImpactPreview.tsx` lines 95–100:
```tsx
{!firearm.nfaRegistered && (
    <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
        This NFA item is not registered in the NFRTR. Unregistered NFA items
        are contraband. Do not attempt to transfer. Consult an attorney immediately.
    </div>
)}
```

**`byId` query inside row-detail** — FirearmRowDetail takes the list-row `firearm` as a prop, fires `trpc.firearm.byId.useQuery` on mount to get valuations+documents:
```typescript
const { data: detail } = trpc.firearm.byId.useQuery(
    { id: firearm.id, entityId: firearm.entityId },
    { enabled: true },
)
```

**nfaTransferStatus badge with status-variant colors** — source: badge pattern from `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` lines 265–273:
```tsx
<Badge variant={STATUS_VARIANTS[firearm.nfaTransferStatus] || 'secondary'}>
    {NFA_TRANSFER_STATUS_LABELS[firearm.nfaTransferStatus]}
</Badge>
```

**NFA section milestone pill header** — matches the `bg-milestone text-milestone-foreground` pattern from `src/app/(admin)/hems/_components/HistoryTable.tsx` line 94:
```tsx
<div className="flex items-center gap-2">
    <h4 className="text-sm font-medium">NFA Classification</h4>
    <Badge className="text-milestone-foreground bg-milestone/15 border-milestone/30 text-[10px] px-1 py-0 font-medium">
        NFA
    </Badge>
</div>
```

---

### `src/app/(admin)/firearms/_components/NfaStatusDialog.tsx` (state-transition dialog, event-driven)

**Analog:** `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` (inline Dialog at lines 426–694)

**Closest pattern: bare shadcn Dialog (not ResourceDialog)** — the HEMS review dialog uses `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter` directly, which matches NfaStatusDialog's small/focused shape.

**Imports pattern:**
```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
```

**Dialog open/close state pattern** (HemsQueueClient lines 126–137):
```typescript
const [open, setOpen] = useState(false)
const [status, setStatus] = useState<string>('NOT_FILED')
const [taxStampDate, setTaxStampDate] = useState('')
const [atfControlNumber, setAtfControlNumber] = useState('')
const [submitting, setSubmitting] = useState(false)
```

**Mutation + error handling pattern** (HemsQueueClient lines 102–118):
```typescript
const setNfaStatusMutation = trpc.firearm.setNfaTransferStatus.useMutation({
    onSuccess: () => {
        utils.firearm.list.invalidate()
        toast.success('NFA transfer status updated.')
        setOpen(false)
    },
    onError: (err) => {
        toast.error(err.message)
    },
})
```

**Conditional fields in dialog body** — show `taxStampDate` when `status === 'APPROVED'`, show `atfControlNumber` when `status === 'FILED' || status === 'APPROVED'`. Pattern: local state conditional, no `formInstance.Subscribe` needed (this dialog is uncontrolled local state, not a TanStack Form):
```tsx
{(status === 'FILED' || status === 'APPROVED') && (
    <div className="space-y-2">
        <Label htmlFor="atfControlNumber">ATF Control Number</Label>
        <Input
            id="atfControlNumber"
            value={atfControlNumber}
            onChange={(e) => setAtfControlNumber(e.target.value)}
        />
    </div>
)}
{status === 'APPROVED' && (
    <div className="space-y-2">
        <Label htmlFor="taxStampDate">Tax Stamp Date</Label>
        <Input
            id="taxStampDate"
            type="date"
            value={taxStampDate}
            onChange={(e) => setTaxStampDate(e.target.value)}
        />
    </div>
)}
<p className="text-xs text-muted-foreground">
    This app does not file ATF forms. Record the status after filing through your FFL or attorney.
</p>
```

**Submit button with loading state** (HemsQueueClient lines 656–666):
```tsx
<Button onClick={handleSubmit} disabled={submitting}>
    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
    Save Status
</Button>
```

**Trigger button in FirearmRowDetail** (outline, size sm — per UI-SPEC §"File Form 5" Button):
```tsx
<Button variant="outline" size="sm" onClick={() => setNfaDialogOpen(true)}>
    Update Form 5 Status
</Button>
```

---

### `src/lib/asset-wizard-steps.ts` — Add `FIREARM_WIZARD_STEPS` export

**Analog:** `VEHICLE_WIZARD_STEPS` in same file (lines 67–115) + `PERSONAL_PROPERTY_WIZARD_STEPS` (lines 284–319)

**WizardStep shape** (lines 67–115):
```typescript
export const VEHICLE_WIZARD_STEPS: WizardStep<VehicleForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: ['name', 'description', 'year', 'make', ...],
        schema: z.object({
            name: nonEmpty,
            make: nonEmpty,
            model: nonEmpty,
            vin: requiredVin,
            titleStatus: nonEmpty,
        }),
    },
    { id: 'valuation', label: 'Valuation', fields: [...], schema: z.object({ ... }) },
    { id: 'ownership', label: 'Ownership', fields: [...], schema: z.object({ ... }) },
]
```

**`nonEmpty` and `optionalMoney` helpers** are already defined at lines 44–58 — reference them, do not re-declare.

**New import to add at top of file:**
```typescript
import type { firearmFormDefaults } from '@/lib/form-factory'
type FirearmForm = ReturnType<typeof firearmFormDefaults>
```

**FIREARM_WIZARD_STEPS shape** (per UI-SPEC §FirearmDialog):
```typescript
export const FIREARM_WIZARD_STEPS: WizardStep<FirearmForm>[] = [
    {
        id: 'identity',
        label: 'Identity',
        fields: [
            'name', 'description', 'make', 'model', 'firearmType',
            'serialNumber', 'caliber', 'barrelLength', 'action',
            'isNfa', 'nfaClass', 'atfFormType', 'nfaRegistered',
            'atfControlNumber', 'taxStampDate', 'nfrtrSerial',
        ],
        schema: z.object({
            name: nonEmpty,
            make: nonEmpty,
            model: nonEmpty,
            serialNumber: nonEmpty,
            firearmType: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['condition', 'acquisitionDate', 'acquisitionCost', 'dodValue', 'dodValueDate', 'dodValueType'],
        schema: z.object({
            acquisitionCost: optionalMoney,
            dodValue: optionalMoney,
        }),
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'insured', 'location', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]
```

---

### `src/lib/constants.ts` — Add NFA and condition variants to `STATUS_VARIANTS`

**Analog:** same file lines 17–49 (existing `STATUS_VARIANTS` record)

**Additions to merge into `STATUS_VARIANTS`:**
```typescript
// NFA transfer status (matches UI-SPEC badge variant table)
NOT_FILED: 'secondary',
FILED: 'outline',
// APPROVED is already mapped to 'default' — no change needed

// NFA condition grades
POOR: 'destructive',
FAIR: 'outline',
GOOD: 'secondary',
VERY_GOOD: 'outline',
EXCELLENT: 'default',
NEW: 'default',
```

Note: `APPROVED` is not currently in `STATUS_VARIANTS`. Add it:
```typescript
APPROVED: 'default',
```

---

### `src/lib/form-factory.ts` — Add `firearmFormDefaults`

**Analog:** `vehicleFormDefaults` in same file (lines 61–80); `personalPropertyFormDefaults` (lines 152–166) for the `insured: false` boolean default.

**Pattern to follow:**
```typescript
export const firearmFormDefaults = createFormDefaults({
    name: '',
    description: '',
    make: '',
    model: '',
    firearmType: 'PISTOL',         // string default matching first enum value
    serialNumber: '',
    caliber: '',
    barrelLength: null as string | null,
    action: '',
    isNfa: false,                  // boolean — matches personalPropertyFormDefaults insured: false
    nfaClass: null as string | null,
    atfFormType: null as string | null,
    nfaRegistered: null as boolean | null,
    atfControlNumber: '',
    taxStampDate: null as string | null,
    nfrtrSerial: '',
    condition: 'GOOD',
    acquisitionDate: null as string | null,
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: null as string | null,
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    insured: false,
    location: '',
    notes: '',
})
```

---

## Shared Patterns

### Entity-Scoped Query Gating
**Source:** `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` lines 34–38
**Apply to:** `FirearmsClient.tsx`
```typescript
const { data: firearms = [], isLoading: firearmsLoading } =
    trpc.firearm.list.useQuery(
        { entityId: entityId! },
        { enabled: !!entityId },
    )
```

### Inline Edit → `onInlineUpdate` Pattern
**Source:** `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` lines 143–156
**Apply to:** `FirearmsClient.tsx`, `FirearmTable.tsx`
```typescript
const handleInlineUpdate = useCallback(
    async (id: number, updates: Partial<Firearm>) => {
        try {
            await updateFirearmMutation.mutateAsync({ id, entityId: entityId!, data: updates })
        } catch (err) {
            log.error('Failed to update firearm', { error: err })
        }
    },
    [updateFirearmMutation, entityId],
)
```

### Warning Alert Block
**Source:** `src/app/(admin)/liabilities/_components/PaymentImpactPreview.tsx` lines 95–100
**Apply to:** `FirearmRowDetail.tsx` NFA unregistered alert
```tsx
<div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
    {alert text}
</div>
```

### Milestone Badge
**Source:** `src/app/(admin)/hems/_components/HistoryTable.tsx` lines 88–101
**Apply to:** `FirearmTable.tsx` typeClassification cell, `FirearmRowDetail.tsx` NFA section header
```tsx
<Badge className="bg-milestone text-milestone-foreground">...</Badge>
// Fine-grained variant per UI-SPEC:
<Badge className="text-milestone-foreground bg-milestone/15 border-milestone/30 text-[10px] px-1 py-0 font-medium">NFA</Badge>
```

### `formInstance.Subscribe` Conditional Section
**Source:** `src/app/(admin)/contacts/_components/ContactDialog.tsx` lines 120–179
**Apply to:** `FirearmDialog.tsx` NFA conditional section in Step 1
```tsx
<formInstance.Subscribe selector={(state) => state.values.isNfa}>
    {(isNfa) => {
        if (!isNfa) return null
        return ( /* NFA fields */ )
    }}
</formInstance.Subscribe>
```

### logger.create Scoping
**Source:** `src/app/(admin)/vehicles/_components/VehiclesClient.tsx` line 27
**Apply to:** `FirearmsClient.tsx`
```typescript
import { logger } from '@/lib/logger'
const log = logger.create('Firearms')
```

---

## No Analog Found

No files are in this category. All 10 files have clear analogs. The NfaStatusDialog has a role-match analog (HemsQueueClient inline Dialog) even though it is being extracted as a standalone component — the extraction pattern itself mirrors how other small dialogs are colocated under `_components/`.

---

## Metadata

**Analog search scope:** `src/app/(admin)/`, `src/lib/`, `src/components/`
**Files scanned:** 18 source files read directly; 14 additional via grep
**Pattern extraction date:** 2026-05-21
