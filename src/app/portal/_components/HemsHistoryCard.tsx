'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { BadgeVariant } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { cancelHemsRequest } from '../_actions/cancelHemsRequest'

const HEMS_STATUS_BADGE: Record<
    string,
    { variant: BadgeVariant; label: string }
> = {
    PENDING: { variant: 'secondary', label: 'Pending' },
    APPROVED: { variant: 'default', label: 'Approved' },
    DENIED: { variant: 'destructive', label: 'Denied' },
    DISTRIBUTED: { variant: 'default', label: 'Distributed' },
    CANCELLED: { variant: 'outline', label: 'Cancelled' },
}

const CATEGORY_LABELS: Record<string, string> = {
    HEALTH: 'Health',
    EDUCATION: 'Education',
    MAINTENANCE: 'Maintenance',
    SUPPORT: 'Support',
}

interface HemsRequestItem {
    id: number
    category: string
    amountRequested: string
    status: string
    createdAt: string | null
}

interface HemsHistoryCardProps {
    requests: HemsRequestItem[]
    onCancelSuccess: () => void
}

export function HemsHistoryCard({
    requests,
    onCancelSuccess,
}: HemsHistoryCardProps) {
    const [cancelTarget, setCancelTarget] = useState<HemsRequestItem | null>(
        null,
    )

    const { dialogProps, confirm } = useConfirmDialog({
        title: 'Cancel Request?',
        description: cancelTarget
            ? `This will cancel your HEMS request for ${formatCurrency(cancelTarget.amountRequested)}. This cannot be undone.`
            : '',
        confirmText: 'Cancel Request',
        variant: 'destructive',
        onConfirm: async () => {
            if (!cancelTarget) return
            const result = await cancelHemsRequest(cancelTarget.id)
            if (result.success) {
                toast.success('Request cancelled')
                onCancelSuccess()
            } else {
                toast.error(result.error ?? 'Failed to cancel request')
            }
            setCancelTarget(null)
        },
        onCancel: () => setCancelTarget(null),
    })

    const handleCancelClick = (req: HemsRequestItem) => {
        setCancelTarget(req)
        confirm()
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        HEMS Request History
                    </CardTitle>
                    <CardDescription>
                        Track the status of your distribution requests
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            You haven't submitted any HEMS requests yet.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">
                                        Amount Requested
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => {
                                    const statusBadge = HEMS_STATUS_BADGE[
                                        req.status
                                    ] ?? {
                                        variant: 'outline' as const,
                                        label: req.status,
                                    }
                                    return (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                {formatDate(req.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {CATEGORY_LABELS[
                                                        req.category
                                                    ] ?? req.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(
                                                    req.amountRequested,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        statusBadge.variant
                                                    }
                                                >
                                                    {statusBadge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {req.status === 'PENDING' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() =>
                                                            handleCancelClick(
                                                                req,
                                                            )
                                                        }
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog {...dialogProps} />
        </>
    )
}
