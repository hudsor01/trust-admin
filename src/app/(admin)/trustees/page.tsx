'use client'

import { Calendar, Loader2, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    EditableDateCell,
    EditableNumberCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { ResourceDialog } from '@/components/resource-dialog'
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useResourceForm } from '@/hooks/use-resource-form'
import { trusteeFormDefaults } from '@/lib/form-factory'
import { trpc } from '@/lib/trpc'
import {
    asTrusteeStatus,
    enumToOptions,
    TRUSTEE_STATUS_VALUES,
} from '@/lib/type-utils'
import { formatDate } from '@/utils/formatters'

type Trustee = {
    id: number
    entityId: number
    name: string
    email: string | null
    phone: string | null
    dob: string | null
    status: string
    order: number
    isCo: boolean | null
    coTrusteeId: number | null
    startDate: string | null
    endDate: string | null
}

// Derive options from schema enums (single source of truth)
const STATUS_OPTIONS = enumToOptions(TRUSTEE_STATUS_VALUES)

// Primary trustee cannot be edited for security
const PRIMARY_TRUSTEE_EMAIL = 'rhudsontspr@gmail.com'

export default function TrusteesPage() {
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId ? Number(entityId) : entities[0]?.id

    const { data: trustees = [], isLoading: trusteesLoading } =
        trpc.trustee.list.useQuery(
            { entityId: selectedEntity || undefined },
            { enabled: !!selectedEntity },
        )

    const utils = trpc.useUtils()
    const createTrusteeMutation = trpc.trustee.create.useMutation({
        onSuccess: () => {
            utils.trustee.list.invalidate()
            toast.success('Trustee created')
        },
        onError: (error) => toast.error(error.message),
    })
    const updateTrusteeMutation = trpc.trustee.update.useMutation({
        onSuccess: () => {
            utils.trustee.list.invalidate()
            toast.success('Trustee updated')
        },
        onError: (error) => toast.error(error.message),
    })
    const deleteTrusteeMutation = trpc.trustee.delete.useMutation({
        onSuccess: () => {
            utils.trustee.list.invalidate()
            toast.success('Trustee deleted')
        },
        onError: (error) => toast.error(error.message),
    })

    const trusteeForm = useResourceForm<Trustee>({
        initialData: { ...trusteeFormDefaults(), id: 0 } as Trustee,
        onSubmit: async (data) => {
            if (!selectedEntity) return
            const payload = {
                entityId: selectedEntity,
                name: data.name,
                status: asTrusteeStatus(data.status),
                order: data.order,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
            }
            if (
                trusteeForm.isEditing &&
                trusteeForm.editing &&
                'id' in trusteeForm.editing
            ) {
                await updateTrusteeMutation.mutateAsync({
                    id: (trusteeForm.editing as Trustee).id,
                    data: payload,
                })
            } else {
                await createTrusteeMutation.mutateAsync(payload)
            }
        },
    })

    const { formInstance } = trusteeForm

    const deleteTrustee = async (id: number) => {
        if (!confirm('Are you sure you want to delete this trustee?')) return
        try {
            await deleteTrusteeMutation.mutateAsync(id)
        } catch (error) {
            console.error('Failed to delete trustee:', error)
        }
    }

    const loading = entitiesLoading || trusteesLoading

    const currentTrustees = trustees
        .filter((t) => t.status === 'ACTIVE')
        .sort((a, b) => a.order - b.order)
    const arbitorTrustees = trustees.filter((t) => t.status === 'ARBITOR')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Trustees
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {currentTrustees.length} active trustees,{' '}
                        {arbitorTrustees.length} arbitors
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedEntity?.toString() ?? undefined}
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
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">
                                            Order
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Birthday</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead className="w-[60px]">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentTrustees.map((t) => {
                                        const isPrimary =
                                            t.email === PRIMARY_TRUSTEE_EMAIL
                                        return (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    {isPrimary ? (
                                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                            <span className="text-sm">
                                                                {t.order}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <EditableNumberCell
                                                            value={t.order}
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            order:
                                                                                val ??
                                                                                undefined,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isPrimary ? (
                                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                            <span className="text-sm font-medium">
                                                                {t.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <EditableTextCell
                                                            value={t.name}
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            name: val as string,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        {isPrimary ? (
                                                            <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                                <span className="text-sm">
                                                                    {t.email}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <EditableTextCell
                                                                value={t.email}
                                                                placeholder="Add email"
                                                                onSave={async (
                                                                    val,
                                                                ) => {
                                                                    await updateTrusteeMutation.mutateAsync(
                                                                        {
                                                                            id: t.id,
                                                                            data: {
                                                                                email: val,
                                                                            },
                                                                        },
                                                                    )
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        {isPrimary ? (
                                                            <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                                <span className="text-sm">
                                                                    {t.phone}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <EditableTextCell
                                                                value={t.phone}
                                                                placeholder="Add phone"
                                                                onSave={async (
                                                                    val,
                                                                ) => {
                                                                    await updateTrusteeMutation.mutateAsync(
                                                                        {
                                                                            id: t.id,
                                                                            data: {
                                                                                phone: val,
                                                                            },
                                                                        },
                                                                    )
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        {isPrimary ? (
                                                            <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                                <span className="text-sm">
                                                                    {formatDate(
                                                                        t.dob,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <EditableDateCell
                                                                value={t.dob}
                                                                onSave={async (
                                                                    val,
                                                                ) => {
                                                                    await updateTrusteeMutation.mutateAsync(
                                                                        {
                                                                            id: t.id,
                                                                            data: {
                                                                                dob: val,
                                                                            },
                                                                        },
                                                                    )
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {isPrimary ? (
                                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                            <span className="text-sm">
                                                                {STATUS_OPTIONS.find(
                                                                    (o) =>
                                                                        o.value ===
                                                                        t.status,
                                                                )?.label ??
                                                                    t.status}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <EditableSelectCell
                                                            value={
                                                                t.status ?? ''
                                                            }
                                                            options={
                                                                STATUS_OPTIONS
                                                            }
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            status: asTrusteeStatus(
                                                                                val as string,
                                                                            ),
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isPrimary ? (
                                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                            <span className="text-sm">
                                                                {formatDate(
                                                                    t.startDate,
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <EditableDateCell
                                                            value={t.startDate}
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            startDate:
                                                                                val,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {!isPrimary && (
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
                                                                            deleteTrustee(
                                                                                t.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Delete
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Arbitors</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => trusteeForm.open({ status: 'ARBITOR' })}
                        disabled={!selectedEntity}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Arbitor
                    </Button>
                </CardHeader>
                <CardContent>
                    {arbitorTrustees.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No arbitors designated
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">
                                            Order
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Birthday</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead className="w-[60px]">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {arbitorTrustees
                                        .sort((a, b) => a.order - b.order)
                                        .map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <EditableNumberCell
                                                        value={t.order}
                                                        onSave={async (val) => {
                                                            await updateTrusteeMutation.mutateAsync(
                                                                {
                                                                    id: t.id,
                                                                    data: {
                                                                        order:
                                                                            val ??
                                                                            undefined,
                                                                    },
                                                                },
                                                            )
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <EditableTextCell
                                                        value={t.name}
                                                        onSave={async (val) => {
                                                            await updateTrusteeMutation.mutateAsync(
                                                                {
                                                                    id: t.id,
                                                                    data: {
                                                                        name: val as string,
                                                                    },
                                                                },
                                                            )
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <EditableTextCell
                                                            value={t.email}
                                                            placeholder="Add email"
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            email: val,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <EditableTextCell
                                                            value={t.phone}
                                                            placeholder="Add phone"
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            phone: val,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <EditableDateCell
                                                            value={t.dob}
                                                            onSave={async (
                                                                val,
                                                            ) => {
                                                                await updateTrusteeMutation.mutateAsync(
                                                                    {
                                                                        id: t.id,
                                                                        data: {
                                                                            dob: val,
                                                                        },
                                                                    },
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <EditableSelectCell
                                                        value={t.status ?? ''}
                                                        options={STATUS_OPTIONS}
                                                        onSave={async (val) => {
                                                            await updateTrusteeMutation.mutateAsync(
                                                                {
                                                                    id: t.id,
                                                                    data: {
                                                                        status: asTrusteeStatus(
                                                                            val as string,
                                                                        ),
                                                                    },
                                                                },
                                                            )
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <EditableDateCell
                                                        value={t.startDate}
                                                        onSave={async (val) => {
                                                            await updateTrusteeMutation.mutateAsync(
                                                                {
                                                                    id: t.id,
                                                                    data: {
                                                                        startDate:
                                                                            val,
                                                                    },
                                                                },
                                                            )
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
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
                                                                        deleteTrustee(
                                                                            t.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ResourceDialog
                open={trusteeForm.isOpen}
                onOpenChange={trusteeForm.close}
                title={trusteeForm.isEditing ? 'Edit Trustee' : 'Add Trustee'}
                onSubmit={trusteeForm.handleSave}
                isLoading={trusteeForm.isSubmitting}
            >
                <div className="space-y-4">
                    <formInstance.Field name="name">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="Full legal name"
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="status">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={field.state.value ?? undefined}
                                    onValueChange={(v) => field.handleChange(v)}
                                >
                                    <SelectTrigger
                                        id="status"
                                        onBlur={field.handleBlur}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((s) => (
                                            <SelectItem
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="order">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="order">Order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={field.state.value}
                                    onChange={(e) =>
                                        field.handleChange(
                                            parseInt(e.target.value, 10) || 1,
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                />
                                <p className="text-xs text-muted-foreground">
                                    1 = Primary, 2 = First Successor, etc.
                                </p>
                                {field.state.meta.errors?.[0] && (
                                    <p className="text-sm text-destructive">
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="startDate">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.target.value || null,
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                />
                            </div>
                        )}
                    </formInstance.Field>

                    <formInstance.Field name="endDate">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={field.state.value || ''}
                                    onChange={(e) =>
                                        field.handleChange(
                                            e.target.value || null,
                                        )
                                    }
                                    onBlur={field.handleBlur}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave blank if currently serving
                                </p>
                            </div>
                        )}
                    </formInstance.Field>
                </div>
            </ResourceDialog>
        </div>
    )
}
