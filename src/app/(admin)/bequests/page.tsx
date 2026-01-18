'use client'

import { Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SpecificBequest } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { trpc } from '@/lib/trpc'
import { formatDate } from '@/utils/formatters'

const BEQUEST_CATEGORIES = [
    { value: 'PET', label: 'Pet' },
    { value: 'JEWELRY', label: 'Jewelry' },
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'ARTWORK', label: 'Artwork' },
    { value: 'COLLECTIBLE', label: 'Collectible' },
    { value: 'HEIRLOOM', label: 'Family Heirloom' },
    { value: 'ELECTRONICS', label: 'Electronics' },
    { value: 'OTHER', label: 'Other' },
]

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

    const createBequestMutation = trpc.specificBequest.create.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })
    const updateBequestMutation = trpc.specificBequest.update.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })
    const deleteBequestMutation = trpc.specificBequest.delete.useMutation({
        onSuccess: () => utils.specificBequest.list.invalidate(),
    })

    const loading = entitiesLoading || bequestsLoading

    // Track which bequest is being edited
    const [editingBequestId, setEditingBequestId] = useState<number | null>(
        null,
    )

    // Form data type
    type BequestFormData = {
        description: string
        category: string
        beneficiaryId: string
        recipientName: string
        dateDistributed: string
        notes: string
    }

    // Form state using useResourceForm hook
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
                    data: payload,
                })
            } else {
                await createBequestMutation.mutateAsync(payload)
            }
            setEditingBequestId(null)
        },
    })

    const { formInstance } = bequestForm

    const deleteBequest = async (id: number) => {
        if (!confirm('Are you sure you want to delete this bequest?')) return

        try {
            await deleteBequestMutation.mutateAsync(id)
        } catch (error) {
            console.error('Failed to delete bequest:', error)
        }
    }

    const updateBequest = async (
        id: number,
        updates: Partial<SpecificBequest>,
    ) => {
        await updateBequestMutation.mutateAsync({ id, data: updates })
    }

    const markDistributed = async (bequest: SpecificBequest) => {
        try {
            await updateBequestMutation.mutateAsync({
                id: bequest.id,
                data: { dateDistributed: new Date().toISOString() },
            })
        } catch (error) {
            console.error('Failed to mark as distributed:', error)
        }
    }

    const openEditForm = (bequest: SpecificBequest) => {
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
                    <Button onClick={() => bequestForm.open()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bequest
                    </Button>
                </div>
            </div>

            {/* Pending Bequests */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Bequests</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : pendingBequests.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No pending bequests
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="w-[120px]">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingBequests.map((b) => {
                                        const recipient = b.beneficiaryId
                                            ? beneficiaries.find(
                                                  (ben) =>
                                                      ben.id ===
                                                      b.beneficiaryId,
                                              )
                                            : null
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium">
                                                    <EditableTextCell
                                                        value={b.description}
                                                        onSave={(v) =>
                                                            updateBequest(
                                                                b.id,
                                                                {
                                                                    description:
                                                                        String(
                                                                            v ||
                                                                                '',
                                                                        ),
                                                                },
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <EditableSelectCell
                                                        value={
                                                            b.category ||
                                                            'OTHER'
                                                        }
                                                        options={
                                                            BEQUEST_CATEGORIES
                                                        }
                                                        onSave={(v) =>
                                                            updateBequest(
                                                                b.id,
                                                                { category: v },
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {recipient ? (
                                                        `${recipient.firstName} ${recipient.lastName}`
                                                    ) : (
                                                        <EditableTextCell
                                                            value={
                                                                b.recipientName
                                                            }
                                                            onSave={(v) =>
                                                                updateBequest(
                                                                    b.id,
                                                                    {
                                                                        recipientName:
                                                                            v,
                                                                    },
                                                                )
                                                            }
                                                            placeholder="Add recipient"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <EditableTextCell
                                                        value={b.notes}
                                                        onSave={(v) =>
                                                            updateBequest(
                                                                b.id,
                                                                { notes: v },
                                                            )
                                                        }
                                                        placeholder="Add notes"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-success hover:text-success"
                                                                        onClick={() =>
                                                                            markDistributed(
                                                                                b,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Mark
                                                                    Distributed
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() =>
                                                                            openEditForm(
                                                                                b,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Edit
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                        onClick={() =>
                                                                            deleteBequest(
                                                                                b.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Delete
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Distributed Bequests */}
            <Card>
                <CardHeader>
                    <CardTitle>Distributed Bequests</CardTitle>
                </CardHeader>
                <CardContent>
                    {distributedBequests.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No distributed bequests
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Date Distributed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {distributedBequests.map((b) => {
                                        const recipient = b.beneficiaryId
                                            ? beneficiaries.find(
                                                  (ben) =>
                                                      ben.id ===
                                                      b.beneficiaryId,
                                              )
                                            : null
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium">
                                                    {b.description}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {BEQUEST_CATEGORIES.find(
                                                            (c) =>
                                                                c.value ===
                                                                b.category,
                                                        )?.label || b.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {recipient
                                                        ? `${recipient.firstName} ${recipient.lastName}`
                                                        : b.recipientName ||
                                                          '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(
                                                        b.dateDistributed,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bequest Form Dialog */}
            <ResourceDialog
                open={bequestForm.isOpen}
                onOpenChange={bequestForm.close}
                title={bequestForm.isEditing ? 'Edit Bequest' : 'Add Bequest'}
                onSubmit={bequestForm.handleSave}
                isLoading={bequestForm.isSubmitting}
            >
                <div className="space-y-4">
                    {/* Description - Required */}
                    <formInstance.Field name="description">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Description *
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the item (e.g., 'Dog named Bandit', 'Gold wedding ring')"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    rows={2}
                                />
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Category */}
                    <formInstance.Field name="category">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(v) => field.handleChange(v)}
                                >
                                    <SelectTrigger
                                        id="category"
                                        onBlur={field.handleBlur}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BEQUEST_CATEGORIES.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Beneficiary */}
                    <formInstance.Field name="beneficiaryId">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="beneficiary">
                                    Beneficiary (if applicable)
                                </Label>
                                <Select
                                    value={field.state.value || '__none__'}
                                    onValueChange={(v) =>
                                        field.handleChange(
                                            v === '__none__' ? '' : v,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="beneficiary"
                                        onBlur={field.handleBlur}
                                    >
                                        <SelectValue placeholder="Select beneficiary" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            None
                                        </SelectItem>
                                        {beneficiaries.map((b) => (
                                            <SelectItem
                                                key={b.id}
                                                value={String(b.id)}
                                            >
                                                {b.firstName} {b.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Recipient Name */}
                    <formInstance.Field name="recipientName">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="recipientName">
                                    Recipient Name (if not a beneficiary)
                                </Label>
                                <Input
                                    id="recipientName"
                                    placeholder="Name of recipient"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use this if the recipient is not listed as a
                                    beneficiary
                                </p>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Date Distributed */}
                    <formInstance.Field name="dateDistributed">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="dateDistributed">
                                    Date Distributed
                                </Label>
                                <Input
                                    id="dateDistributed"
                                    type="date"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave blank if not yet distributed
                                </p>
                            </div>
                        )}
                    </formInstance.Field>

                    {/* Notes */}
                    <formInstance.Field name="notes">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Additional notes..."
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </formInstance.Field>
                </div>
            </ResourceDialog>
        </div>
    )
}
