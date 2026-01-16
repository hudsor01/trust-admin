'use client'

/**
 * HEMS Request Queue
 *
 * Admin page for reviewing and approving/denying HEMS requests from beneficiaries.
 */

import {
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    Loader2,
    XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { type ColumnDef, DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useEntityFilter } from '@/hooks/use-entity-filter'
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

export default function HemsQueuePage() {
    const utils = trpc.useUtils()

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    // For hems-queue, empty string means "all entities"
    const selectedEntity = entityId || null

    const { data: requests = [], isLoading: requestsLoading } =
        trpc.hemsRequest.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: selectedEntity !== 'all' && !!selectedEntity },
        )

    // Cast to include beneficiary data (API returns joined data)
    const requestsWithBeneficiary =
        requests as unknown as HemsRequestWithBeneficiary[]

    const approveRequestMutation = trpc.hemsRequest.approve.useMutation({
        onSuccess: () => utils.hemsRequest.list.invalidate(),
    })

    const denyRequestMutation = trpc.hemsRequest.deny.useMutation({
        onSuccess: () => utils.hemsRequest.list.invalidate(),
    })

    const loading = entitiesLoading || requestsLoading
    const [activeTab, setActiveTab] = useState('pending')

    const [reviewingRequest, setReviewingRequest] =
        useState<HemsRequestWithBeneficiary | null>(null)
    const [approvedAmount, setApprovedAmount] = useState('')
    const [reviewNotes, setReviewNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const pendingRequests = useMemo(
        () => requestsWithBeneficiary.filter((r) => r.status === 'PENDING'),
        [requestsWithBeneficiary],
    )
    const reviewedRequests = useMemo(
        () => requestsWithBeneficiary.filter((r) => r.status !== 'PENDING'),
        [requestsWithBeneficiary],
    )

    const displayedRequests =
        activeTab === 'pending' ? pendingRequests : reviewedRequests

    const columns: ColumnDef<HemsRequestWithBeneficiary>[] = [
        {
            key: 'createdAt',
            header: 'Date',
            render: (request) => (
                <span className="text-sm">{formatDate(request.createdAt)}</span>
            ),
        },
        {
            key: 'beneficiary',
            header: 'Beneficiary',
            render: (request) => (
                <div>
                    <p className="font-medium">
                        {request.beneficiary.firstName}{' '}
                        {request.beneficiary.lastName}
                    </p>
                    {request.beneficiary.email && (
                        <p className="text-xs text-muted-foreground">
                            {request.beneficiary.email}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            render: (request) => (
                <Badge variant="outline">
                    {CATEGORY_LABELS[request.category] || request.category}
                </Badge>
            ),
        },
        {
            key: 'amountRequested',
            header: 'Amount',
            render: (request) => (
                <span className="font-medium">
                    {formatCurrency(request.amountRequested)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (request) => (
                <Badge variant={STATUS_VARIANTS[request.status] || 'secondary'}>
                    {STATUS_LABELS[request.status] || request.status}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (request) =>
                request.status === 'PENDING' ? (
                    <Button size="sm" onClick={() => openReview(request)}>
                        Review
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReview(request)}
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
    }

    const handleApprove = async () => {
        if (!reviewingRequest) return
        setSubmitting(true)
        try {
            await approveRequestMutation.mutateAsync({
                id: reviewingRequest.id,
                approvedAmount,
                reviewNotes,
            })
            setReviewingRequest(null)
        } catch (err) {
            console.error('Failed to approve request:', err)
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
                reviewNotes,
            })
            setReviewingRequest(null)
        } catch (err) {
            console.error('Failed to deny request:', err)
        } finally {
            setSubmitting(false)
        }
    }

    if (entitiesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        HEMS Requests
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Review and approve beneficiary distribution requests
                    </p>
                </div>
                <Select
                    value={entityId || 'all'}
                    onValueChange={(val) => {
                        setEntityId(val === 'all' ? null : val)
                    }}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
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
                                requestsWithBeneficiary.filter(
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

            {/* Tabs */}
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
                        <DataTable data={displayedRequests} columns={columns} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
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
                            {reviewingRequest?.beneficiary.firstName}{' '}
                            {reviewingRequest?.beneficiary.lastName} -{' '}
                            {CATEGORY_LABELS[
                                reviewingRequest?.category || ''
                            ] || reviewingRequest?.category}
                        </DialogDescription>
                    </DialogHeader>

                    {reviewingRequest && (
                        <div className="space-y-4">
                            {/* Request Details */}
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
                                {reviewingRequest.beneficiary.sharePercent && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Share %
                                        </span>
                                        <span className="text-sm">
                                            {
                                                reviewingRequest.beneficiary
                                                    .sharePercent
                                            }
                                            %
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Justification */}
                            <div>
                                <Label className="text-sm text-muted-foreground">
                                    Justification
                                </Label>
                                <p className="mt-1 text-sm bg-muted/50 rounded-lg p-3">
                                    {reviewingRequest.justification}
                                </p>
                            </div>

                            {/* If already reviewed, show review info */}
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

                            {/* Review Form (only for pending) */}
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
                            <Button
                                variant="outline"
                                onClick={() => setReviewingRequest(null)}
                            >
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
