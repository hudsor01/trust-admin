'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useResourceForm } from '@/hooks/use-resource-form'
import { trusteeFormDefaults } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import { asTrusteeStatus } from '@/lib/type-utils'
import { TrusteeDialog } from './TrusteeDialog'
import { type TrusteeRow, TrusteeTable } from './TrusteeTable'

const log = logger.create('Trustees')

export function TrusteesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: trustees = [], isLoading: trusteesLoading } =
        trpc.trustee.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const { data: contacts } = trpc.contact.list.useQuery()

    const createTrusteeMutation = trpc.trustee.create.useMutation({
        onSuccess: () => utils.trustee.list.invalidate(),
    })
    const updateTrusteeMutation = trpc.trustee.update.useMutation({
        onSuccess: () => utils.trustee.list.invalidate(),
    })
    const deleteTrusteeMutation = trpc.trustee.delete.useMutation({
        onSuccess: () => utils.trustee.list.invalidate(),
    })

    const [editingId, setEditingId] = useState<number | null>(null)

    const trusteeForm = useResourceForm({
        initialData: trusteeFormDefaults(),
        onSubmit: async (data) => {
            const payload = {
                name: data.name,
                status: asTrusteeStatus(data.status ?? ''),
                order: data.order,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                contactId: data.contactId ? Number(data.contactId) : null,
                coTrusteeId: data.coTrusteeId ? Number(data.coTrusteeId) : null,
            }

            if (editingId) {
                await updateTrusteeMutation.mutateAsync({
                    id: editingId,
                    entityId: entityId!,
                    data: payload,
                })
                toast.success('Trustee updated')
                setEditingId(null)
            } else {
                await createTrusteeMutation.mutateAsync({
                    entityId: entityId!,
                    ...payload,
                })
                toast.success('Trustee created')
            }
        },
    })

    const handleEditTrustee = (t: TrusteeRow) => {
        setEditingId(t.id)
        trusteeForm.handleEdit({
            name: t.name,
            status: t.status ?? 'ACTIVE',
            order: t.order,
            isCo: t.isCo ?? false,
            coTrusteeId: t.coTrusteeId?.toString() ?? null,
            contactId: t.contactId?.toString() ?? null,
            startDate: t.startDate?.split('T')[0] ?? null,
            endDate: t.endDate?.split('T')[0] ?? null,
        })
    }

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
                        entityId: entityId!,
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
                entityId: entityId!,
                data,
            })
            toast.success('Trustee updated')
        } catch (error) {
            log.error('Failed to update trustee', { error })
            toast.error('Failed to update trustee')
        }
    }

    const loading = trusteesLoading

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
                <Button
                    onClick={() => {
                        setEditingId(null)
                        trusteeForm.open()
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trustee
                </Button>
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
                            onEdit={handleEditTrustee}
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
                    onClick={() => {
                        setEditingId(null)
                        trusteeForm.open({ status: 'ARBITER' })
                    }}
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
                            onEdit={handleEditTrustee}
                            onUpdateField={handleUpdateField}
                        />
                    )}
                </CardContent>
            </Card>

            <TrusteeDialog
                isOpen={trusteeForm.isOpen}
                isEditing={trusteeForm.isEditing || editingId !== null}
                isSubmitting={trusteeForm.isSubmitting}
                onOpenChange={() => {
                    setEditingId(null)
                    trusteeForm.close()
                }}
                onSubmit={trusteeForm.handleSave}
                formInstance={trusteeForm.formInstance}
                trustees={trustees.map((t) => ({
                    id: t.id,
                    name: t.name,
                }))}
                contacts={(contacts ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                }))}
                currentTrusteeId={editingId ?? undefined}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
