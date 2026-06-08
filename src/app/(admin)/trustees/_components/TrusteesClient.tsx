'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
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
    const [createMode, setCreateMode] = useState<'TRUSTEE' | 'ARBITER' | null>(
        null,
    )

    const trusteeForm = useResourceForm({
        initialData: trusteeFormDefaults(),
        onSubmit: async (data) => {
            const payload = {
                name: data.name,
                status: editingId
                    ? asTrusteeStatus(data.status ?? '')
                    : createMode === 'ARBITER'
                      ? ('ARBITER' as const)
                      : ('ACTIVE' as const),
                startDate: data.startDate || null,
                endDate: data.endDate || null,
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
                toast.success(
                    createMode === 'ARBITER'
                        ? 'Arbiter created'
                        : 'Trustee created',
                )
                setCreateMode(null)
            }
        },
    })

    const handleEditTrustee = (t: TrusteeRow) => {
        setEditingId(t.id)
        trusteeForm.handleEdit({
            name: t.name,
            status: t.status ?? 'ACTIVE',
            isCo: t.isCo ?? false,
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

    // trustee.list is server-ordered by `order` (idx_trustee_entity_order),
    // so no client-side .sort() is needed — server order is authoritative.
    const currentTrustees = trustees.filter((t) => t.status === 'ACTIVE')
    const arbiterTrustees = trustees.filter((t) => t.status === 'ARBITER')
    const successorCount = trustees.filter(
        (t) => t.status === 'SUCCESSOR',
    ).length

    // /trustees per UI-SPEC §2 — 3-column variant (no 4th KPI). KpiStrip's
    // lg:grid-cols-4 leaves an empty slot which is acceptable per the spec.
    const kpiData: KpiStripItem[] = [
        { label: 'Trustee count', value: trustees.length },
        { label: 'Current count', value: currentTrustees.length },
        { label: 'Successor count', value: successorCount },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Trustees"
                description="Trustees, arbiters, and successor trustees with their order of service."
                actions={
                    <Button
                        onClick={() => {
                            setEditingId(null)
                            setCreateMode('TRUSTEE')
                            trusteeForm.open()
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Trustee
                    </Button>
                }
            />

            <KpiStrip data={kpiData} isLoading={trusteesLoading} />

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
                        setCreateMode('ARBITER')
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
                            trustees={arbiterTrustees}
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
                createMode={createMode}
                onOpenChange={() => {
                    setEditingId(null)
                    setCreateMode(null)
                    trusteeForm.close()
                }}
                onSubmit={trusteeForm.handleSave}
                formInstance={trusteeForm.formInstance}
            />

            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
