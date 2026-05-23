'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Firearm } from '@/db/schema'
import {
    ATF_FORM_TYPE_LABELS,
    CONDITION_LABELS,
    NFA_CLASS_LABELS,
    NFA_TRANSFER_STATUS_LABELS,
    STATUS_VARIANTS,
} from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/utils/formatters'
import { NfaStatusDialog } from './NfaStatusDialog'

type NfaStatus = 'NOT_FILED' | 'FILED' | 'APPROVED'

export function FirearmRowDetail({ firearm }: { firearm: Firearm }) {
    const [nfaDialogOpen, setNfaDialogOpen] = useState(false)
    const { data: detail } = trpc.firearm.byId.useQuery({
        id: firearm.id,
        entityId: firearm.entityId,
    })

    const nfaStatus: NfaStatus =
        (firearm.nfaTransferStatus as NfaStatus | null) ?? 'NOT_FILED'

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-md border border-border">
                {/* Section 1 — Physical Details */}
                <section className="space-y-3">
                    <h4 className="text-sm font-medium">Physical Details</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <dt className="text-muted-foreground">Barrel Length</dt>
                        <dd>{firearm.barrelLength ?? '—'}</dd>

                        <dt className="text-muted-foreground">Action Type</dt>
                        <dd>{firearm.action ?? '—'}</dd>

                        <dt className="text-muted-foreground">Caliber</dt>
                        <dd>{firearm.caliber ?? '—'}</dd>

                        <dt className="text-muted-foreground">Condition</dt>
                        <dd>
                            {CONDITION_LABELS[firearm.condition] ??
                                firearm.condition}
                        </dd>

                        <dt className="text-muted-foreground">
                            Storage Location
                        </dt>
                        <dd>{firearm.location ?? '—'}</dd>

                        <dt className="text-muted-foreground">Insured</dt>
                        <dd>{firearm.insured ? 'Yes' : 'No'}</dd>

                        <dt className="text-muted-foreground">
                            Acquisition Date
                        </dt>
                        <dd>{firearm.acquisitionDate ?? '—'}</dd>

                        <dt className="text-muted-foreground">
                            Acquisition Cost
                        </dt>
                        <dd>{formatCurrency(firearm.acquisitionCost)}</dd>

                        <dt className="text-muted-foreground col-span-2 mt-2">
                            Notes
                        </dt>
                        <dd className="col-span-2 whitespace-pre-wrap">
                            {firearm.notes ?? '—'}
                        </dd>
                    </dl>
                </section>

                {/* Section 2 — NFA Classification (conditional) */}
                {firearm.isNfa && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">
                                NFA Classification
                            </h4>
                            <Badge className="text-milestone-foreground bg-milestone/15 border-milestone/30 text-[10px] px-1 py-0 font-medium">
                                NFA
                            </Badge>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">NFA Class</dt>
                            <dd>
                                {firearm.nfaClass
                                    ? (NFA_CLASS_LABELS[firearm.nfaClass] ??
                                      firearm.nfaClass)
                                    : '—'}
                            </dd>

                            <dt className="text-muted-foreground">
                                ATF Form Type
                            </dt>
                            <dd>
                                {firearm.atfFormType
                                    ? (ATF_FORM_TYPE_LABELS[
                                          firearm.atfFormType
                                      ] ?? firearm.atfFormType)
                                    : '—'}
                            </dd>

                            <dt className="text-muted-foreground">
                                ATF Control Number
                            </dt>
                            <dd>{firearm.atfControlNumber ?? '—'}</dd>

                            <dt className="text-muted-foreground">
                                Tax Stamp Date
                            </dt>
                            <dd>{firearm.taxStampDate ?? '—'}</dd>

                            <dt className="text-muted-foreground">
                                NFRTR Serial
                            </dt>
                            <dd>{firearm.nfrtrSerial ?? '—'}</dd>

                            <dt className="text-muted-foreground">
                                NFRTR Registered
                            </dt>
                            <dd>
                                {firearm.nfaRegistered === null
                                    ? '—'
                                    : firearm.nfaRegistered
                                      ? 'Yes'
                                      : 'No'}
                            </dd>
                        </dl>

                        <div className="flex items-center gap-3 pt-2">
                            <Badge
                                variant={
                                    STATUS_VARIANTS[nfaStatus] ?? 'secondary'
                                }
                            >
                                {NFA_TRANSFER_STATUS_LABELS[nfaStatus] ??
                                    nfaStatus}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNfaDialogOpen(true)}
                            >
                                Update Form 5 Status
                            </Button>
                        </div>

                        {firearm.nfaRegistered === false && (
                            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
                                This NFA item is not registered in the NFRTR.
                                Unregistered NFA items are contraband. Do not
                                attempt to transfer. Consult an attorney
                                immediately.
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3">
                            This section is for recordkeeping only. Consult a
                            licensed firearms attorney or FFL dealer for ATF
                            transfer requirements.
                        </p>
                    </section>
                )}

                {/* Section 3 — Related Records */}
                <section className="md:col-span-2 space-y-4 pt-4 border-t border-border">
                    <div>
                        <h4 className="text-sm font-medium mb-2">
                            Valuation History
                        </h4>
                        {detail?.valuations && detail.valuations.length > 0 ? (
                            <ul className="text-sm space-y-1">
                                {detail.valuations.map((v) => (
                                    <li
                                        key={v.id}
                                        className="flex justify-between gap-4"
                                    >
                                        <span className="text-muted-foreground">
                                            {v.valuationDate} ·{' '}
                                            {v.valuationType}
                                        </span>
                                        <span className="tabular-nums">
                                            {formatCurrency(v.value)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No valuation history.
                            </p>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-medium mb-2">Documents</h4>
                        {detail?.documents && detail.documents.length > 0 ? (
                            <ul className="text-sm space-y-1">
                                {detail.documents.map((d) => (
                                    <li
                                        key={d.id}
                                        className="flex justify-between gap-4"
                                    >
                                        <span>{d.name}</span>
                                        <span className="text-muted-foreground">
                                            {d.documentType}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No documents attached.
                            </p>
                        )}
                    </div>
                </section>
            </div>

            <NfaStatusDialog
                firearm={{
                    id: firearm.id,
                    entityId: firearm.entityId,
                    nfaTransferStatus: nfaStatus,
                }}
                open={nfaDialogOpen}
                onOpenChange={setNfaDialogOpen}
            />
        </>
    )
}
