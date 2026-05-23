'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { FileCheck2, Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { BulkAction } from '@/components/ui/data-table-bulk-actions'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { selectColumn } from '@/components/ui/data-table-select-column'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Firearm } from '@/db/schema'
import {
    ATF_FORM_TYPE_LABELS,
    CONDITION_LABELS,
    FIREARM_TYPE_LABELS,
    NFA_CLASS_LABELS,
    NFA_TRANSFER_STATUS_LABELS,
    STATUS_VARIANTS,
    TRANSFER_STATUS,
} from '@/lib/constants'
import {
    asRecordStatus,
    asTransferStatus,
    enumToOptions,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { FirearmRowDetail } from './FirearmRowDetail'

const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(
    ([value, label]) => ({ value, label }),
)

interface FirearmTableProps {
    firearms: Firearm[]
    isLoading: boolean
    entityId: number
    onEdit: (firearm: Firearm) => void
    onDelete: (firearm: Firearm) => void
    /**
     * Opens NfaStatusDialog for the given firearm. Only invoked for rows where
     * `isNfa === true`; rendered as a third action button between Edit and Delete.
     * Dialog state lives in FirearmsClient (lifted in 2026-05-23 audit follow-up)
     * so the same dialog can also fire from FirearmRowDetail when the row is expanded.
     */
    onUpdateNfaStatus: (firearm: Firearm) => void
    onBulkDelete: (rows: Firearm[]) => Promise<void>
    onInlineUpdate: (id: number, updates: Partial<Firearm>) => Promise<void>
}

export function FirearmTable({
    firearms,
    isLoading,
    onEdit,
    onDelete,
    onUpdateNfaStatus,
    onBulkDelete,
    onInlineUpdate,
}: FirearmTableProps) {
    const columns: ColumnDef<Firearm>[] = [
        selectColumn<Firearm>(),
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.name}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { name: val ?? '' })
                    }
                    validate={(val) =>
                        val.trim().length === 0 ? 'Name is required' : null
                    }
                    placeholder="Add name"
                />
            ),
            filterFn: 'includesString',
        },
        {
            id: 'firearmIdentity',
            accessorFn: (row) => `${row.make} ${row.model}`.toLowerCase(),
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Make / Model" />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.make} {row.original.model}
                    </p>
                    {row.original.caliber && (
                        <p className="text-xs text-muted-foreground">
                            {row.original.caliber}
                        </p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'serialNumber',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Serial #" />
            ),
            cell: ({ row }) => (
                <div
                    className="truncate max-w-[140px]"
                    title={row.original.serialNumber}
                >
                    <code className="text-xs">{row.original.serialNumber}</code>
                </div>
            ),
        },
        {
            id: 'typeClassification',
            accessorFn: (row) => row.firearmType,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span>
                        {FIREARM_TYPE_LABELS[row.original.firearmType] ??
                            row.original.firearmType}
                    </span>
                    {row.original.isNfa && (
                        <Badge className="text-milestone-foreground bg-milestone/15 border-milestone/30 text-[10px] px-1 py-0 font-medium">
                            NFA
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'condition',
            header: 'Condition',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.condition}
                    options={CONDITION_OPTIONS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            condition: (val as Firearm['condition']) ?? 'GOOD',
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'dodValue',
            header: 'DOD Value',
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.dodValue}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { dodValue: val })
                    }
                />
            ),
        },
        {
            accessorKey: 'transferStatus',
            header: 'Transfer',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.transferStatus}
                    options={TRANSFER_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            transferStatus: asTransferStatus(val),
                        })
                    }
                />
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            meta: { excludeFromExport: true },
            cell: ({ row }) => (
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label="Edit firearm"
                                    onClick={() => onEdit(row.original)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit firearm</TooltipContent>
                        </Tooltip>
                        {row.original.isNfa && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Update Form 5 status"
                                        onClick={() =>
                                            onUpdateNfaStatus(row.original)
                                        }
                                    >
                                        <FileCheck2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Update Form 5 status
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    aria-label="Delete firearm"
                                    onClick={() => onDelete(row.original)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete firearm</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            ),
        },
        // ----- Hidden by default columns -----
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => row.original.description ?? '—',
        },
        {
            accessorKey: 'barrelLength',
            header: 'Barrel Length',
            cell: ({ row }) => row.original.barrelLength ?? '—',
        },
        {
            accessorKey: 'action',
            header: 'Action Type',
            cell: ({ row }) => row.original.action ?? '—',
        },
        {
            accessorKey: 'isNfa',
            header: 'NFA?',
            cell: ({ row }) => (row.original.isNfa ? 'Yes' : 'No'),
        },
        {
            accessorKey: 'nfaClass',
            header: 'NFA Class',
            cell: ({ row }) =>
                row.original.nfaClass
                    ? (NFA_CLASS_LABELS[row.original.nfaClass] ??
                      row.original.nfaClass)
                    : '—',
        },
        {
            accessorKey: 'atfFormType',
            header: 'ATF Form',
            cell: ({ row }) =>
                row.original.atfFormType
                    ? (ATF_FORM_TYPE_LABELS[row.original.atfFormType] ??
                      row.original.atfFormType)
                    : '—',
        },
        {
            accessorKey: 'atfControlNumber',
            header: 'ATF Control #',
            cell: ({ row }) => row.original.atfControlNumber ?? '—',
        },
        {
            accessorKey: 'taxStampDate',
            header: 'Tax Stamp Date',
            cell: ({ row }) => row.original.taxStampDate ?? '—',
        },
        {
            accessorKey: 'nfrtrSerial',
            header: 'NFRTR Serial',
            cell: ({ row }) => row.original.nfrtrSerial ?? '—',
        },
        {
            accessorKey: 'nfaRegistered',
            header: 'NFRTR Registered',
            cell: ({ row }) =>
                row.original.nfaRegistered === null
                    ? '—'
                    : row.original.nfaRegistered
                      ? 'Yes'
                      : 'No',
        },
        {
            accessorKey: 'nfaTransferStatus',
            header: 'Form 5 Status',
            cell: ({ row }) => {
                const v = row.original.nfaTransferStatus
                if (!v) return '—'
                return (
                    <Badge variant={STATUS_VARIANTS[v] ?? 'secondary'}>
                        {NFA_TRANSFER_STATUS_LABELS[v] ?? v}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'acquisitionDate',
            header: 'Acquisition Date',
            cell: ({ row }) => row.original.acquisitionDate ?? '—',
        },
        {
            accessorKey: 'acquisitionCost',
            header: 'Acquisition Cost',
            cell: ({ row }) => formatCurrency(row.original.acquisitionCost),
        },
        {
            accessorKey: 'dodValueDate',
            header: 'DOD Date',
            cell: ({ row }) => row.original.dodValueDate ?? '—',
        },
        {
            accessorKey: 'dodValueType',
            header: 'Valuation Type',
            cell: ({ row }) => row.original.dodValueType ?? '—',
        },
        {
            accessorKey: 'location',
            header: 'Storage Location',
            cell: ({ row }) => row.original.location ?? '—',
        },
        {
            accessorKey: 'insured',
            header: 'Insured',
            cell: ({ row }) => (row.original.insured ? 'Yes' : 'No'),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.status}
                    options={ASSET_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            status: asRecordStatus(val),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'notes',
            header: 'Notes',
            cell: ({ row }) => row.original.notes ?? '—',
        },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => row.original.createdAt,
        },
        {
            accessorKey: 'updatedAt',
            header: 'Updated',
            cell: ({ row }) => row.original.updatedAt,
        },
    ]

    const bulkActions: BulkAction<Firearm>[] = [
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            onClick: onBulkDelete,
        },
    ]

    return (
        <DataTable
            tableId="firearms"
            columns={columns}
            data={firearms}
            searchKey="name"
            searchPlaceholder="Search firearms..."
            isLoading={isLoading}
            emptyMessage="No firearms recorded. Click Add Firearm to create one."
            enablePagination
            enableRowSelection
            bulkActions={bulkActions}
            exportable
            exportResource="firearms"
            initialColumnVisibility={{
                description: false,
                barrelLength: false,
                action: false,
                isNfa: false,
                nfaClass: false,
                atfFormType: false,
                atfControlNumber: false,
                taxStampDate: false,
                nfrtrSerial: false,
                nfaRegistered: false,
                nfaTransferStatus: false,
                acquisitionDate: false,
                acquisitionCost: false,
                dodValueDate: false,
                dodValueType: false,
                location: false,
                insured: false,
                status: false,
                notes: false,
                createdAt: false,
                updatedAt: false,
            }}
            getRowDetail={(firearm) => (
                <FirearmRowDetail
                    firearm={firearm}
                    onUpdateNfaStatus={onUpdateNfaStatus}
                />
            )}
        />
    )
}
