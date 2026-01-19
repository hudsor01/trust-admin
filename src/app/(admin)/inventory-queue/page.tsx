'use client'

import { CheckCircle, Clock, Loader2, Package, XCircle } from 'lucide-react'
import Image from 'next/image'
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

    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()

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

    const loading = entitiesLoading || itemsLoading
    const [activeTab, setActiveTab] = useState('pending')
    const [reviewingItem, setReviewingItem] =
        useState<PendingInventoryItem | null>(null)
    const [reviewNotes, setReviewNotes] = useState('')
    const [selectedEntityId, setSelectedEntityId] = useState<string>('')

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
            key: 'createdAt',
            header: 'Submitted',
            render: (item) => (
                <span className="text-sm">{formatDate(item.createdAt)}</span>
            ),
        },
        {
            key: 'name',
            header: 'Item',
            render: (item) => (
                <div>
                    <p className="font-medium">{item.name}</p>
                    {item.submitterName && (
                        <p className="text-xs text-muted-foreground">
                            by {item.submitterName}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            render: (item) => (
                <Badge variant="outline">
                    {CATEGORY_LABELS[item.category] || item.category}
                </Badge>
            ),
        },
        {
            key: 'estimatedValue',
            header: 'Est. Value',
            render: (item) => (
                <span className="font-medium">
                    {item.estimatedValue
                        ? formatCurrency(item.estimatedValue)
                        : '-'}
                </span>
            ),
        },
        {
            key: 'condition',
            header: 'Condition',
            render: (item) => (
                <span className="text-sm">
                    {CONDITION_LABELS[item.condition] || item.condition}
                </span>
            ),
        },
        {
            key: 'photos',
            header: 'Photos',
            render: (item) => {
                const photoCount = [
                    item.photoPath1,
                    item.photoPath2,
                    item.photoPath3,
                    item.photoPath4,
                    item.photoPath5,
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
            key: 'status',
            header: 'Status',
            render: (item) => (
                <Badge variant={STATUS_VARIANTS[item.status] || 'secondary'}>
                    {item.status}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item) =>
                item.status === 'PENDING' ? (
                    <Button size="sm" onClick={() => openReview(item)}>
                        Review
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReview(item)}
                    >
                        View
                    </Button>
                ),
        },
    ]

    const openReview = (item: PendingInventoryItem) => {
        setReviewingItem(item)
        setReviewNotes('')
        setSelectedEntityId(entities[0]?.id?.toString() || '')
    }

    const handleApprove = async () => {
        if (!reviewingItem || !selectedEntityId) return
        await approveMutation.mutateAsync({
            id: reviewingItem.id,
            entityId: Number(selectedEntityId),
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

    const getPhotoPaths = (item: PendingInventoryItem) => {
        return [
            item.photoPath1,
            item.photoPath2,
            item.photoPath3,
            item.photoPath4,
            item.photoPath5,
        ].filter(Boolean) as string[]
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
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    Inventory Queue
                </h2>
                <p className="text-sm text-muted-foreground">
                    Review and approve submitted inventory items
                </p>
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

            {/* Tabs */}
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
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : displayedItems.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    {activeTab === 'pending'
                                        ? 'No pending items to review.'
                                        : 'No reviewed items yet.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DataTable data={displayedItems} columns={columns} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
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
                            {/* Photos */}
                            {getPhotoPaths(reviewingItem).length > 0 && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">
                                        Photos
                                    </Label>
                                    <div className="mt-2 grid grid-cols-5 gap-2">
                                        {getPhotoPaths(reviewingItem).map(
                                            (path, i) => (
                                                <div
                                                    key={i}
                                                    className="relative aspect-square"
                                                >
                                                    <Image
                                                        src={path}
                                                        alt={`Submitted inventory ${i + 1}`}
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

                            {/* Item Details */}
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

                            {/* Description */}
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

                            {/* Submitter Info */}
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

                            {/* Review info for already reviewed items */}
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

                            {/* Review Form (only for pending) */}
                            {reviewingItem.status === 'PENDING' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="entityId">
                                            Assign to Entity *
                                        </Label>
                                        <Select
                                            value={selectedEntityId}
                                            onValueChange={setSelectedEntityId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select entity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {entities.map((e) => (
                                                    <SelectItem
                                                        key={e.id}
                                                        value={e.id.toString()}
                                                    >
                                                        {e.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                    disabled={
                                        approveMutation.isPending ||
                                        !selectedEntityId
                                    }
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
