'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { InsurancePolicy } from '@/db/schema'
import { STATUS_VARIANTS } from '@/lib/constants'
import {
    asInsurancePolicyType,
    asPremiumFrequency,
    asRecordStatus,
    enumToOptions,
    INSURANCE_POLICY_TYPE_VALUES,
    PREMIUM_FREQUENCY_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

const POLICY_TYPE_OPTIONS = enumToOptions(INSURANCE_POLICY_TYPE_VALUES)
const FREQUENCY_OPTIONS = enumToOptions(PREMIUM_FREQUENCY_VALUES)
export const POLICY_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(v),
)

interface InsuranceTableProps {
    policies: InsurancePolicy[]
    isLoading: boolean
    onEdit: (policy: InsurancePolicy) => void
    onDelete: (policy: InsurancePolicy) => void
    onInlineUpdate: (
        id: number,
        updates: Partial<InsurancePolicy>,
    ) => Promise<void>
}

export function InsuranceTable({
    policies,
    isLoading,
    onEdit,
    onDelete,
    onInlineUpdate,
}: InsuranceTableProps) {
    const columns: ColumnDef<InsurancePolicy>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.name}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            name: (val ?? '').trim() || row.original.name,
                        })
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
            accessorKey: 'description',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Description" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.description}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, { description: val })
                    }
                    placeholder="Add description"
                />
            ),
            filterFn: 'includesString',
        },
        {
            id: 'policy',
            accessorFn: (row) =>
                `${row.carrier} ${row.policyNumber} ${row.policyType}`.toLowerCase(),
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Carrier / Policy #"
                />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.carrier}</p>
                    <p className="text-xs text-muted-foreground">
                        {row.original.policyNumber}
                    </p>
                </div>
            ),
            filterFn: 'includesString',
        },
        {
            accessorKey: 'policyType',
            header: 'Type',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.policyType}
                    options={POLICY_TYPE_OPTIONS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            policyType: asInsurancePolicyType(val),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'coverageAmount',
            header: 'Coverage',
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.coverageAmount}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            coverageAmount: val,
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'premium',
            header: 'Premium',
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.premium}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            premium: val,
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'premiumFrequency',
            header: 'Frequency',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.premiumFrequency ?? ''}
                    options={FREQUENCY_OPTIONS}
                    variants={STATUS_VARIANTS}
                    onSave={(val) =>
                        onInlineUpdate(row.original.id, {
                            premiumFrequency: asPremiumFrequency(val || null),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.status}
                    options={POLICY_STATUS}
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
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            data={policies}
            searchKey="policy"
            searchPlaceholder="Search policies..."
            isLoading={isLoading}
            emptyMessage="No insurance policies. Click Add Policy to create one."
            enablePagination={true}
        />
    )
}
