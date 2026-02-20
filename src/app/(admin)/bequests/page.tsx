'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { SpecificBequest } from '@/db/schema'
import { useCrudMutations } from '@/hooks/use-crud-mutations'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import { BequestDialog } from './_components/BequestDialog'
import { BequestTable } from './_components/BequestTable'

const log = logger.create('Bequests')

type BequestFormData = {
    description: string
    category: string
    beneficiaryId: string
    recipientName: string
    dateDistributed: string
    notes: string
}

export default function BequestsPage() {
    const utils = trpc.useUtils()
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityIdStr, setEntityIdStr] = useEntityFilter()
    const selectedEntity = entityIdStr ? Number(entityIdStr) : entities[0]?.id

    const { data: beneficiaries = [] } = trpc.beneficiary.list.useQuery(
        { entityId: selectedEntity! },
        { enabled: !!selectedEntity },
    )
    const { data: bequests = [], isLoading: bequestsLoading } =
        trpc.specificBequest.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: !!selectedEntity },
        )

    const {
        create: createBequestMutation,
        update: updateBequestMutation,
        delete: deleteBequestMutation,
    } = useCrudMutations({
        router: trpc.specificBequest,
        invalidate: () => utils.specificBequest.list.invalidate(),
    })

    const loading = entitiesLoading || bequestsLoading

    const [editingBequestId, setEditingBequestId] = useState<number | null>(null)

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
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity!,
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
                    entityId: selectedEntity!,
                    data: payload,
                })
            } else {
                await createBequestMutation.mutateAsync(payload)
            }
            setEditingBequestId(null)
        },
    })

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this bequest?')) return
        try {
            await deleteBequestMutation.mutateAsync({
                id,
                entityId: selectedEntity!,
            })
        } catch (error) {
            log.error('Failed to delete bequest', { error })
        }
    }

    const handleUpdate = async (
        id: number,
        updates: Partial<SpecificBequest>,
    ) => {
        await updateBequestMutation.mutateAsync({
            id,
            entityId: selectedEntity!,
            data: updates,
        })
    }

    const handleMarkDistributed = async (bequest: SpecificBequest) => {
        try {
            await updateBequestMutation.mutateAsync({
                id: bequest.id,
                entityId: selectedEntity!,
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
            {/* Header */}
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
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedEntity ? String(selectedEntity) : ''}
                        onValueChange={(val) => setEntityIdStr(val || null)}
                    >
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select Trust" />
                        </SelectTrigger>
                        <SelectContent>
                            {entities.map((e) => (
                                <SelectItem key={e.id} value={String(e.id)}>
                                    {e.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={() => bequestForm.open()}
                        disabled={!selectedEntity}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bequest
                    </Button>
                </div>
            </div>

            {/* Pending and Distributed Tables */}
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

            {/* Bequest Form Dialog */}
            <BequestDialog
                isOpen={bequestForm.isOpen}
                isEditing={bequestForm.isEditing}
                isSubmitting={bequestForm.isSubmitting}
                onOpenChange={bequestForm.close}
                onSubmit={bequestForm.handleSave}
                beneficiaries={beneficiaries}
                formInstance={bequestForm.formInstance}
            />
        </div>
    )
}
