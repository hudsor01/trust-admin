/**
 * HemsQueueBoard — Kibo UI kanban consumer.
 *
 * 3 columns: Pending → Approved → Distributed. Drag-to-transition wired to:
 *   - PENDING → APPROVED: ConfirmDialog → trpc.hemsRequest.approve.mutate
 *   - APPROVED → DISTRIBUTED: trpc.hemsRequest.markDistributed.mutate (no confirm)
 *   - All other transitions (reverse, jump-skip): no-op
 *
 * UI-SPEC §3 + Implementation Note 15 (HEMS category is plain <span>, NOT Badge).
 * Threat T-23-01 mitigation: mutations are admin-gated tRPC procedures with
 * entityId-scoped WHERE clauses + state-machine guards.
 */
'use client'

import type { inferRouterOutputs } from '@trpc/server'
import { parseISO } from 'date-fns'
import { Banknote, CheckCircle2, Inbox } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from '@/components/kibo-ui/kanban'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import type { AppRouter } from '@/server/trpc/router'
import { formatDate } from '@/utils/formatters'

type RouterOutputs = inferRouterOutputs<AppRouter>
type HemsRequestRow =
    RouterOutputs['hemsRequest']['listWithBeneficiary'][number]

const COLUMNS = [
    {
        id: 'PENDING' as const,
        name: 'Pending',
        icon: Inbox,
        emptyTitle: 'No pending requests',
        emptyBody: 'Beneficiaries will submit requests from the portal.',
    },
    {
        id: 'APPROVED' as const,
        name: 'Approved',
        icon: CheckCircle2,
        emptyTitle: 'Nothing approved yet',
        emptyBody: 'Approved requests appear here until distribution is paid.',
    },
    {
        id: 'DISTRIBUTED' as const,
        name: 'Distributed',
        icon: Banknote,
        emptyTitle: 'No distributions yet',
        emptyBody: 'Mark approved requests as distributed to record payouts.',
    },
]

type ColumnId = (typeof COLUMNS)[number]['id']

function daysSince(iso: string | null | undefined): number {
    if (!iso) return 0
    // parseISO avoids engine-dependent string parsing — consistent with
    // LiabilityGantt / ActivityTimeline.
    const ms = Date.now() - parseISO(iso).getTime()
    return Math.max(0, Math.floor(ms / 86400000))
}

function fullName(r: HemsRequestRow): string {
    const ben = r.beneficiary
    if (!ben) return `Request #${r.id}`
    return (
        `${ben.firstName ?? ''} ${ben.lastName ?? ''}`.trim() ||
        `Request #${r.id}`
    )
}

