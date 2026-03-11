'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import type { SpecificBequest } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import { BequestDialog } from './BequestDialog'
import { BequestTable } from './BequestTable'
import type { BequestFormData } from './types'

const log = logger.create('Bequests')

export function BequestsClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: beneficiaries = [] } = trpc.beneficiary.list.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )
    const { data: bequests = [], isLoading: bequestsLoading } =
        trpc.specificBequest.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createBequestMutation = trpc.specificBequest.create.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })
    const updateBequestMutation = trpc.specificBequest.update.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })
    const deleteBequestMutation = trpc.specificBequest.delete.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })

    const loading = bequestsLoading

    const [editingBequestId, setEditingBequestId] = useState<number | null>(
        null,
    )
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

    const bequestForm = useResourceForm<BequestFormData>({
        initialData: {
            description: '',
            category: 'OTHER',
            beneficiaryId: '',
            recipientName: '',
            dateDistributed: '',
            notes: '',
        },
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                description: data.description,
                category: data.category || 'OTHER',
                beneficiaryId: data.beneficiaryId
                    ? Number(data.beneficiaryId)
                    : undefined,
                recipientName: data.recipientName || undefined,
                dateDistributed: data.dateDistributed || undefined,
                notes: data.notes || undefined,
            }
            if (bequestForm.isEditing && editingBequestId) {
                await updateBequestMutation.mutateAsync({
                    id: editingBequestId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createBequestMutation.mutateAsync(payload)
            }
            setEditingBequestId(null)
        },
    })

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Bequest',
            description:
                'Are you sure you want to delete this bequest? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteId === null) return
                try {
                    await deleteBequestMutation.mutateAsync({
                        id: pendingDeleteId,
                        entityId: entityId!,
                    })
                } catch (error) {
                    log.error('Failed to delete bequest', { error })
                } finally {
                    setPendingDeleteId(null)
                }
            },
        })

    const handleDelete = (id: number) => {
        setPendingDeleteId(id)
        confirmDelete()
    }

    const handleUpdate = async (
        id: number,
        updates: Partial<SpecificBequest>,
    ) => {
        await updateBequestMutation.mutateAsync({
            id,
            entityId: entityId!,
            data: updates,
        })
    }

    const handleMarkDistributed = async (bequest: SpecificBequest) => {
        try {
            await updateBequestMutation.mutateAsync({
                id: bequest.id,
                entityId: entityId!,
                data: { dateDistributed: new Date().toISOString() },
            })
        } catch (error) {
            log.error('Failed to mark as distributed', { error })
        }
    }

    const handleEdit = (bequest: SpecificBequest) => {
        setEditingBequestId(bequest.id)
        bequestForm.handleEdit({
            description: bequest.description,
            category: bequest.category || 'OTHER',
            beneficiaryId: bequest.beneficiaryId
                ? String(bequest.beneficiaryId)
                : '',
            recipientName: bequest.recipientName || '',
            dateDistributed: bequest.dateDistributed?.split('T')[0] || '',
            notes: bequest.notes || '',
        })
    }

    const pendingBequests = bequests.filter((b) => !b.dateDistributed)
    const distributedBequests = bequests.filter((b) => b.dateDistributed)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Specific Bequests
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {pendingBequests.length} pending,{' '}
                        {distributedBequests.length} distributed
                    </p>
                </div>
                <Button onClick={() => bequestForm.open()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bequest
                </Button>
            </div>

            <BequestTable
                pendingBequests={pendingBequests}
                distributedBequests={distributedBequests}
                beneficiaries={beneficiaries}
                isLoading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkDistributed={handleMarkDistributed}
                onUpdate={handleUpdate}
            />

            <BequestDialog
                isOpen={bequestForm.isOpen}
                isEditing={bequestForm.isEditing}
                isSubmitting={bequestForm.isSubmitting}
                onOpenChange={bequestForm.close}
                onSubmit={bequestForm.handleSave}
                beneficiaries={beneficiaries}
                formInstance={bequestForm.formInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
