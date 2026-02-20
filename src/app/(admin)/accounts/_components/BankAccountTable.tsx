'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
    EditableCurrencyCell,
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import type { BankAccount } from '@/db/schema'
import { STATUS_VARIANTS, TRANSFER_STATUS } from '@/lib/constants'
import { asRecordStatus, asTransferStatus } from '@/lib/type-utils'
import { formatCurrency } from '@/utils/formatters'
import { ACCOUNT_STATUS, BANK_ACCOUNT_TYPES, maskAccountNumber } from './constants'

interface BankAccountTableProps {
    bankAccounts: BankAccount[]
    totalBankValue: string
    selectedEntity: number | undefined
    onAdd: () => void
    onEdit: (account: BankAccount) => void
    onDelete: (id: number) => void
    onUpdate: (id: number, data: Partial<BankAccount>) => Promise<void>
}

export function BankAccountTable({
    bankAccounts,
    totalBankValue,
    selectedEntity,
    onAdd,
    onEdit,
    onDelete,
    onUpdate,
}: BankAccountTableProps) {
    const columns: ColumnDef<BankAccount>[] = [
        {
            accessorKey: 'institution',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Institution" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.institution}
                    onSave={async (val) => {
                        await onUpdate(row.original.id, {
                            institution: val as string,
                        })
                    }}
                />
            ),
        },
        {
            accessorKey: 'accountName',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Account Name" />
            ),
            cell: ({ row }) => (
                <EditableTextCell
                    value={row.original.accountName}
                    onSave={async (val) => {
                        await onUpdate(row.original.id, { accountName: val })
                    }}
                />
            ),
        },
        {
            accessorKey: 'accountType',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal">
                    {
                        BANK_ACCOUNT_TYPES.find(
                            (t) => t.value === row.original.accountType,
                        )?.label
                    }
                </Badge>
            ),
        },
        {
            accessorKey: 'accountNumber',
            header: 'Account #',
            cell: ({ row }) => (
                <code className="text-xs">
                    {maskAccountNumber(row.original.accountNumber || '')}
                </code>
            ),
        },
        {
            accessorKey: 'dodValue',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="DOD Balance" />
            ),
            cell: ({ row }) => (
                <EditableCurrencyCell
                    value={row.original.dodValue}
                    onSave={async (val) => {
                        await onUpdate(row.original.id, { dodValue: val })
                    }}
                />
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.status}
                    options={ACCOUNT_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={async (val) => {
                        await onUpdate(row.original.id, {
                            status: asRecordStatus(val),
                        })
                    }}
                />
            ),
        },
        {
            accessorKey: 'transferStatus',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Transfer" />
            ),
            cell: ({ row }) => (
                <EditableSelectCell
                    value={row.original.transferStatus}
                    options={TRANSFER_STATUS}
                    variants={STATUS_VARIANTS}
                    onSave={async (val) => {
                        await onUpdate(row.original.id, {
                            transferStatus: asTransferStatus(val),
                        })
                    }}
                />
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(row.original)}
                        title="Edit account"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.original.id)}
                        title="Delete account"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={onAdd} disabled={!selectedEntity}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={bankAccounts}
                searchKey="institution"
                searchPlaceholder="Filter by institution..."
                emptyMessage="No bank accounts found."
                enableColumnVisibility={true}
                enablePagination={true}
            />
        </div>
    )
}
