'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { Beneficiary, Distribution } from '@/db/schema'
import { formatCurrency, formatDate } from '@/utils/formatters'

/** Not a DB enum -- UI-only labels and descriptions for the four HEMS pillars. */
export const HEMS_CATEGORIES = [
    {
        value: 'HEALTH',
        label: 'Health',
        description: 'Medical expenses, insurance, treatments',
    },
    {
        value: 'EDUCATION',
        label: 'Education',
        description: 'Tuition, books, educational programs',
    },
    {
        value: 'MAINTENANCE',
        label: 'Maintenance',
        description: 'Living expenses, housing, utilities',
    },
    {
        value: 'SUPPORT',
        label: 'Support',
        description: 'General support and welfare',
    },
]

interface HemsTableProps {
    hemsDistributions: Distribution[]
    beneficiaries: Beneficiary[]
    isLoading: boolean
    onNewRequest: () => void
}

export function HemsTable({
    hemsDistributions,
    beneficiaries,
    isLoading,
    onNewRequest,
}: HemsTableProps) {
    const hemsColumns: ColumnDef<Distribution>[] = [
        {
            accessorKey: 'distributionDate',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => formatDate(row.original.distributionDate),
        },
        {
            accessorKey: 'beneficiaryId',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Beneficiary" />
            ),
            cell: ({ row }) => {
                const beneficiary = beneficiaries.find(
                    (b) => b.id === row.original.beneficiaryId,
                )
                return beneficiary
                    ? `${beneficiary.firstName} ${beneficiary.lastName}`
                    : '—'
            },
        },
        {
            accessorKey: 'hemsCategory',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Category" />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.hemsCategory}</Badge>
            ),
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Amount" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">
                    {formatCurrency(row.original.amount)}
                </span>
            ),
        },
        {
            accessorKey: 'hemsJustification',
            header: 'Justification',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.hemsJustification || '—'}
                </span>
            ),
        },
    ]

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg">
                            HEMS Distribution Request
                        </CardTitle>
                        <CardDescription>
                            Health, Education, Maintenance, and Support
                            distributions
                        </CardDescription>
                    </div>
                    <Button onClick={onNewRequest}>
                        <Plus className="mr-2 h-4 w-4" />
                        New HEMS Request
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {HEMS_CATEGORIES.map((cat) => (
                            <Card key={cat.value} className="bg-muted/50">
                                <CardContent className="p-4">
                                    <p className="font-medium">{cat.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {cat.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Recent HEMS Distributions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={hemsDistributions.slice(0, 10)}
                        columns={hemsColumns}
                        isLoading={isLoading}
                        emptyMessage="No HEMS distributions recorded"
                    />
                </CardContent>
            </Card>
        </>
    )
}
