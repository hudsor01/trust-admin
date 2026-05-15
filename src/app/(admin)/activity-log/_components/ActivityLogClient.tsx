'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { VirtualizedTable } from '@/components/virtualized-table'
import type { ActivityLog as ActivityLogType } from '@/db/schema'
import { trpc } from '@/lib/trpc'
import { formatDate } from '@/utils/formatters'

const ACTION_LABELS: Record<string, string> = {
    INSERT: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    INSERT: <Plus className="h-3 w-3" />,
    UPDATE: <Pencil className="h-3 w-3" />,
    DELETE: <Trash2 className="h-3 w-3" />,
}

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> =
    {
        INSERT: 'default',
        UPDATE: 'secondary',
        DELETE: 'destructive',
    }

export function ActivityLogClient() {
    const { data: logs = [], isLoading } = trpc.activityLog.list.useQuery()
    const [actionFilter, setActionFilter] = useState<string>('all')
    const [tableFilter, setTableFilter] = useState<string>('all')
    const [selectedLog, setSelectedLog] = useState<ActivityLogType | null>(null)

    const tableNames = useMemo(() => {
        const names = new Set(logs.map((log) => log.tableName))
        return Array.from(names).sort()
    }, [logs])

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesAction =
                actionFilter === 'all' || log.action === actionFilter
            const matchesTable =
                tableFilter === 'all' || log.tableName === tableFilter
            return matchesAction && matchesTable
        })
    }, [logs, actionFilter, tableFilter])

    const stats = useMemo(() => {
        return {
            total: logs.length,
            inserts: logs.filter((l) => l.action === 'INSERT').length,
            updates: logs.filter((l) => l.action === 'UPDATE').length,
            deletes: logs.filter((l) => l.action === 'DELETE').length,
        }
    }, [logs])

    const formatJson = (data: Record<string, unknown> | null) => {
        if (!data) return 'null'
        return JSON.stringify(data, null, 2)
    }

    const columns: ColumnDef<ActivityLogType>[] = useMemo(
        () => [
            {
                accessorKey: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Timestamp" />
                ),
                cell: ({ row }) => (
                    <span className="text-sm">
                        {formatDate(row.original.createdAt)}
                    </span>
                ),
            },
            {
                accessorKey: 'action',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Action" />
                ),
                cell: ({ row }) => (
                    <Badge
                        variant={ACTION_VARIANTS[row.original.action]}
                        className="gap-1"
                    >
                        {ACTION_ICONS[row.original.action]}
                        {ACTION_LABELS[row.original.action] ||
                            row.original.action}
                    </Badge>
                ),
            },
            {
                accessorKey: 'tableName',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Table" />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.tableName}
                    </span>
                ),
            },
            {
                accessorKey: 'recordId',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Record ID" />
                ),
                cell: ({ row }) => (
                    <span className="font-mono text-sm text-muted-foreground">
                        {row.original.recordId.length > 12
                            ? `${row.original.recordId.slice(0, 12)}...`
                            : row.original.recordId}
                    </span>
                ),
            },
            {
                id: 'details',
                header: 'Details',
                cell: ({ row }) => (
                    <button
                        onClick={() => setSelectedLog(row.original)}
                        className="text-sm text-primary hover:underline"
                    >
                        View Changes
                    </button>
                ),
            },
        ],
        [],
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Activity Log
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Audit trail of all database changes
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Changes
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            audit log entries
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Inserts
                        </CardTitle>
                        <Plus className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.inserts}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            records created
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Updates
                        </CardTitle>
                        <Pencil className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.updates}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            records modified
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Deletes
                        </CardTitle>
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.deletes}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            records removed
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4">
                <div className="w-48">
                    <Select
                        value={actionFilter}
                        onValueChange={setActionFilter}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="INSERT">Insert</SelectItem>
                            <SelectItem value="UPDATE">Update</SelectItem>
                            <SelectItem value="DELETE">Delete</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-64">
                    <Select value={tableFilter} onValueChange={setTableFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by table" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tables</SelectItem>
                            {tableNames.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <VirtualizedTable
                tableId="activity-log"
                columns={columns}
                data={filteredLogs}
                isLoading={isLoading}
                emptyMessage="No activity log entries found."
                maxHeight={500}
                rowHeight={48}
            />

            <Dialog
                open={!!selectedLog}
                onOpenChange={() => setSelectedLog(null)}
            >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedLog && (
                                <>
                                    <Badge
                                        variant={
                                            ACTION_VARIANTS[selectedLog?.action]
                                        }
                                    >
                                        {ACTION_LABELS[selectedLog?.action]}
                                    </Badge>
                                    {selectedLog?.tableName}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Activity log entry details
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Timestamp
                                    </p>
                                    <p>{formatDate(selectedLog?.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Record ID
                                    </p>
                                    <p className="font-mono">
                                        {selectedLog?.recordId}
                                    </p>
                                </div>
                                {selectedLog?.changedBy && (
                                    <div>
                                        <p className="text-muted-foreground">
                                            Changed By
                                        </p>
                                        <p>{selectedLog?.changedBy}</p>
                                    </div>
                                )}
                            </div>

                            {selectedLog?.oldValues && (
                                <div>
                                    <p className="text-sm font-medium mb-2 text-muted-foreground">
                                        Previous Values
                                    </p>
                                    <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto">
                                        {formatJson(
                                            selectedLog?.oldValues as Record<
                                                string,
                                                unknown
                                            >,
                                        )}
                                    </pre>
                                </div>
                            )}

                            {selectedLog?.newValues && (
                                <div>
                                    <p className="text-sm font-medium mb-2 text-muted-foreground">
                                        New Values
                                    </p>
                                    <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto">
                                        {formatJson(
                                            selectedLog?.newValues as Record<
                                                string,
                                                unknown
                                            >,
                                        )}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
