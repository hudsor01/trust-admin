'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Trustee } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useNeonList, useNeonMutations } from '@/hooks/use-neon-data'
import { useResourceForm } from '@/hooks/use-resource-form'
import { trusteeFormDefaults } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import { asTrusteeStatus } from '@/lib/type-utils'
import { TrusteeDialog } from './_components/TrusteeDialog'
import { type TrusteeRow, TrusteeTable } from './_components/TrusteeTable'

const log = logger.create('Trustees')

export default function TrusteesPage() {
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId ? Number(entityId) : entities[0]?.id

    const { data: trustees = [], isLoading: trusteesLoading } =
        useNeonList<Trustee>(
            'trustee',
            selectedEntity ? { entity_id: selectedEntity } : undefined,
            { enabled: !!selectedEntity },
        )

    const {
        create: createTrusteeMutation,
        update: updateTrusteeMutation,
        delete: deleteTrusteeMutation,
    } = useNeonMutations<Trustee>('trustee')

    const trusteeForm = useResourceForm({
        initialData: trusteeFormDefaults(),
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity,
                name: data.name,
                status: asTrusteeStatus(data.status ?? ''),
                order: data.order,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
            }
            await createTrusteeMutation.mutateAsync(payload)
            toast.success('Trustee created')
        },
    })

    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Trustee',
            description:
                'Are you sure you want to delete this trustee? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (pendingDeleteId === null) return
                try {
                    await deleteTrusteeMutation.mutateAsync({
                        id: pendingDeleteId,
                        entityId: selectedEntity!,
                    })
                    toast.success('Trustee deleted')
                } catch (error) {
                    log.error('Failed to delete trustee', { error })
                    toast.error('Failed to delete trustee')
                } finally {
                    setPendingDeleteId(null)
                }
            },
        })

    const handleDelete = (id: number) => {
        setPendingDeleteId(id)
        confirmDelete()
    }

    const handleUpdateField = async (id: number, data: Partial<TrusteeRow>) => {
        try {
            await updateTrusteeMutation.mutateAsync({
                id,
                entityId: selectedEntity!,
                data,
            })
            toast.success('Trustee updated')
        } catch (error) {
            log.error('Failed to update trustee', { error })
            toast.error('Failed to update trustee')
        }
    }

    const loading = entitiesLoading || trusteesLoading

    const currentTrustees = trustees
        .filter((t) => t.status === 'ACTIVE')
        .sort((a, b) => a.order - b.order)
    const arbiterTrustees = trustees.filter((t) => t.status === 'ARBITER')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-balance">
                    Trustees
                </h2>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedEntity?.toString() ?? ''}
                        onValueChange={(val) => setEntityId(val || null)}
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
                        onClick={() => trusteeForm.open()}
                        disabled={!selectedEntity}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Trustee
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Current Trustees</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : currentTrustees.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No current trustees
                        </p>
                    ) : (
                        <TrusteeTable
                            trustees={currentTrustees}
                            allowPrimaryLock={true}
                            onDelete={handleDelete}
                            onUpdateField={handleUpdateField}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">
                    Arbiters
                </h3>
                <Button
                    onClick={() => trusteeForm.open({ status: 'ARBITER' })}
                    disabled={!selectedEntity}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Arbiter
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {arbiterTrustees.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No arbiters designated
                        </p>
                    ) : (
                        <TrusteeTable
                            trustees={arbiterTrustees.sort(
                                (a, b) => a.order - b.order,
                            )}
                            allowPrimaryLock={false}
                            onDelete={handleDelete}
                            onUpdateField={handleUpdateField}
                        />
                    )}
                </CardContent>
            </Card>

            <TrusteeDialog
                isOpen={trusteeForm.isOpen}
                isEditing={trusteeForm.isEditing}
                isSubmitting={trusteeForm.isSubmitting}
                onOpenChange={trusteeForm.close}
                onSubmit={trusteeForm.handleSave}
                formInstance={trusteeForm.formInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