export function HemsQueueBoard({ entityId }: { entityId: number }) {
    const utils = trpc.useUtils()
    const { data: requests = [], isLoading } =
        trpc.hemsRequest.listWithBeneficiary.useQuery(
            { entityId },
            { enabled: !!entityId },
        )

    type PendingDrop = { id: number; req: HemsRequestRow }

    // `pendingDrop` drives the dialog *title* (a render concern).
    // `pendingDropRef` carries the payload the confirm callback acts on, so
    // `onConfirm` never closes over render-state that may be stale on the
    // tick the drag fires (WR-03).
    const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
    const pendingDropRef = useRef<PendingDrop | null>(null)

    const approveMutation = trpc.hemsRequest.approve.useMutation({
        onSuccess: (_data, vars) => {
            utils.hemsRequest.listWithBeneficiary.invalidate()
            const req = requests.find((r) => r.id === vars.id)
            const benName = req ? fullName(req) : 'request'
            toast.success(
                `Approved ${benName}'s ${formatMoney(vars.approvedAmount ?? '0')} HEMS request.`,
            )
        },
        onError: () =>
            toast.error(
                "Couldn't approve this request — try again or refresh.",
            ),
    })

    const markDistributedMutation =
        trpc.hemsRequest.markDistributed.useMutation({
            onSuccess: () => {
                utils.hemsRequest.listWithBeneficiary.invalidate()
                toast.success('Marked as distributed.')
            },
            onError: () =>
                toast.error(
                    "Couldn't mark as distributed — verify the distribution record exists.",
                ),
        })

    const { dialogProps, confirm } = useConfirmDialog({
        title: pendingDrop
            ? `Approve ${fullName(pendingDrop.req)}'s ${formatMoney(pendingDrop.req.amountRequested)} request?`
            : '',
        description: 'This creates a distribution record.',
        confirmText: 'Approve',
        variant: 'default',
        onConfirm: async () => {
            // Read the payload from the ref — it is set synchronously by
            // onDragEnd before confirm(), so it is never stale here.
            const drop = pendingDropRef.current
            if (!drop) return
            await approveMutation.mutateAsync({
                id: drop.id,
                entityId,
                approvedAmount: drop.req.amountRequested,
            })
            pendingDropRef.current = null
            setPendingDrop(null)
        },
        onCancel: () => {
            pendingDropRef.current = null
            setPendingDrop(null)
        },
    })

    const data = useMemo(
        () =>
            requests
                .filter((r) =>
                    (
                        ['PENDING', 'APPROVED', 'DISTRIBUTED'] as string[]
                    ).includes(r.status),
                )
                .map((r) => ({
                    id: String(r.id),
                    name: fullName(r),
                    column: r.status as ColumnId,
                    _raw: r,
                })),
        [requests],
    )

    if (isLoading) {
        return (
            <div
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                data-testid="hems-queue-board-loading"
            >
                {COLUMNS.map((c) => (
                    <div
                        key={c.id}
                        className="bg-secondary/40 rounded-md p-3 space-y-2"
                    >
                        <Skeleton className="h-6 w-24" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={`${c.id}-skeleton-${i}`}
                                className="h-24 rounded-md"
                            />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
            <KanbanProvider
                columns={COLUMNS}
                data={data}
                onDragEnd={(event) => {
                    if (!event.over) return
                    const id = Number(event.active.id)
                    const item = data.find((d) => Number(d.id) === id)
                    if (!item) return

                    // Resolve drop target column id. Kibo's `over.id` is either
                    // a column id (drop on empty column) or an item id (drop on a card).
                    const overIdStr = String(event.over.id)
                    const newCol = (
                        COLUMNS.find((c) => c.id === overIdStr)
                            ? overIdStr
                            : (data.find((d) => d.id === overIdStr)?.column ??
                              item.column)
                    ) as ColumnId

                    if (item.column === newCol) return

                    if (item.column === 'PENDING' && newCol === 'APPROVED') {
                        const drop = { id, req: item._raw }
                        // Ref is the source of truth for onConfirm; state is
                        // only for the dialog title.
                        pendingDropRef.current = drop
                        setPendingDrop(drop)
                        confirm()
                    } else if (
                        item.column === 'APPROVED' &&
                        newCol === 'DISTRIBUTED'
                    ) {
                        markDistributedMutation.mutate({ id, entityId })
                    }
                    // All other transitions: no-op
                }}
            >
                {(column) => (
                    <KanbanBoard
                        key={column.id}
                        id={column.id}
                        className="rounded-md p-0"
                    >
                        <KanbanHeader>
                            <div
                                className="flex items-center justify-between p-3 border-b border-border"
                                data-column={column.id}
                            >
                                <span className="text-sm font-semibold uppercase tracking-wide">
                                    {column.name}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="ml-2 tabular-nums"
                                >
                                    {
                                        data.filter(
                                            (d) => d.column === column.id,
                                        ).length
                                    }
                                </Badge>
                            </div>
                        </KanbanHeader>
                        <KanbanCards id={column.id}>
                            {(item) => (
                                <KanbanCard
                                    key={item.id}
                                    id={item.id}
                                    name={item.name}
                                    column={item.column}
                                    className="cursor-grab"
                                >
                                    <HemsCard
                                        req={
                                            (
                                                item as typeof item & {
                                                    _raw: HemsRequestRow
                                                }
                                            )._raw
                                        }
                                    />
                                </KanbanCard>
                            )}
                        </KanbanCards>
                    </KanbanBoard>
                )}
            </KanbanProvider>
            <ConfirmDialog {...dialogProps} />
        </>
    )
}

function HemsCard({ req }: { req: HemsRequestRow }) {
    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{fullName(req)}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {req.category}
                </span>
            </div>
            <div className="font-mono tabular-nums text-sm font-semibold">
                {formatMoney(req.amountRequested)}
            </div>
            <div className="text-xs text-muted-foreground">
                Requested {formatDate(req.createdAt)} ·{' '}
                {daysSince(req.createdAt)}d ago
            </div>
        </div>
    )
}
