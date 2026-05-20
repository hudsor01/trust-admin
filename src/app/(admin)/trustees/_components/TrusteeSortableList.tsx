'use client'

import { GripVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Sortable,
    SortableContent,
    SortableItem,
    SortableItemHandle,
} from '@/components/ui/sortable'
import { trpc } from '@/lib/trpc'

export interface TrusteeSortableItem {
    id: number
    name: string
    status: string | null
    order: number
}

export interface TrusteeSortableListProps {
    trustees: TrusteeSortableItem[]
    entityId: number
}

/**
 * Drag-to-reorder list for trustees. Order persists to the existing
 * `trustee.order` column via `trpc.trustee.reorder`.
 *
 * Optimistic UI: the local list reorders immediately on drop; if the mutation
 * fails the list reverts to the server-provided order on the next render
 * (the parent re-invalidates `trustee.list`).
 */
export function TrusteeSortableList({
    trustees,
    entityId,
}: TrusteeSortableListProps) {
    const utils = trpc.useUtils()
    const [items, setItems] = useState<TrusteeSortableItem[]>(trustees)

    // Keep local order in sync when the upstream list changes (e.g. after an
    // add/delete or a failed reorder revert).
    useEffect(() => {
        setItems(trustees)
    }, [trustees])

    const reorderMutation = trpc.trustee.reorder.useMutation({
        onSuccess: () => {
            utils.trustee.list.invalidate()
            toast.success('Reordered.')
        },
        onError: () => {
            // Revert optimistic order from the server's source of truth.
            setItems(trustees)
            toast.error("Couldn't save order — refresh and try again.")
        },
    })

    if (items.length === 0) {
        return (
            <p className="text-center py-8 text-muted-foreground">
                No trustees to reorder
            </p>
        )
    }

    return (
        <Sortable
            value={items}
            getItemValue={(t) => t.id}
            onValueChange={(next) => {
                setItems(next)
                reorderMutation.mutate({
                    entityId,
                    orderedIds: next.map((t) => t.id),
                })
            }}
        >
            <SortableContent className="space-y-2">
                {items.map((trustee) => (
                    <SortableItem key={trustee.id} value={trustee.id}>
                        <Card>
                            <CardContent
                                className="flex items-center gap-3 p-3"
                                data-trustee-id={trustee.id}
                            >
                                <SortableItemHandle
                                    aria-label={`Drag ${trustee.name}`}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </SortableItemHandle>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold">
                                        {trustee.name}
                                    </div>
                                </div>
                                {trustee.status && (
                                    <Badge variant="secondary">
                                        {trustee.status}
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    </SortableItem>
                ))}
            </SortableContent>
        </Sortable>
    )
}
