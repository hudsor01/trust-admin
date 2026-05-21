'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import {
    EditablePercentCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Beneficiary } from '@/db/schema'
import { sumStrings } from '@/lib/money'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatters'
import {
    type BeneficiaryWithDistributions,
    calculateEligibility,
} from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d()+\-.\s]{7,20}$/
const STATE_RE = /^[A-Za-z]{2}$/
const ZIP_RE = /^\d{5}(-\d{4})?$/

function validateEmail(v: string): string | null {
    return EMAIL_RE.test(v) ? null : 'Invalid email format'
}
function validatePhone(v: string): string | null {
    return PHONE_RE.test(v) ? null : 'Invalid phone number'
}
function validateState(v: string): string | null {
    return STATE_RE.test(v) ? null : 'State must be a 2-letter code (e.g. TX)'
}
function validateZip(v: string): string | null {
    return ZIP_RE.test(v)
        ? null
        : 'Zip must be 5 digits (e.g. 75001 or 75001-1234)'
}

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
                                'bg-warning/20 text-warning border-warning/30',
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
            accessorKey: 'email',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Email" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.email}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            email: val,
                        })
                    }}
                    placeholder="Add email"
                    validate={validateEmail}
                />
            ),
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Phone" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.phone}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            phone: val,
                        })
                    }}
                    placeholder="Add phone"
                    validate={validatePhone}
                />
            ),
        },
        {
            accessorKey: 'streetAddress',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Street Address" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.streetAddress}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            streetAddress: val,
                        })
                    }}
                    placeholder="Add address"
                />
            ),
        },
        {
            accessorKey: 'city',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="City" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.city}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            city: val,
                        })
                    }}
                    placeholder="Add city"
                />
            ),
        },
        {
            accessorKey: 'state',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="State" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.state}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            state: val?.toUpperCase() ?? null,
                        })
                    }}
                    placeholder="Add state"
                    validate={validateState}
                />
            ),
        },
        {
            accessorKey: 'zip',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Zip" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.zip}
                    onSave={async (val) => {
                        await onUpdateBeneficiary(row.original.id, {
                            zip: val,
                        })
                    }}
                    placeholder="Add zip"
                    validate={validateZip}
                />
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
                    tableId="beneficiaries"
                    data={beneficiaries}
                    columns={columns}
                    searchKey="firstName"
                    searchPlaceholder="Filter by name..."
                    isLoading={isLoading}
                    emptyMessage="No beneficiaries found"
                    enableColumnVisibility={true}
                    enablePagination={true}
                    exportable
                    exportResource="beneficiaries"
                    initialColumnVisibility={{
                        streetAddress: false,
                        city: false,
                        state: false,
                        zip: false,
                    }}
                />
            </CardContent>
        </Card>
    )
}
