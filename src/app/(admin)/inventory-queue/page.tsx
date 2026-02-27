'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, Clock, Loader2, Package, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { PendingInventoryItem } from '@/db/schema'
import { trpc } from '@/lib/trpc'
import { formatCurrency, formatDate } from '@/utils/formatters'

const CATEGORY_LABELS: Record<string, string> = {
    JEWELRY: 'Jewelry',
    ART: 'Art / Decor',
    COLLECTIBLES: 'Collectibles',
    ELECTRONICS: 'Electronics',
    FURNITURE: 'Furniture',
    OTHER: 'Other',
}

const CONDITION_LABELS: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
}

const STATUS_VARIANTS: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    REJECTED: 'destructive',
}

export default function InventoryQueuePage() {
    const utils = trpc.useUtils()
    const entityId = 1

    const { data: items = [], isLoading: itemsLoading } =
        trpc.pendingInventoryItem.list.useQuery()

    const approveMutation = trpc.pendingInventoryItem.approve.useMutation({
        onSuccess: () => {
            utils.pendingInventoryItem.list.invalidate()
            setReviewingItem(null)
        },
    })

    const rejectMutation = trpc.pendingInventoryItem.reject.useMutation({
        onSuccess: () => {
            utils.pendingInventoryItem.list.invalidate()
            setReviewingItem(null)
        },
    })

    const loading = itemsLoading
    const [activeTab, setActiveTab] = useState('pending')
    const [reviewingItem, setReviewingItem] =
        useState<PendingInventoryItem | null>(null)
    const [reviewNotes, setReviewNotes] = useState('')

    const pendingItems = useMemo(
        () => items.filter((i) => i.status === 'PENDING'),
        [items],
    )
    const reviewedItems = useMemo(
        () => items.filter((i) => i.status !== 'PENDING'),
        [items],
    )

    const displayedItems =
        activeTab === 'pending' ? pendingItems : reviewedItems

    const columns: ColumnDef<PendingInventoryItem>[] = [
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Submitted" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Item" />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.name}</p>
                    {row.original.submitterName && (
                        <p className="text-xs text-muted-foreground">
                            by {row.original.submitterName}
                        </p>
                    )}
                </div>
            ),
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
            accessorKey: 'estimatedValue',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Est. Value" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.estimatedValue
                        ? formatCurrency(row.original.estimatedValue)
                        : '-'}
                </span>
            ),
        },
        {
            accessorKey: 'condition',
            header: 'Condition',
            cell: ({ row }) => (
                <span className="text-sm">
                    {CONDITION_LABELS[row.original.condition] ||
                        row.original.condition}
                </span>
            ),
        },
        {
            id: 'photos',
            header: 'Photos',
            cell: ({ row }) => {
                const photoCount = [
                    row.original.photoPath1,
                    row.original.photoPath2,
                    row.original.photoPath3,
                    row.original.photoPath4,
                    row.original.photoPath5,
                ].filter(Boolean).length
                return (
                    <span className="text-sm text-muted-foreground">
                        {photoCount > 0
                            ? `${photoCount} photo${photoCount > 1 ? 's' : ''}`
                            : '-'}
                    </span>
                )
            },
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
                    {row.original.status}
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

    const openReview = (item: PendingInventoryItem) => {
        setReviewingItem(item)
        setReviewNotes('')
    }

    const handleApprove = async () => {
        if (!reviewingItem) return
        await approveMutation.mutateAsync({
            id: reviewingItem.id,
            entityId,
            reviewNotes,
        })
    }

    const handleReject = async () => {
        if (!reviewingItem) return
        await rejectMutation.mutateAsync({
            id: reviewingItem.id,
            reviewNotes,
        })
    }

    const getPhotoUrls = (item: PendingInventoryItem) => {
        return [
            item.photoPath1,
            item.photoPath2,
            item.photoPath3,
            item.photoPath4,
            item.photoPath5,
        ].filter((url): url is string => Boolean(url))
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    Inventory Queue
                </h2>
                <p className="text-sm text-muted-foreground">
                    Review and approve submitted inventory items
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
                            {pendingItems.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {pendingItems.length === 1 ? 'item' : 'items'}{' '}
                            awaiting review
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Approved
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                items.filter((i) => i.status === 'APPROVED')
                                    .length
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            added to inventory
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Submitted
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{items.length}</div>
                        <p className="text-xs text-muted-foreground">
                            all time
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Pending ({pendingItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="reviewed" className="gap-2">
                        <Package className="h-4 w-4" />
                        Reviewed ({reviewedItems.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <DataTable
                        data={displayedItems}
                        columns={columns}
                        searchKey="name"
                        searchPlaceholder="Filter by name..."
                        isLoading={loading}
                        emptyMessage={
                            activeTab === 'pending'
                                ? 'No pending items to review.'
                                : 'No reviewed items yet.'
                        }
                        enableColumnVisibility={true}
                        enablePagination={true}
                    />
                </TabsContent>
            </Tabs>

            <Dialog
                open={!!reviewingItem}
                onOpenChange={() => setReviewingItem(null)}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {reviewingItem?.status === 'PENDING'
                                ? 'Review Item'
                                : 'Item Details'}
                        </DialogTitle>
                        <DialogDescription>
                            {reviewingItem?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {reviewingItem && (
                        <div className="space-y-4">
                            {getPhotoUrls(reviewingItem).length > 0 && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">
                                        Photos
                                    </Label>
                                    <div className="mt-2 grid grid-cols-5 gap-2">
                                        {getPhotoUrls(reviewingItem).map(
                                            (url, i) => (
                                                <div
                                                    key={i}
                                                    className="relative aspect-square"
                                                >
                                                    <Image
                                                        src={url}
                                                        alt={`Inventory photo ${i + 1}`}
                                                        fill
                                                        unoptimized
                                                        className="object-cover rounded border"
                                                    />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-lg border p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-muted-foreground">
                                            Category
                                        </span>
                                        <p className="font-medium">
                                            {CATEGORY_LABELS[
                                                reviewingItem.category
                                            ] || reviewingItem.category}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">
                                            Condition
                                        </span>
                                        <p className="font-medium">
                                            {CONDITION_LABELS[
                                                reviewingItem.condition
                                            ] || reviewingItem.condition}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">
                                            Est. Value
                                        </span>
                                        <p className="font-medium">
                                            {reviewingItem.estimatedValue
                                                ? formatCurrency(
                                                      reviewingItem.estimatedValue,
                                                  )
                                                : 'Not provided'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">
                                            AI Suggested
                                        </span>
                                        <p className="font-medium">
                                            {reviewingItem.aiSuggested ? (
                                                <Badge variant="outline">
                                                    {reviewingItem.aiConfidence}
                                                </Badge>
                                            ) : (
                                                'No'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {reviewingItem.description && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">
                                        Description
                                    </Label>
                                    <p className="mt-1 text-sm bg-muted/50 rounded-lg p-3">
                                        {reviewingItem.description}
                                    </p>
                                </div>
                            )}

                            {(reviewingItem.submitterName ||
                                reviewingItem.submitterEmail ||
                                reviewingItem.submitterPhone) && (
                                <div className="rounded-lg border p-4">
                                    <Label className="text-sm text-muted-foreground">
                                        Submitted By
                                    </Label>
                                    <div className="mt-2 space-y-1">
                                        {reviewingItem.submitterName && (
                                            <p className="text-sm">
                                                {reviewingItem.submitterName}
                                            </p>
                                        )}
                                        {reviewingItem.submitterEmail && (
                                            <p className="text-sm text-muted-foreground">
                                                {reviewingItem.submitterEmail}
                                            </p>
                                        )}
                                        {reviewingItem.submitterPhone && (
                                            <p className="text-sm text-muted-foreground">
                                                {reviewingItem.submitterPhone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {reviewingItem.status !== 'PENDING' && (
                                <div className="rounded-lg border p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Decision
                                        </span>
                                        <Badge
                                            variant={
                                                STATUS_VARIANTS[
                                                    reviewingItem.status
                                                ]
                                            }
                                        >
                                            {reviewingItem.status}
                                        </Badge>
                                    </div>
                                    {reviewingItem.approvedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Reviewed
                                            </span>
                                            <span className="text-sm">
                                                {formatDate(
                                                    reviewingItem.approvedAt,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {reviewingItem.reviewNotes && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">
                                                Notes
                                            </span>
                                            <p className="mt-1 text-sm">
                                                {reviewingItem.reviewNotes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {reviewingItem.status === 'PENDING' && (
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
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {reviewingItem?.status === 'PENDING' ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleReject}
                                    disabled={rejectMutation.isPending}
                                    className="gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="gap-2"
                                >
                                    {approveMutation.isPending ? (
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
                                onClick={() => setReviewingItem(null)}
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
