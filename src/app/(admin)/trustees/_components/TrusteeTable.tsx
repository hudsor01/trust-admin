'use client'

import { Calendar, Mail, Phone, Trash2 } from 'lucide-react'
import {
    EditableDateCell,
    EditableNumberCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
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
import { enumToOptions, TRUSTEE_STATUS_VALUES } from '@/lib/type-utils'
import { asTrusteeStatus } from '@/lib/type-utils'
import { formatDate } from '@/utils/formatters'

// Derive options from schema enums (single source of truth)
export const STATUS_OPTIONS = enumToOptions(TRUSTEE_STATUS_VALUES)

// Primary trustee cannot be edited for security
const PRIMARY_TRUSTEE_EMAIL = 'rhudsontspr@gmail.com'

type TrusteeRow = {
    id: number
    entityId: number
    name: string
    email: string | null
    phone: string | null
    dob: string | null
    status: string | null
    order: number
    isCo: boolean | null
    coTrusteeId: number | null
    startDate: string | null
    endDate: string | null
}

interface TrusteeTableProps {
    trustees: TrusteeRow[]
    selectedEntity: number
    allowPrimaryLock?: boolean
    onDelete: (id: number) => void
    // biome-ignore lint/suspicious/noExplicitAny: fields map directly to update schema types
    onUpdateField: (id: number, data: any) => Promise<void>
}

export function TrusteeTable({
    trustees,
    selectedEntity,
    allowPrimaryLock = false,
    onDelete,
    onUpdateField,
}: TrusteeTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Birthday</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trustees.map((t) => {
                        const isPrimary =
                            allowPrimaryLock && t.email === PRIMARY_TRUSTEE_EMAIL
                        return (
                            <TableRow key={t.id}>
                                <TableCell>
                                    {isPrimary ? (
                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                            <span className="text-sm">{t.order}</span>
                                        </div>
                                    ) : (
                                        <EditableNumberCell
                                            value={t.order}
                                            onSave={async (val) => {
                                                await onUpdateField(t.id, {
                                                    order: val ?? undefined,
                                                })
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
                                            onSave={async (val) => {
                                                await onUpdateField(t.id, {
                                                    name: val as string,
                                                })
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                        {isPrimary ? (
                                            <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                                <span className="text-sm">{t.email}</span>
                                            </div>
                                        ) : (
                                            <EditableTextCell
                                                value={t.email}
                                                placeholder="Add email"
                                                onSave={async (val) => {
                                                    await onUpdateField(t.id, { email: val })
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
                                                <span className="text-sm">{t.phone}</span>
                                            </div>
                                        ) : (
                                            <EditableTextCell
                                                value={t.phone}
                                                placeholder="Add phone"
                                                onSave={async (val) => {
                                                    await onUpdateField(t.id, { phone: val })
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
                                                    {formatDate(t.dob)}
                                                </span>
                                            </div>
                                        ) : (
                                            <EditableDateCell
                                                value={t.dob}
                                                onSave={async (val) => {
                                                    await onUpdateField(t.id, { dob: val })
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
                                                    (o) => o.value === t.status,
                                                )?.label ?? t.status}
                                            </span>
                                        </div>
                                    ) : (
                                        <EditableSelectCell
                                            value={t.status ?? ''}
                                            options={STATUS_OPTIONS}
                                            onSave={async (val) => {
                                                await onUpdateField(t.id, {
                                                    status: asTrusteeStatus(val as string),
                                                })
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {isPrimary ? (
                                        <div className="px-2 py-1 -mx-2 -my-1 min-h-7 flex items-center">
                                            <span className="text-sm">
                                                {formatDate(t.startDate)}
                                            </span>
                                        </div>
                                    ) : (
                                        <EditableDateCell
                                            value={t.startDate}
                                            onSave={async (val) => {
                                                await onUpdateField(t.id, { startDate: val })
                                            }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {!isPrimary && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => onDelete(t.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Delete</p>
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
    )
}
