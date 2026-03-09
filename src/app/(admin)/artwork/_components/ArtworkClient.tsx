'use client'

import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import type { Artwork } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { artworkFormDefaults, toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    asRecordStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { ArtworkDialog } from './ArtworkDialog'
import { ArtworkTable } from './ArtworkTable'

const log = logger.create('Artwork')

export function ArtworkClient() {
    const entityId = 1
    const utils = trpc.useUtils()

    const { data: artworks = [], isLoading: artworksLoading } =
        trpc.artwork.list.useQuery({ entityId })

    const createArtworkMutation = trpc.artwork.create.useMutation({
        onSuccess: () => utils.artwork.list.invalidate(),
    })
    const updateArtworkMutation = trpc.artwork.update.useMutation({
        onSuccess: () => utils.artwork.list.invalidate(),
    })
    const deleteArtworkMutation = trpc.artwork.delete.useMutation({
        onSuccess: () => utils.artwork.list.invalidate(),
    })

    const [pendingDelete, setPendingDelete] = useState<Artwork | null>(null)

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Artwork',
            description:
                'Are you sure you want to delete this artwork? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteArtworkMutation.mutateAsync({
                        id: pendingDelete.id,
                        entityId,
                    })
                } catch (err) {
                    log.error('Failed to delete artwork', { error: err })
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const artworkForm = useResourceForm({
        initialData: artworkFormDefaults(),
        onSubmit: async (data) => {
            const payload = {
                entityId,
                title: data.title,
                artist: data.artist || null,
                medium: data.medium || null,
                dimensions: data.dimensions || null,
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                location: data.location || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (
                artworkForm.isEditing &&
                artworkForm.editing &&
                'id' in artworkForm.editing
            ) {
                const editingId = (artworkForm.editing as Artwork).id
                await updateArtworkMutation.mutateAsync({
                    id: editingId,
                    entityId,
                    data: payload,
                })
            } else {
                await createArtworkMutation.mutateAsync(payload)
            }
        },
    })

    const handleEdit = useCallback(
        (a: Artwork) => {
            artworkForm.handleEdit({
                ...a,
                artist: a.artist || '',
                medium: a.medium || '',
                dimensions: a.dimensions || '',
                acquisitionDate: toDateInput(a.acquisitionDate),
                acquisitionCost: a.acquisitionCost || '',
                location: a.location || '',
                dodValue: a.dodValue || '',
                dodValueDate: toDateInput(a.dodValueDate),
                dodValueType: a.dodValueType || '',
                notes: a.notes || '',
            })
        },
        [artworkForm],
    )

    const handleDelete = useCallback(
        (item: Artwork) => {
            setPendingDelete(item)
            confirmDelete()
        },
        [confirmDelete],
    )

    const handleInlineUpdate = useCallback(
        async (id: number, updates: Partial<Artwork>) => {
            try {
                await updateArtworkMutation.mutateAsync({
                    id,
                    entityId,
                    data: updates,
                })
            } catch (err) {
                log.error('Failed to update artwork', { error: err })
            }
        },
        [updateArtworkMutation],
    )

    const totalValue = sumStrings(artworks.map((a) => a.dodValue))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Artwork
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage artwork and fine art assets
                        {artworks.length > 0 &&
                            ` - Total DOD Value: ${formatCurrency(totalValue)}`}
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={artworkForm.handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Artwork
                </Button>
            </div>

            <ArtworkTable
                artworks={artworks}
                isLoading={artworksLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineUpdate={handleInlineUpdate}
            />

            <ArtworkDialog
                isOpen={artworkForm.isOpen}
                isEditing={artworkForm.isEditing}
                isSubmitting={artworkForm.isSubmitting}
                onOpenChange={artworkForm.close}
                onSubmit={artworkForm.handleSave}
                formInstance={artworkForm.formInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
