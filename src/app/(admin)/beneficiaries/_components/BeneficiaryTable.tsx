'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Check, Circle, Eye } from 'lucide-react'
import {
    EditablePercentCell,
    EditableSelectCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Beneficiary } from '@/db/schema'
import { sumStrings } from '@/lib/money'
import {
    asDistributionStandard,
    DISTRIBUTION_STANDARD_VALUES,
    enumToOptions,
} from '@/lib/type-utils'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatters'
import {
    type BeneficiaryWithDistributions,
    calculateEligibility,
} from './types'

const DISTRIBUTION_STANDARDS = enumToOptions(DISTRIBUTION_STANDARD_VALUES)

interface BeneficiaryTableProps {
    beneficiaries: BeneficiaryWithDistributions[]
    isLoading: boolean
    onViewDetails: (beneficiary: BeneficiaryWithDistributions) => void
    onUpdateBeneficiary: (
        id: number,
        data: Partial<Beneficiary>,
    ) => Promise<unknown>
}

export function BeneficiaryTable({
    beneficiaries,
    isLoading,
    onViewDetails,
    onUpdateBeneficiary,
}: BeneficiaryTableProps) {
    const columns: ColumnDef<BeneficiaryWithDistributions>[] = [
        {
            accessorKey: 'firstName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'font-medium',
                            row.original.deceasedDate &&
                                'text-muted-foreground line-through',
                        )}
                    >
                        {row.original.firstName} {row.original.lastName}
                    </span>
                    {row.original.deceasedDate && (
                        <Badge
                            variant="outline"
                            className="text-xs border-destructive/50 text-destructive"
                        >
                            Deceased
                        </Badge>
                    )}
                </div>
            ),
            // Searches full name, not just firstName accessor
            filterFn: (row, _columnId, filterValue) => {
                const fullName =
                    `${row.original.firstName} ${row.original.lastName}`.toLowerCase()
                return fullName.includes(filterValue.toLowerCase())
            },
        },
        {
            accessorKey: 'sharePercent',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Share %" />
            ),
            cell: ({ row }) => (
                <EditablePercentCell
                    value={row.original.sharePercent}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            sharePercent: val,
                        })
                    }}
                />
            ),
        },
        {
            id: 'eligibility',
            header: 'Eligibility',
            cell: ({ row }) => {
                const eligibility = calculateEligibility(row.original.dob)
                return (
                    <Badge
                        variant={
                            eligibility.status === 'full'
                                ? 'default'
                                : eligibility.status === 'partial'
                                  ? 'secondary'
                                  : 'outline'
                        }
                        className={cn(
                            eligibility.status === 'full' &&
                                'bg-success hover:bg-success/90',
                            eligibility.status === 'partial' &&
                                'bg-amber-500/20 text-amber-700 border-amber-500/30',
                            eligibility.status === 'none' &&
                                !row.original.dob &&
                                'text-muted-foreground',
                        )}
                        title={
                            eligibility.nextMilestone
                                ? `${eligibility.nextMilestone.percent}% at age ${eligibility.nextMilestone.age}`
                                : eligibility.status === 'full'
                                  ? 'Fully vested for withdrawal'
                                  : 'Configure birthday in Settings'
                        }
                    >
                        {eligibility.label}
                    </Badge>
                )
            },
        },
        {
            accessorKey: 'distributionStandard',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Standard" />
            ),
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.distributionStandard || 'HEMS'}
                    options={DISTRIBUTION_STANDARDS}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            distributionStandard: asDistributionStandard(val),
                        })
                    }}
                />
            ),
        },
        {
            accessorKey: 'informed',
            header: 'Notified',
            cell: ({ row }) => (
                <Button
                    variant={row.original.informed ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                        'h-7 w-7',
                        row.original.informed &&
                            'bg-success hover:bg-success/90',
                    )}
                    onClick={() =>
                        onUpdateBeneficiary(row.original.id, {
                            informed: !row.original.informed,
                        })
                    }
                >
                    {row.original.informed ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Circle className="h-3.5 w-3.5" />
                    )}
                </Button>
            ),
        },
        {
            accessorKey: 'releaseSigned',
            header: 'Release',
            cell: ({ row }) => (
                <Button
                    variant={row.original.releaseSigned ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                        'h-7 w-7',
                        row.original.releaseSigned &&
                            'bg-success hover:bg-success/90',
                    )}
                    onClick={() =>
                        onUpdateBeneficiary(row.original.id, {
                            releaseSigned: !row.original.releaseSigned,
                        })
                    }
                >
                    {row.original.releaseSigned ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Circle className="h-3.5 w-3.5" />
                    )}
                </Button>
            ),
        },
        {
            id: 'totalDistributed',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Distributed" />
            ),
            cell: ({ row }) => {
                const totalDist = sumStrings(
                    (row.original.distributions || []).map((d) => d.amount),
                )
                return (
                    <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(totalDist)}
                    </span>
                )
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewDetails(row.original)}
                    title="View details"
                >
                    <Eye className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    return (
        <Card>
            <CardContent className="pt-6">
                <DataTable
                    data={beneficiaries}
                    columns={columns}
                    searchKey="firstName"
                    searchPlaceholder="Filter by name..."
                    isLoading={isLoading}
                    emptyMessage="No beneficiaries found"
                    enableColumnVisibility={true}
                    enablePagination={true}
                />
            </CardContent>
        </Card>
    )
}
