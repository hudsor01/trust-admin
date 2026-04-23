'use client'

import { Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import type { PersonalProperty } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { personalPropertyFormDefaults, toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asPersonalPropertyCategory,
    asRecordStatus,
    asTransferStatus,
    asValuationType,
    type PersonalPropertyCategory,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { PersonalPropertyDialog } from './PersonalPropertyDialog'
import {
    CATEGORY_OPTIONS,
    PersonalPropertyTable,
} from './PersonalPropertyTable'

export type PersonalPropertyMode = 'personal-property' | 'artwork'

const COPY: Record<
    PersonalPropertyMode,
    {
        heading: string
        subheading: string
        addButton: string
        deleteTitle: string
        searchPlaceholder: string
        emptyMessage: string
        defaultCategory: PersonalPropertyCategory
    }
> = {
    'personal-property': {
        heading: 'Personal Property',
        subheading: 'Manage personal property assets',
        addButton: 'Add Personal Property',
        deleteTitle: 'Delete Personal Property',
        searchPlaceholder: 'Search personal property...',
        emptyMessage:
            'No personal property. Click Add Personal Property to create one.',
        defaultCategory: 'OTHER',
    },
    artwork: {
        heading: 'Artwork',
        subheading: 'Manage artwork assets',
        addButton: 'Add Artwork',
        deleteTitle: 'Delete Artwork',
        searchPlaceholder: 'Search artwork...',
        emptyMessage: 'No artwork. Click Add Artwork to create one.',
        defaultCategory: 'ART',
    },
}

const LOGGERS: Record<
    PersonalPropertyMode,
    ReturnType<typeof logger.create>
> = {
    'personal-property': logger.create('PersonalProperty'),
    artwork: logger.create('Artwork'),
}

interface PersonalPropertyClientProps {
    mode?: PersonalPropertyMode
}

export function PersonalPropertyClient({
    mode = 'personal-property',
}: PersonalPropertyClientProps) {
    const copy = COPY[mode]
    const log = LOGGERS[mode]

    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const listInput =
        mode === 'artwork'
            ? { entityId: entityId!, category: 'ART' as const }
            : { entityId: entityId!, excludeCategory: 'ART' as const }

    const { data: items = [], isLoading: itemsLoading } =
        trpc.personalProperty.list.useQuery(listInput, { enabled: !!entityId })

    const createMutation = trpc.personalProperty.create.useMutation({
        onSuccess: () => utils.personalProperty.list.invalidate(),
    })
    const updateMutation = trpc.personalProperty.update.useMutation({
        onSuccess: () => utils.personalProperty.list.invalidate(),
    })
    const deleteMutation = trpc.personalProperty.delete.useMutation({
        onSuccess: () => utils.personalProperty.list.invalidate(),
    })

    const [pendingDelete, setPendingDelete] = useState<PersonalProperty | null>(
        null,
    )

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: copy.deleteTitle,
            description:
                'Are you sure you want to delete this item? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteMutation.mutateAsync({
                        id: pendingDelete.id,
                        entityId: entityId!,
                    })
                } catch (err) {
                    log.error('Failed to delete item', {
                        error: err,
                    })
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const itemForm = useResourceForm({
        initialData: {
            ...personalPropertyFormDefaults(),
            category: copy.defaultCategory as string,
        },
        onSubmit: async (data) => {
            const category = asPersonalPropertyCategory(data.category)
            const payload = {
                entityId: entityId!,
                name: data.name,
                description: data.description || null,
                category,
                location: data.location || null,
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (
                itemForm.isEditing &&
                itemForm.editing &&
                'id' in itemForm.editing
            ) {
                const editingId = (itemForm.editing as PersonalProperty).id
                const previousCategory = (itemForm.editing as PersonalProperty)
                    .category
                await updateMutation.mutateAsync({
                    id: editingId,
                    entityId: entityId!,
                    data: payload,
                })
                notifyCategoryCrossing(mode, previousCategory, category)
            } else {
                await createMutation.mutateAsync(payload)
                if (mode === 'artwork' && category !== 'ART') {
                    toast.info(
                        'Item saved under Personal Property because its category is not Artwork.',
                    )
                }
            }
        },
    })

    const handleEdit = useCallback(
        (p: PersonalProperty) => {
            itemForm.handleEdit({
                ...p,
                description: p.description || '',
                location: p.location || '',
                acquisitionDate: toDateInput(p.acquisitionDate),
                acquisitionCost: p.acquisitionCost || '',
                dodValue: p.dodValue || '',
                dodValueDate: toDateInput(p.dodValueDate),
                dodValueType: p.dodValueType || '',
                notes: p.notes || '',
            })
        },
        [itemForm],
    )

    const handleDelete = useCallback(
        (item: PersonalProperty) => {
            setPendingDelete(item)
            confirmDelete()
        },
        [confirmDelete],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<PersonalProperty>) => {
            const previousCategory = items.find((p) => p.id === id)?.category
            try {
                await updateMutation.mutateAsync({
                    id,
                    entityId: entityId!,
                    data: updates,
                })
                if (updates.category && previousCategory) {
                    notifyCategoryCrossing(
                        mode,
                        previousCategory,
                        updates.category,
                    )
                }
            } catch (err) {
                log.error('Failed to update item', { error: err })
            }
        },
        [updateMutation, entityId, log, items, mode],
    )

    const categoryOptions = useMemo(
        () =>
            mode === 'artwork'
                ? CATEGORY_OPTIONS.filter((o) => o.value === 'ART')
                : CATEGORY_OPTIONS,
        [mode],
    )

    const totalValue = sumStrings(items.map((p) => p.dodValue))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {copy.heading}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {copy.subheading}
                        {items.length > 0 &&
                            ` - Total DOD Value: ${formatCurrency(totalValue)}`}
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={itemForm.handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    {copy.addButton}
                </Button>
            </div>

            <PersonalPropertyTable
                items={items}
                isLoading={itemsLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineUpdate={handleInlineUpdate}
                categoryOptions={categoryOptions}
                searchPlaceholder={copy.searchPlaceholder}
                emptyMessage={copy.emptyMessage}
            />

            <PersonalPropertyDialog
                isOpen={itemForm.isOpen}
                isEditing={itemForm.isEditing}
                isSubmitting={itemForm.isSubmitting}
                onOpenChange={itemForm.close}
                onSubmit={itemForm.handleSave}
                formInstance={itemForm.formInstance}
                mode={mode}
                categoryOptions={categoryOptions}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}

function notifyCategoryCrossing(
    mode: PersonalPropertyMode,
    previous: PersonalPropertyCategory,
    next: PersonalPropertyCategory,
) {
    if (previous === next) return
    if (mode === 'artwork' && previous === 'ART' && next !== 'ART') {
        toast.info('Moved to Personal Property.')
        return
    }
    if (mode === 'personal-property' && previous !== 'ART' && next === 'ART') {
        toast.info('Moved to Artwork.')
    }
}
