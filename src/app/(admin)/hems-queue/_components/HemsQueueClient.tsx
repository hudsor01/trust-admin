'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { inferRouterOutputs } from '@trpc/server'
import {
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    Inbox,
    Loader2,
    XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { KpiStrip } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { STATUS_VARIANTS } from '@/lib/constants'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import type { AppRouter } from '@/server/trpc/router'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { HemsQueueBoard } from './HemsQueueBoard'

type RouterOutputs = inferRouterOutputs<AppRouter>
type HemsRequestWithBeneficiary =
    RouterOutputs['hemsRequest']['listWithBeneficiary'][number]

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

// CSV-export value mapper for the display-only `beneficiary` column — it has
// no `accessorKey`, so `row.getValue` returns `undefined` and the exporter
// must derive the name from `row.original.beneficiary` here.
const hemsQueueExportFormatters: Record<
    string,
    (value: unknown, row: unknown) => string
> = {
    beneficiary: (_v, row) => {
        const beneficiary = (row as HemsRequestWithBeneficiary).beneficiary
        if (!beneficiary) return 'Unknown'
        const name = `${beneficiary.firstName ?? ''} ${
            beneficiary.lastName ?? ''
        }`.trim()
        return beneficiary.email ? `${name} (${beneficiary.email})` : name
    },
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

    // All four mutations refresh the UI via listWithBeneficiary.invalidate();
    // there is no optimistic path, so the query data is used directly.
    const requestsWithBeneficiary = requests

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
    const [activeTab, setActiveTab] = useState<'board' | 'table'>('board')
    const [tableSubTab, setTableSubTab] = useState<'pending' | 'reviewed'>(
        'pending',
    )

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
        () => requestsWithBeneficiary.filter((r) => r.status === 'PENDING'),
        [requestsWithBeneficiary],
    )
    const reviewedRequests = useMemo(
        () => requestsWithBeneficiary.filter((r) => r.status !== 'PENDING'),
        [requestsWithBeneficiary],
    )

    const displayedRequests =
        tableSubTab === 'pending' ? pendingRequests : reviewedRequests

    const approvedCount = useMemo(
        () =>
            requestsWithBeneficiary.filter(
                (r) => r.status === 'APPROVED' || r.status === 'DISTRIBUTED',
            ).length,
        [requestsWithBeneficiary],
    )

    const totalRequestedAmount = useMemo(
        () =>
            formatCurrency(
                sumStrings(pendingRequests.map((r) => r.amountRequested)),
            ),
        [pendingRequests],
    )

    const kpiItems = useMemo(
        () => [
            {
                label: 'Pending',
                value: pendingRequests.length,
                icon: Clock,
            },
            {
                label: 'Approved + Distributed',
                value: approvedCount,
                icon: CheckCircle,
            },
            {
                label: 'Total Requested',
                value: totalRequestedAmount,
                icon: DollarSign,
            },
            {
                label: 'Reviewed',
                value: reviewedRequests.length,
                icon: FileText,
            },
        ],
        [
            pendingRequests.length,
            approvedCount,
            totalRequestedAmount,
            reviewedRequests.length,
        ],
    )

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
            meta: { excludeFromExport: true },
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
            <PageHeader
                title="HEMS Queue"
                description="Drag pending requests to approve, then to distributed when paid out."
            />

            <KpiStrip data={kpiItems} isLoading={loading} />

            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
                <TabsList>
                    <TabsTrigger value="board" className="gap-2">
                        <Inbox className="h-4 w-4" />
                        Board
                    </TabsTrigger>
                    <TabsTrigger value="table" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Table
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="board" className="mt-4">
                    {entityId ? (
                        <HemsQueueBoard entityId={entityId} />
                    ) : (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="table" className="mt-4">
                    <Tabs
                        value={tableSubTab}
                        onValueChange={(v) =>
                            setTableSubTab(v as typeof tableSubTab)
                        }
                    >
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

                        <TabsContent value={tableSubTab} className="mt-4">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : displayedRequests.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12">
                                        <p className="text-center text-muted-foreground">
                                            {tableSubTab === 'pending'
                                                ? 'No pending requests to review.'
                                                : 'No reviewed requests yet.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <DataTable
                                    tableId="hems-queue"
                                    data={displayedRequests}
                                    columns={columns}
                                    searchKey="category"
                                    searchPlaceholder="Filter by category..."
                                    emptyMessage="No requests found."
                                    enableColumnVisibility={true}
                                    enablePagination={true}
                                    exportable
                                    exportResource="hems-queue"
                                    exportFormatters={hemsQueueExportFormatters}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
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
