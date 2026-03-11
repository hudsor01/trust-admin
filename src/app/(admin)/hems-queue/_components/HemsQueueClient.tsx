'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    Loader2,
    XCircle,
} from 'lucide-react'
import { useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { HemsRequest } from '@/db/schema'
import { STATUS_VARIANTS } from '@/lib/constants'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency, formatDate } from '@/utils/formatters'

type HemsRequestWithBeneficiary = HemsRequest & {
    beneficiary: {
        firstName: string
        lastName: string
        email?: string | null
        sharePercent?: number | null
    }
}

const CATEGORY_LABELS: Record<string, string> = {
    HEALTH: 'Health',
    EDUCATION: 'Education',
    MAINTENANCE: 'Maintenance',
    SUPPORT: 'Support',
    WITHDRAWAL: 'Withdrawal',
    OTHER: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    DENIED: 'Denied',
    DISTRIBUTED: 'Distributed',
    CANCELLED: 'Cancelled',
}

export function HemsQueueClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id

    const { data: requests = [], isLoading: requestsLoading } =
        trpc.hemsRequest.listWithBeneficiary.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const requestsWithBeneficiary =
        requests as unknown as HemsRequestWithBeneficiary[]

    const [optimisticRequests] = useOptimistic(
        requestsWithBeneficiary,
        (
            current,
            update: {
                id: number
                status: HemsRequest['status']
                approvedAmount?: string
            },
        ) =>
            current.map((r) =>
                r.id === update.id
                    ? {
                          ...r,
                          status: update.status,
                          approvedAmount:
                              update.approvedAmount ?? r.amountRequested,
                      }
                    : r,
            ),
    )

    const approveRequestMutation = trpc.hemsRequest.approve.useMutation({
        onSuccess: () => utils.hemsRequest.listWithBeneficiary.invalidate(),
    })

    const denyRequestMutation = trpc.hemsRequest.deny.useMutation({
        onSuccess: () => utils.hemsRequest.listWithBeneficiary.invalidate(),
    })

    const cancelRequestMutation = trpc.hemsRequest.cancel.useMutation({
        onSuccess: () => {
            utils.hemsRequest.listWithBeneficiary.invalidate()
            toast.success('Request cancelled')
        },
        onError: () => {
            toast.error('Failed to cancel request')
        },
    })

    const loading = requestsLoading
    const [activeTab, setActiveTab] = useState('pending')

    const [reviewingRequest, setReviewingRequest] =
        useState<HemsRequestWithBeneficiary | null>(null)
    const [approvedAmount, setApprovedAmount] = useState('')
    const [reviewNotes, setReviewNotes] = useState('')
    const [distributionType, setDistributionType] = useState<
        | 'INCOME'
        | 'PRINCIPAL'
        | 'CAPITAL_GAIN'
        | 'EXPENSE_REIMBURSEMENT'
        | 'OTHER'
    >('INCOME')
    const [submitting, setSubmitting] = useState(false)
    const [cancelTarget, setCancelTarget] =
        useState<HemsRequestWithBeneficiary | null>(null)

    const pendingRequests = useMemo(
        () => optimisticRequests.filter((r) => r.status === 'PENDING'),
        [optimisticRequests],
    )
    const reviewedRequests = useMemo(
        () => optimisticRequests.filter((r) => r.status !== 'PENDING'),
        [optimisticRequests],
    )

    const displayedRequests =
        activeTab === 'pending' ? pendingRequests : reviewedRequests

    const columns: ColumnDef<HemsRequestWithBeneficiary>[] = [
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            id: 'beneficiary',
            header: 'Beneficiary',
            cell: ({ row }) => {
                const beneficiary = row.original.beneficiary
                if (!beneficiary) {
                    return (
                        <span className="text-muted-foreground">Unknown</span>
                    )
                }
                return (
                    <div>
                        <p className="font-medium">
                            {beneficiary.firstName ?? ''}{' '}
                            {beneficiary.lastName ?? ''}
                        </p>
                        {beneficiary.email && (
                            <p className="text-xs text-muted-foreground">
                                {beneficiary.email}
                            </p>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'category',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Category" />
            ),
            cell: ({ row }) => (
                <Badge variant="outline">
                    {CATEGORY_LABELS[row.original.category] ||
                        row.original.category}
                </Badge>
            ),
        },
        {
            accessorKey: 'amountRequested',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Amount" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">
                    {formatCurrency(row.original.amountRequested)}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => (
                <Badge
                    variant={
                        STATUS_VARIANTS[row.original.status] || 'secondary'
                    }
                >
                    {STATUS_LABELS[row.original.status] || row.original.status}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) =>
                row.original.status === 'PENDING' ? (
                    <Button size="sm" onClick={() => openReview(row.original)}>
                        Review
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReview(row.original)}
                    >
                        View
                    </Button>
                ),
        },
    ]

    const openReview = (request: HemsRequestWithBeneficiary) => {
        setReviewingRequest(request)
        setApprovedAmount(request.amountRequested)
        setReviewNotes('')
        setDistributionType('INCOME')
    }

    const handleApprove = async () => {
        if (!reviewingRequest) return
        setSubmitting(true)
        try {
            await approveRequestMutation.mutateAsync({
                id: reviewingRequest.id,
                entityId: entityId!,
                approvedAmount,
                reviewNotes,
                distributionType,
            })
            setReviewingRequest(null)
        } catch {
            toast.error('Failed to approve request')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeny = async () => {
        if (!reviewingRequest) return
        setSubmitting(true)
        try {
            await denyRequestMutation.mutateAsync({
                id: reviewingRequest.id,
                entityId: entityId!,
                reviewNotes,
            })
            setReviewingRequest(null)
        } catch {
            toast.error('Failed to deny request')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    HEMS Requests
                </h2>
                <p className="text-sm text-muted-foreground">
                    Review and approve beneficiary distribution requests
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending Review
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {pendingRequests.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {pendingRequests.length === 1
                                ? 'request'
                                : 'requests'}{' '}
                            awaiting decision
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Requested
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(
                                sumStrings(
                                    pendingRequests.map(
                                        (r) => r.amountRequested,
                                    ),
                                ),
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            pending approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This Month
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                optimisticRequests.filter(
                                    (r) =>
                                        r.status === 'APPROVED' ||
                                        r.status === 'DISTRIBUTED',
                                ).length
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            approved
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Pending ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="reviewed" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Reviewed ({reviewedRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : displayedRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    {activeTab === 'pending'
                                        ? 'No pending requests to review.'
                                        : 'No reviewed requests yet.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DataTable
                            data={displayedRequests}
                            columns={columns}
                            searchKey="category"
                            searchPlaceholder="Filter by category..."
                            emptyMessage="No requests found."
                            enableColumnVisibility={true}
                            enablePagination={true}
                        />
                    )}
                </TabsContent>
            </Tabs>

            <Dialog
                open={!!reviewingRequest}
                onOpenChange={() => setReviewingRequest(null)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {reviewingRequest?.status === 'PENDING'
                                ? 'Review Request'
                                : 'Request Details'}
                        </DialogTitle>
                        <DialogDescription>
                            {reviewingRequest?.beneficiary?.firstName ??
                                'Unknown'}{' '}
                            {reviewingRequest?.beneficiary?.lastName ?? ''} -{' '}
                            {CATEGORY_LABELS[
                                reviewingRequest?.category || ''
                            ] || reviewingRequest?.category}
                        </DialogDescription>
                    </DialogHeader>

                    {reviewingRequest && (
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Requested Amount
                                    </span>
                                    <span className="font-medium">
                                        {formatCurrency(
                                            reviewingRequest.amountRequested,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Submitted
                                    </span>
                                    <span className="text-sm">
                                        {formatDate(reviewingRequest.createdAt)}
                                    </span>
                                </div>
                                {reviewingRequest.beneficiary?.sharePercent && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Share %
                                        </span>
                                        <span className="text-sm">
                                            {
                                                reviewingRequest.beneficiary
                                                    ?.sharePercent
                                            }
                                            %
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm text-muted-foreground">
                                    Justification
                                </Label>
                                <p className="mt-1 text-sm bg-muted/50 rounded-lg p-3">
                                    {reviewingRequest.justification}
                                </p>
                            </div>

                            {reviewingRequest.status !== 'PENDING' && (
                                <div className="rounded-lg border p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Decision
                                        </span>
                                        <Badge
                                            variant={
                                                STATUS_VARIANTS[
                                                    reviewingRequest.status
                                                ] || 'secondary'
                                            }
                                        >
                                            {
                                                STATUS_LABELS[
                                                    reviewingRequest.status
                                                ]
                                            }
                                        </Badge>
                                    </div>
                                    {reviewingRequest.approvedAmount && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Approved Amount
                                            </span>
                                            <span className="font-medium">
                                                {formatCurrency(
                                                    reviewingRequest.approvedAmount,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {reviewingRequest.reviewedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Reviewed
                                            </span>
                                            <span className="text-sm">
                                                {formatDate(
                                                    reviewingRequest.reviewedAt,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {reviewingRequest.reviewNotes && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">
                                                Notes
                                            </span>
                                            <p className="mt-1 text-sm">
                                                {reviewingRequest.reviewNotes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {reviewingRequest.status === 'PENDING' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="approvedAmount">
                                            Approved Amount
                                        </Label>
                                        <Input
                                            id="approvedAmount"
                                            type="number"
                                            step="0.01"
                                            value={approvedAmount}
                                            onChange={(e) =>
                                                setApprovedAmount(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Enter approved amount"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            May differ from requested amount
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="distributionType">
                                            Distribution Source
                                        </Label>
                                        <Select
                                            value={distributionType}
                                            onValueChange={(v) =>
                                                setDistributionType(
                                                    v as typeof distributionType,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="distributionType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INCOME">
                                                    Income
                                                </SelectItem>
                                                <SelectItem value="PRINCIPAL">
                                                    Principal
                                                </SelectItem>
                                                <SelectItem value="CAPITAL_GAIN">
                                                    Capital Gain
                                                </SelectItem>
                                                <SelectItem value="EXPENSE_REIMBURSEMENT">
                                                    Expense Reimbursement
                                                </SelectItem>
                                                <SelectItem value="OTHER">
                                                    Other
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Texas Property Code requires
                                            tracking income vs. principal
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reviewNotes">
                                            Notes (optional)
                                        </Label>
                                        <Textarea
                                            id="reviewNotes"
                                            value={reviewNotes}
                                            onChange={(e) =>
                                                setReviewNotes(e.target.value)
                                            }
                                            placeholder="Add any notes about this decision..."
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {reviewingRequest?.status === 'PENDING' ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        const target = reviewingRequest
                                        setReviewingRequest(null)
                                        setCancelTarget(target)
                                    }}
                                    disabled={submitting}
                                    className="gap-2 text-destructive hover:text-destructive"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Cancel Request
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDeny}
                                    disabled={submitting}
                                    className="gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Deny
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    disabled={submitting}
                                    className="gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    Approve
                                </Button>
                            </>
                        ) : (
                            <>
                                {reviewingRequest?.status !== 'CANCELLED' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            const target = reviewingRequest
                                            setReviewingRequest(null)
                                            setCancelTarget(target ?? null)
                                        }}
                                        className="gap-2 text-destructive hover:text-destructive"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Cancel Request
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setReviewingRequest(null)}
                                >
                                    Close
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!cancelTarget}
                onOpenChange={() => setCancelTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel HEMS Request?</DialogTitle>
                        <DialogDescription>
                            {cancelTarget?.status === 'APPROVED' ||
                            cancelTarget?.status === 'DISTRIBUTED'
                                ? 'This request has already been processed. The linked distribution will NOT be affected. Only the HEMS request status will change to Cancelled.'
                                : 'This will cancel the HEMS request. This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelTarget(null)}
                        >
                            Keep Request
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!cancelTarget) return
                                await cancelRequestMutation.mutateAsync({
                                    id: cancelTarget.id,
                                    entityId: entityId!,
                                    reviewNotes:
                                        cancelTarget.status !== 'PENDING'
                                            ? `Admin cancelled (was ${cancelTarget.status})`
                                            : undefined,
                                })
                                setCancelTarget(null)
                            }}
                            disabled={cancelRequestMutation.isPending}
                        >
                            {cancelRequestMutation.isPending
                                ? 'Cancelling...'
                                : 'Cancel Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
