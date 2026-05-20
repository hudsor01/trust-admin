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

export interface BeneficiarySortableItem {
    id: number
    firstName: string
    lastName: string
    relationship: string
    sortIndex: number
}

export interface BeneficiarySortableListProps {
    beneficiaries: BeneficiarySortableItem[]
    entityId: number
}

/**
 * Drag-to-reorder list for beneficiaries. Order persists to the new
 * `beneficiary.sortIndex` column via `trpc.beneficiary.reorder`.
 *
 * Optimistic UI: the local list reorders immediately on drop; if the mutation
 * fails the list reverts to the server-provided order on the next render
 * (the parent re-invalidates `beneficiary.list`).
 */
export function BeneficiarySortableList({
    beneficiaries,
    entityId,
}: BeneficiarySortableListProps) {
    const utils = trpc.useUtils()
    const [items, setItems] = useState<BeneficiarySortableItem[]>(beneficiaries)

    useEffect(() => {
        setItems(beneficiaries)
    }, [beneficiaries])

    const reorderMutation = trpc.beneficiary.reorder.useMutation({
        onSuccess: () => {
            utils.beneficiary.list.invalidate()
            toast.success('Reordered.')
        },
        onError: () => {
            setItems(beneficiaries)
            toast.error("Couldn't save order — refresh and try again.")
        },
    })

    if (items.length === 0) {
        return (
            <p className="text-center py-8 text-muted-foreground">
                No beneficiaries to reorder
            </p>
        )
    }

    return (
        <Sortable
            value={items}
            getItemValue={(b) => b.id}
            onValueChange={(next) => {
                setItems(next)
                reorderMutation.mutate({
                    entityId,
                    orderedIds: next.map((b) => b.id),
                })
            }}
        >
            <SortableContent className="space-y-2">
                {items.map((b) => (
                    <SortableItem key={b.id} value={b.id}>
                        <Card>
                            <CardContent
                                className="flex items-center gap-3 p-3"
                                data-beneficiary-id={b.id}
                            >
                                <SortableItemHandle
                                    aria-label={`Drag ${b.firstName} ${b.lastName}`}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </SortableItemHandle>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold">
                                        {b.firstName} {b.lastName}
                                    </div>
                                </div>
                                <Badge variant="secondary">
                                    {b.relationship}
                                </Badge>
                            </CardContent>
                        </Card>
                    </SortableItem>
                ))}
            </SortableContent>
        </Sortable>
    )
}
